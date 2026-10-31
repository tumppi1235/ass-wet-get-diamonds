import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { claimPrice, reconcileClaimGold, tilePoint, type TileClaims } from '../game/claims';
import type { GameState } from '../game/types';
import {APP_ENV,storageKeys} from '../config/environment';

export interface Storage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> }
export type User = { id: string; username: string; displayName: string; role: 'admin' | 'player'; createdAt: number };
type StoredUser = User & { salt: string; passwordHash: string; passwordVersion: number };
type Database = { version: 1; users: StoredUser[]; progress: Record<string, unknown>; tileClaims?: TileClaims; claimSpending?: Record<string, number> };
type Session = { userId: string; token: string; expiresAt: number; passwordVersion: number };
const provisioned = require('./provisioned-players.json') as Omit<StoredUser, 'createdAt'>[];
export const DATABASE_KEY = storageKeys(APP_ENV).database;
export const SESSION_KEY = storageKeys(APP_ENV).session;
export const DEMO_ACCOUNTS = [
  { id: 'local-admin', username: 'admin', password: 'Admin123!', displayName: 'Administrator', role: 'admin' as const },
  { id: 'local-test', username: 'test', password: 'Test123!', displayName: 'Test Explorer', role: 'player' as const },
];
const cleanUser = ({ id, username, displayName, role, createdAt }: StoredUser): User => ({ id, username, displayName, role, createdAt });
const usernameValue = (value: string) => value.trim().toLowerCase();
const passwordValid = (value: string) => { if (value.length < 8 || value.length > 128) throw new Error('Use a password between 8 and 128 characters.'); };
const derive = async (password: string, salt: string) => bytesToHex(await pbkdf2Async(sha256, password, hexToBytes(salt), { c: 600_000, dkLen: 32, asyncTick: 8 }));
const equal = (a: string, b: string) => { let diff = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return diff === 0; };

