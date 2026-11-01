import G from './engine';
import {bossDamage,bossRequirements,type Boss} from './bosses';
import type {Encounter} from './encounters';
import type {ActivityPreview} from '../accounts/shared-world';
import {groundDistance} from '../map/geodesy';

export type BossFix={x:number;y:number;timestamp:number};
/** Presentation only: the server still checks presence, closures, consent and revision. */
export function bossPresence(boss:Boss,fix:BossFix|null|undefined,gpsValid:boolean,now:number){
  const available=now>=boss.startsAt&&now<boss.endsAt;
  const fresh=!!fix&&gpsValid&&[fix.x,fix.y,fix.timestamp,now].every(Number.isFinite)&&now>=fix.timestamp&&now-fix.timestamp<15000;
  const here=!!fresh&&G.key(G.cell(fix!.x,fix!.y).i,G.cell(fix!.x,fix!.y).j)===boss.tileId;
  const geo=fix&&Number.isFinite(fix.x)&&Number.isFinite(fix.y)?G.geo(fix.x,fix.y):null;
  return{available,fresh,here:here&&available,distanceMeters:geo?groundDistance({latitude:geo.lat,longitude:geo.lon},boss):null};
}
export function bossArrival(bosses:Boss[],fix:BossFix|null|undefined,gpsValid:boolean,now:number){
  return bosses.filter(b=>bossPresence(b,fix,gpsValid,now).here).sort((a,b)=>(bossPresence(a,fix,gpsValid,now).distanceMeters||0)-(bossPresence(b,fix,gpsValid,now).distanceMeters||0)||a.id.localeCompare(b.id))[0];
}
/** Uses the completed server receipt summary; it cannot mutate HP or grant loot. */
export function contributionForecast(encounter:Encounter,owner:string,activity:ActivityPreview){
  const requirements=bossRequirements(encounter.boss.tier,encounter.roster.length,encounter.boss.rules);
  const damage=bossDamage(activity.meters,activity.movement,encounter.boss,encounter.boss.rules);
  const inWindow=encounter.startedAt!==null&&encounter.deadline!==null&&activity.eligibleStartedAt>=encounter.startedAt&&activity.endedAt>=activity.eligibleStartedAt&&activity.endedAt<=encounter.deadline;
  const canSubmit=encounter.state==='active'&&encounter.roster.some(m=>m.id===owner)&&!encounter.contributions[owner]&&activity.bossTileVisited&&inWindow;
  const qualified=canSubmit&&damage.equivalentKm>=requirements.minimumKmPerPerson;
  const remainingHp=Math.max(0,encounter.remainingHp-damage.hp);
  const wouldWin=canSubmit&&remainingHp===0&&(qualified||Object.values(encounter.contributions).some(c=>c.qualified));
  return{canSubmit,qualified,remainingHp,wouldWin,damage,minimumKm:requirements.minimumKmPerPerson,shortfallKm:Math.max(0,requirements.minimumKmPerPerson-damage.equivalentKm)};
}
