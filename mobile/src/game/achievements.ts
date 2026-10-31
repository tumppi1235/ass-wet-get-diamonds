import type {GameState,Relic} from './types';
import type {TrackedFix} from '../location/tracker';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Reuse prototype geography without the app engine's dependency cycle.
const grid:Pick<import('./types').Engine,'cell'|'key'>=require('../../../public/engine.js');
type Evidence={at:number|null;source:'gps'|'legacy'};
type Activity={startedAt:number;endedAt?:number;meters:number;observedSeconds:number};
export type Lifetime={version:1;since:number;lastFixAt:number;lastRecordingFixAt:number|null;lastAdventureId:string|null;meters:number;observedSeconds:number;tiles:Record<string,Evidence>;finds:Record<string,Evidence&{name:string;rarity:string}>;activities:Record<string,Activity>};
export function ensureLifetime(s:GameState,now:number):Lifetime{
  if(s.lifetime){if(s.lifetime.version!==1)throw new Error('Unsupported lifetime save');return s.lifetime;}
  // Unknown historical mileage cannot be recovered from a single outing's counters.
  const tiles:Lifetime['tiles']={},finds:Lifetime['finds']={};
  for(const [id,count]of Object.entries(s.visits))if(count>0)tiles[id]={at:null,source:'legacy'};
  for(const relic of s.collection)finds[relic.id]={at:null,source:'legacy',name:relic.name,rarity:relic.rarity};
  return s.lifetime={version:1,since:now,lastFixAt:0,lastRecordingFixAt:null,lastAdventureId:null,meters:0,observedSeconds:0,tiles,finds,activities:{}};
}
export function recordExplorationEvidence(s:GameState,fix:TrackedFix,recording:boolean){
  const at=fix.position.timestamp;
  if(!fix.eligible||!Number.isSafeInteger(at)||at<0||!Number.isFinite(fix.distance)||fix.distance<0)return;
  const l=ensureLifetime(s,at);if(at<=l.lastFixAt)return;l.lastFixAt=at;
  const c=grid.cell(fix.position.x,fix.position.y),id=grid.key(c.i,c.j);
  if(l.tiles[id]?.source!=='gps')l.tiles[id]={at,source:'gps'};
  const adventure=s.adventure;
  if(!recording||!adventure||adventure.source!=='gps'||adventure.status!=='active'||adventure.pendingStart){l.lastRecordingFixAt=null;l.lastAdventureId=null;return;}
  const activity=l.activities[adventure.id]??={startedAt:at,meters:0,observedSeconds:0};
  const continuous=!fix.startSegment&&l.lastAdventureId===adventure.id&&l.lastRecordingFixAt!==null;
  const seconds=continuous?(at-l.lastRecordingFixAt!)/1000:0;
  // A fresh baseline and any gap >30s contribute neither invented duration nor mileage.
  const validSegment=continuous&&seconds>0&&seconds<=30;
  const meters=validSegment?fix.distance:0,duration=validSegment?seconds:0;
  activity.meters+=meters;activity.observedSeconds+=duration;l.meters+=meters;l.observedSeconds+=duration;
  l.lastRecordingFixAt=at;l.lastAdventureId=adventure.id;
}
export function recordArtifactEvidence(s:GameState,relic:Relic,at:number){
  if(!Number.isSafeInteger(at)||at<0||!s.collection.some(item=>item.id===relic.id))return;
  const l=ensureLifetime(s,at);if(l.finds[relic.id]?.source!=='gps')l.finds[relic.id]={at,source:'gps',name:relic.name,rarity:relic.rarity};
}
export function closeActivityEvidence(s:GameState,at:number){
  const l=s.lifetime,activity=s.adventure&&l?.activities[s.adventure.id];
  if(activity&&activity.endedAt===undefined)activity.endedAt=at;
  if(l){l.lastAdventureId=null;l.lastRecordingFixAt=null;}
}
export function lifetimeSummary(l:Lifetime){
  return{meters:l.meters,observedSeconds:l.observedSeconds,verifiedTiles:Object.values(l.tiles).filter(e=>e.source==='gps').length,legacyTiles:Object.values(l.tiles).filter(e=>e.source==='legacy').length,verifiedFinds:Object.values(l.finds).filter(e=>e.source==='gps').length,legacyFinds:Object.values(l.finds).filter(e=>e.source==='legacy').length,adventures:Object.keys(l.activities).length};
}
