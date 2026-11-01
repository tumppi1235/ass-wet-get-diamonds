import places from '../../assets/landmarks.json';
import nationalPlaces from '../../assets/finland-relics.json';
import haukivuoriPlaces from '../../assets/haukivuori-relics.json';
import {RELEASE_FEATURES} from '../config/features';
import {groundDistance} from '../map/geodesy';
import type { Engine, GameState, Relic } from './types';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Shared prototype engine is a CommonJS module.
const rules: Engine = require('../../../public/engine.js');
export const LANDMARKS = (RELEASE_FEATURES.nationalExploration?[...places,...nationalPlaces,...haukivuoriPlaces]:places) as Relic[];
const localCatalogIds=new Set(places.map(p=>p.landmarkId));
export function catalogLabel(place:Relic){const label=place.landmark||place.name;return place.landmarkId&&localCatalogIds.has(place.landmarkId)?'Jyväskylä · '+label:label;}
export function searchCatalog(query:string){const text=query.trim().toLocaleLowerCase();return text.length<2?[]:LANDMARKS.filter(p=>catalogLabel(p).toLocaleLowerCase().includes(text)).slice(0,6);}
export const relicPoint = (r: Relic) => r.latitude != null && r.longitude != null ? rules.xy(r.latitude, r.longitude) : { x: (r.i + .5) * 250, y: (r.j + .5) * 250 };
export function relicDistance(r:Relic,p:{x:number;y:number}){const target=relicPoint(r);if(!RELEASE_FEATURES.nationalExploration)return Math.hypot(target.x-p.x,target.y-p.y);const a=rules.geo(p.x,p.y),b=rules.geo(target.x,target.y);return groundDistance({latitude:a.lat,longitude:a.lon},{latitude:b.lat,longitude:b.lon});}
export function seedLandmarks(s: GameState) { if(s.sharedSpawnsOnly)return s; for (const r of LANDMARKS) if (!s.collection.some(a => a.id === r.id)) s.revealed[r.id] = { ...r }; return s; }
export function availableRelics(s: GameState, p: { x: number; y: number }) {
  const unavailable=new Set([...Object.keys(s.searched).filter(id=>s.searched[id]),...s.collection.map(r=>r.id)]);
  return Object.values(s.revealed).filter((r): r is Relic => !!r && !unavailable.has(r.id)).map(r=>({r,d:relicDistance(r,p)})).sort((a,b)=>a.d-b.d).map(({r})=>r);
}
export function captureTarget(s: GameState, p: { x: number; y: number }) {
  const c=rules.cell(p.x,p.y);
  return availableRelics(s, p).find(r => r.i===c.i&&r.j===c.j);
}
export function captureAt(s: GameState, p: { x: number; y: number }, eligible: boolean, rng = Math.random) {
  const target = eligible && captureTarget(s, p); if (!target) return { status: 'unavailable' };
  const previous = s.lastCell; s.lastCell = target.id;
  try { return rules.search(s, rng); } finally { s.lastCell = previous; }
}
export function beginQuest(s: GameState) { if (s.questStartedAt) s.outing++; s.questStartedAt = Date.now(); s.meters = 0; s.energy = 0; s.elapsed = 0; s.searched = {}; }
