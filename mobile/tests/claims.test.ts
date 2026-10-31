import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,pbkdf2Sync} from 'node:crypto';
import {LocalAccounts,DATABASE_KEY,type Storage} from '../src/accounts/local-accounts';
import G from '../src/game/engine';
import type {GameState} from '../src/game/types';
import {claimPrice,reconcileClaimGold,tilePoint} from '../src/game/claims';
import {claimsData} from '../src/map/vector-data';
class Memory implements Storage {items=new Map<string,string>();async getItem(k:string){return this.items.get(k)??null;}async setItem(k:string,v:string){this.items.set(k,v);}async removeItem(k:string){this.items.delete(k);}}
function fixture(){
  const storage=new Memory();
  const users=['alice','bob'].map(username=>{const salt=randomBytes(16);return {id:username,username,displayName:username,role:'player',createdAt:0,passwordVersion:1,salt:salt.toString('hex'),passwordHash:pbkdf2Sync('ClaimTest123!',salt,600000,32,'sha256').toString('hex')};});
  storage.items.set(DATABASE_KEY,JSON.stringify({version:1,users,progress:{}}));
  return {storage,service:new LocalAccounts(storage,async n=>randomBytes(n),()=>1000)};
}
function game(gold=10){const state=G.initial();G.enter(state);state.gold=gold;return state;}
test('claiming spends gold once, survives stale autosaves, persists and increases price per tile',async()=>{
  const {storage,service}=fixture(),a=await service.login('alice','ClaimTest123!'),before=game();
  const first=await service.claimTile(a.token,a.user.id,before,'0,0',1);
  assert.equal(first.claims['0,0'].ownerId,'alice');assert.equal(first.price,1);assert.equal(claimPrice(first.claims['0,0']),2);
  let saved=(await service.progress<GameState>(a.token,a.user.id))!;
  assert.equal(saved.gold,9);assert.equal(saved.claimGoldSpent,1);
  await assert.rejects(service.claimTile(a.token,a.user.id,saved,'0,0',2),/already own/);
  await service.saveProgress(a.token,a.user.id,before);
  assert.equal((await service.progress<GameState>(a.token,a.user.id))!.gold,9,'an already queued save cannot refund gold');
  await service.saveProgress(a.token,a.user.id,{...before,gold:12});
  saved=(await service.progress<GameState>(a.token,a.user.id))!;assert.equal(saved.gold,11,'concurrent earned gold remains');
  await service.saveProgress(a.token,a.user.id,saved);assert.equal((await service.progress<GameState>(a.token,a.user.id))!.gold,11,'no double deduction');
  const b=await service.login('bob','ClaimTest123!');
  await assert.rejects(service.claimTile(a.token,a.user.id,before,'0,0',2),/session/);
  await assert.rejects(service.claimTile(b.token,b.user.id,game(),'0,0',1),/price changed/);
  const second=await service.claimTile(b.token,b.user.id,game(),'0,0',2);
  assert.equal(second.claims['0,0'].ownerId,'bob');assert.equal(second.price,2);
  assert.equal((await service.progress<GameState>(b.token,b.user.id))!.gold,8);
  const other=game();other.visits['1,0']=1;
  await service.claimTile(b.token,b.user.id,other,'1,0',1);
  const again=await service.login('alice','ClaimTest123!');
  const third=await service.claimTile(again.token,again.user.id,saved,'0,0',3);
  assert.equal(third.price,3);assert.equal(claimPrice(third.claims['0,0']),4);
  const reload=new LocalAccounts(storage,async n=>randomBytes(n),()=>1000);
  assert.equal((await reload.tileClaims(again.token))['0,0'].ownerId,'alice');
  assert.equal((await reload.progress<GameState>(again.token,again.user.id))!.gold,8);
  const overlay=claimsData(third.claims,'alice');assert.equal(overlay.features.length,2);
  assert.equal(overlay.features[0].properties!.mine,true);assert.equal(overlay.features[1].properties!.mine,false);
});
test('unvisited, outside, invalid, insufficient and duplicate claims do not spend gold',async()=>{
  const {storage,service}=fixture(),a=await service.login('alice','ClaimTest123!');
  for(const [state,id,price,error] of [[game(0),'0,0',1,/need 1 gold/],[game(),'1,0',1,/Visit/],[game(),'999,999',1,/inside/],[game(),'oops',1,/inside/],[game(),'0,0',0,/price changed/]] as const){
    const before=storage.items.get(DATABASE_KEY);
    await assert.rejects(service.claimTile(a.token,a.user.id,state,id,price),error);
    assert.equal(storage.items.get(DATABASE_KEY),before);
  }
  const results=await Promise.allSettled([service.claimTile(a.token,a.user.id,game(),'0,0',1),service.claimTile(a.token,a.user.id,game(),'0,0',1)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal((await service.progress<GameState>(a.token,a.user.id))!.gold,9);
  assert.equal(tilePoint('bad'),null);assert.equal(tilePoint('999,999'),null);assert.equal(tilePoint('00,0'),null);assert.equal(tilePoint('-0,0'),null);assert.ok(tilePoint('0,0'));
  assert.deepEqual(reconcileClaimGold({gold:12},2),{gold:10,claimGoldSpent:2});
});