/** Local profile sign-in only. No server, cloud identity or cross-device trust is implied. */
export class LocalAccounts {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: Storage, private random: (length: number) => Promise<Uint8Array>, private now = () => Date.now()) {}
  private serial<T>(job: () => Promise<T>): Promise<T> { const result = this.queue.then(job, job); this.queue = result.catch(() => {}); return result; }
  private async read(): Promise<Database> {
    const raw = await this.storage.getItem(DATABASE_KEY);
    if (!raw) throw new Error('Profiles have not finished loading.');
    const db = JSON.parse(raw) as Database;
    if (db.version !== 1 || !Array.isArray(db.users) || !db.progress) throw new Error('The local profile database could not be read. Your saved data has been kept.');
    return db;
  }
  private async write(db: Database) { await this.storage.setItem(DATABASE_KEY, JSON.stringify(db)); }
  private async credential(password: string) { passwordValid(password); const salt = bytesToHex(await this.random(16)); return { salt, passwordHash: await derive(password, salt) }; }
  async bootstrap() {
    return this.serial(async () => {
      if (await this.storage.getItem(DATABASE_KEY)) {
        const db = await this.read(), missing = provisioned.filter(p => !db.users.some(u => u.id === p.id || u.username === p.username));
        if (missing.length) { db.users.push(...missing.map(p => ({ ...p, createdAt: this.now() }))); await this.write(db); }
        return;
      }
      const users: StoredUser[] = [];
      for (const account of DEMO_ACCOUNTS) { const { password, ...user } = account; users.push({ ...user, createdAt: this.now(), passwordVersion: 1, ...await this.credential(password) }); }
      users.push(...provisioned.map(p => ({ ...p, createdAt: this.now() })));
      await this.write({ version: 1, users, progress: {} });
    });
  }
  private async verified(db: Database, expectedToken?: string): Promise<{ user: StoredUser; session: Session }> {
    const raw = await this.storage.getItem(SESSION_KEY);
    if (!raw) throw new Error('Please sign in to continue.');
    const session = JSON.parse(raw) as Session;
    const user = db.users.find(u => u.id === session.userId);
    if (!user || session.expiresAt <= this.now() || session.passwordVersion !== user.passwordVersion || (expectedToken && expectedToken !== session.token)) throw new Error('Your session has ended. Please sign in again.');
    return { user, session };
  }
  async current(): Promise<{ user: User; token: string; expiresAt: number } | null> {
    return this.serial(async () => { const db = await this.read(); try { const { user, session } = await this.verified(db); return { user: cleanUser(user), token: session.token, expiresAt: session.expiresAt }; } catch { await this.storage.removeItem(SESSION_KEY); return null; } });
  }
  async login(username: string, password: string) {
    return this.serial(async () => {
      const db = await this.read(), user = db.users.find(u => u.username === usernameValue(username));
      passwordValid(password);
      const verifier = await derive(password, user?.salt || db.users[0].salt);
      if (!user || !equal(verifier, user.passwordHash)) throw new Error('Username or password is incorrect.');
      const session: Session = { userId: user.id, token: bytesToHex(await this.random(32)), expiresAt: this.now() + 8 * 60 * 60 * 1000, passwordVersion: user.passwordVersion };
      await this.storage.setItem(SESSION_KEY, JSON.stringify(session));
      return { user: cleanUser(user), token: session.token, expiresAt: session.expiresAt };
    });
  }
  async logout() { return this.serial(() => this.storage.removeItem(SESSION_KEY)); }
  async createProfile(username: string, displayName: string, password: string) {
    return this.serial(async () => {
      const db = await this.read(), normalized = usernameValue(username), name = displayName.trim();
      if (!/^[a-z0-9][a-z0-9_.-]{2,23}$/.test(normalized)) throw new Error('Use 3–24 letters, numbers, dots, underscores or hyphens for your username.');
      if (!name || name.length > 40) throw new Error('Enter a display name of 1–40 characters.');
      if (db.users.some(u => u.username === normalized)) throw new Error('That username is already in use on this device.');
      const user: StoredUser = { id: bytesToHex(await this.random(16)), username: normalized, displayName: name, role: 'player', createdAt: this.now(), passwordVersion: 1, ...await this.credential(password) };
      db.users.push(user); await this.write(db); return cleanUser(user);
    });
  }
  async progress<T>(token: string, ownerId: string): Promise<T | null> {
    return this.serial(async () => { const db = await this.read(), { user } = await this.verified(db, token); if (user.id !== ownerId) throw new Error('This saved game belongs to a different profile.'); const saved=db.progress[user.id] as GameState | undefined; return (saved && typeof saved.gold==='number' && db.claimSpending?.[user.id] ? reconcileClaimGold(saved,db.claimSpending[user.id]) : saved) as T || null; });
  }
  async saveProgress(token: string, ownerId: string, value: unknown) {
    // Serialize a snapshot before waiting, so later game mutations cannot change this save.
    const snapshot = JSON.parse(JSON.stringify(value));
    return this.serial(async () => { const db = await this.read(), { user } = await this.verified(db, token); if (user.id !== ownerId) throw new Error('This saved game belongs to a different profile.'); db.progress[user.id] = snapshot && typeof snapshot.gold==='number' && db.claimSpending?.[user.id] ? reconcileClaimGold(snapshot,db.claimSpending[user.id]) : snapshot; await this.write(db); });
  }
  async tileClaims(token:string):Promise<TileClaims> {
    return this.serial(async()=>{const db=await this.read();await this.verified(db,token);return db.tileClaims || {};});
  }
  async claimTile(token:string,ownerId:string,value:GameState,id:string,expectedPrice:number) {
    const snapshot=JSON.parse(JSON.stringify(value)) as GameState;
    return this.serial(async()=>{
      const db=await this.read(),{user}=await this.verified(db,token);
      if(user.id!==ownerId)throw new Error('This saved game belongs to a different profile.');
      if(!tilePoint(id))throw new Error('Choose a tile inside Jyväskylä.');
      if(!(snapshot.visits?.[id]>0))throw new Error('Visit this tile before claiming it.');
      const previous=db.tileClaims?.[id],price=claimPrice(previous);
      if(previous?.ownerId===user.id)throw new Error('You already own this tile.');
      if(!Number.isSafeInteger(price)||price!==expectedPrice)throw new Error('This tile price changed. Review its new price and try again.');
      const spent=db.claimSpending?.[user.id] || 0;
      const state=reconcileClaimGold(snapshot,spent);
      if(!Number.isSafeInteger(state.gold)||state.gold<price)throw new Error(`You need ${price} gold to claim this tile.`);
      if(!Number.isSafeInteger(spent+price))throw new Error('The gold total is too large.');
      const claim={ownerId:user.id,ownerName:user.displayName,pricePaid:price,claimedAt:this.now()};
      db.claimSpending={...db.claimSpending,[user.id]:spent+price};
      db.tileClaims={...db.tileClaims,[id]:claim};
      db.progress[user.id]={...state,gold:state.gold-price,claimGoldSpent:spent+price};
      await this.write(db);
      return {claims:db.tileClaims,spentTotal:spent+price,price};
    });
  }
  async communityVisits(token: string): Promise<Record<string, number>> {
    return this.serial(async () => {
      const db = await this.read(), { user } = await this.verified(db, token), result: Record<string, number> = {};
      // Share anonymous visited cells only, never another profile's path or account data.
      for (const other of db.users) {
        if (other.id === user.id) continue;
        const state = db.progress[other.id] as { visits?: Record<string, number> } | undefined;
        for (const [key, count] of Object.entries(state?.visits || {})) if (/^-?\d+,-?\d+$/.test(key) && Number.isFinite(count) && count > 0) result[key] = (result[key] || 0) + 1;
      }
      return result;
    });
  }
  async listUsers(token: string) {
    return this.serial(async () => {
      const db = await this.read(), { user } = await this.verified(db, token);
      if (user.role !== 'admin') throw new Error('Administrator access is required.');
      return db.users.map(u => { const state = db.progress[u.id] as { collection?: unknown[]; meters?: number } | undefined; return { ...cleanUser(u), finds: state?.collection?.length || 0, distance: state?.meters || 0 }; });
    });
  }
  async updateName(token: string, name: string) {
    return this.serial(async () => { const db = await this.read(), { user } = await this.verified(db, token); if (!name.trim() || name.trim().length > 40) throw new Error('Enter a display name of 1–40 characters.'); user.displayName = name.trim(); await this.write(db); return cleanUser(user); });
  }
  async changePassword(token: string, currentPassword: string, nextPassword: string) {
    return this.serial(async () => { const db = await this.read(), { user } = await this.verified(db, token); if (!equal(await derive(currentPassword, user.salt), user.passwordHash)) throw new Error('Current password is incorrect.'); Object.assign(user, await this.credential(nextPassword)); user.passwordVersion++; await this.write(db); await this.storage.removeItem(SESSION_KEY); });
  }
}
