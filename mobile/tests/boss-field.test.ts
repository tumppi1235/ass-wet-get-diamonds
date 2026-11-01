import test from 'node:test';
import assert from 'node:assert/strict';
import {bossArrival,bossPresence,contributionForecast} from '../src/game/boss-field';
import {BOSS_RULES,type Boss} from '../src/game/bosses';
import type {Encounter} from '../src/game/encounters';
import type {ActivityPreview} from '../src/accounts/shared-world';
import {bossData} from '../src/map/vector-data';
import G from '../src/game/engine';

const geo=G.geo(125,125);
const boss:Boss={version:1,id:'boss:guardian',designId:'metsanvartija',name:'Metsänvartija',tier:'Lesser',tileId:'0,0',latitude:geo.lat,longitude:geo.lon,source:'sourced path',startsAt:1000,endsAt:100000,signature:'Warden Rune',artifactType:'Rune',weakness:'foot',weaknessBonus:0,rules:BOSS_RULES};
const encounter:Encounter={version:1,id:'encounter:1',boss,creator:'a',roster:[{id:'a',name:'A'},{id:'b',name:'B'}],state:'active',createdAt:1000,startedAt:2000,deadline:90000,resolvedAt:null,totalHp:44,remainingHp:44,contributions:{},lootRules:null};
const proof:ActivityPreview={id:'activity:1',movement:'foot',meters:22000,bossTileVisited:true,observedSeconds:6000,eligibleStartedAt:2000,endedAt:80000};

test('TR-144 arrival requires fresh accepted own-tile GPS, not saved tile or a distance radius',()=>{
  const fix={x:249,y:125,timestamp:5000},before=JSON.stringify(boss);
  assert.equal(bossPresence(boss,fix,true,5000).here,true);
  assert.equal(bossPresence(boss,{...fix,x:251},true,5000).here,false,'two metres across the tile edge is outside');
  assert.equal(bossPresence(boss,fix,true,19999).here,true);
  for(const [position,valid,now] of [[fix,true,20000],[fix,false,5000],[fix,true,4999],[null,true,5000],[{...fix,x:NaN},true,5000]] as const)assert.equal(bossPresence(boss,position,valid,now).here,false);
  assert.equal(bossPresence(boss,fix,true,boss.endsAt).here,false);
  assert.equal(bossPresence(boss,{...fix,timestamp:0},true,999).here,false);
  assert.equal(JSON.stringify(boss),before,'arrival cannot activate or edit a boss');
});

test('TR-144 deterministic arrival and map markers expose placed bosses without player/party evidence',()=>{
  const bosses=[{...boss,id:'boss:z'},boss],before=JSON.stringify(bosses);
  assert.equal(bossArrival(bosses,{x:125,y:125,timestamp:5000},true,5000)?.id,boss.id);
  assert.equal(bossArrival(bosses,{x:125,y:125,timestamp:5000},false,5000),undefined);
  const data=bossData(bosses,boss.id);assert.equal(data.features.length,2);
  assert.deepEqual(data.features[1].geometry,{type:'Point',coordinates:[boss.longitude,boss.latitude]});
  assert.deepEqual(Object.keys(data.features[1].properties!).sort(),['bossId','name','selected','tier']);
  assert.equal(data.features[1].properties!.selected,true);assert.equal(JSON.stringify(bosses),before);
});

test('TR-044/134/144 contribution forecasts use locked policy, distinguish personal loot and never settle or reward',()=>{
  const before=JSON.stringify({encounter,proof});let result=contributionForecast(encounter,'a',proof);
  assert.equal(result.canSubmit,true);assert.equal(result.wouldWin,true);assert.equal(result.qualified,true);assert.equal(result.remainingHp,0);
  result=contributionForecast(encounter,'a',{...proof,meters:1000});assert.equal(result.qualified,false);assert.equal(result.shortfallKm,1.75);assert.equal(result.remainingHp,42);
  const qualified={owner:'b',activityId:'previous',meters:5000,movement:'foot' as const,bossTileVisited:true,activityStartedAt:2000,activityEndedAt:70000,equivalentKm:5,hp:10,qualified:true,submittedAt:71000,source:'browser-gps' as const,observedSeconds:1000};
  result=contributionForecast({...encounter,remainingHp:1,contributions:{b:qualified}},'a',{...proof,meters:1000});assert.equal(result.wouldWin,true);assert.equal(result.qualified,false,'teammate victory cannot grant current player personal loot');
  assert.equal(contributionForecast({...encounter,remainingHp:1},'a',{...proof,meters:1000}).wouldWin,false,'zero HP without any qualifying player is not victory');
  assert.equal(contributionForecast({...encounter,boss:{...boss,weaknessBonus:100}},'a',{...proof,meters:1000}).damage.equivalentKm,1,'capped weakness bonus does not reduce personal effort minimum');
  assert.equal(contributionForecast(encounter,'a',{...proof,movement:'bicycle',meters:55000}).damage.equivalentKm,22);
  assert.equal(JSON.stringify({encounter,proof}),before);
});

test('TR-131/132/144 forecasts reject absent visit, wrong roster, repeat contribution, terminal or out-of-window evidence',()=>{
  assert.equal(contributionForecast(encounter,'a',{...proof,bossTileVisited:false}).canSubmit,false);
  assert.equal(contributionForecast(encounter,'stranger',proof).canSubmit,false);
  assert.equal(contributionForecast({...encounter,state:'won'},'a',proof).canSubmit,false);
  assert.equal(contributionForecast(encounter,'a',{...proof,eligibleStartedAt:1999}).canSubmit,false);
  assert.equal(contributionForecast(encounter,'a',{...proof,endedAt:90001}).canSubmit,false);
  assert.equal(contributionForecast({...encounter,contributions:{a:{} as never}},'a',proof).canSubmit,false);
});
