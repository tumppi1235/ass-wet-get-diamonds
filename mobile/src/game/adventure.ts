import G from './engine';
import type {GameState} from './types';
import type {TrackedFix} from '../location/tracker';
import {beginQuest,seedLandmarks} from './landmarks';
import {creditWalkingGold} from './resources';
import {APP_ENV} from '../config/environment';
import {ensureLifetime,recordExplorationEvidence,closeActivityEvidence} from './achievements';
export type Adventure={id:string;source:'gps'|'demo';status:'active'|'stopped';startedAt:number;pendingStart?:boolean;endedAt?:number};
export const adventureActive=(state:GameState|null)=>state?.adventure?.status==='active';
export function requestAdventure(state:GameState,now=Date.now()){
  if(adventureActive(state)&&state.adventure?.source==='gps')return;
  state.adventure={id:'adventure:'+now,source:'gps',status:'active',startedAt:now,pendingStart:true};
}
export function endAdventure(state:GameState,now=Date.now()){
  if(APP_ENV==='development')closeActivityEvidence(state,now);
  if(state.adventure)state.adventure={...state.adventure,status:'stopped',pendingStart:false,endedAt:now};
}
export function applyExplorationFix(state:GameState,fix:TrackedFix){
  const timestamp=fix.position.timestamp;
  if(!fix.eligible||timestamp<=(state.lastGpsTimestamp || 0))return false;
  if(APP_ENV==='development')ensureLifetime(state,timestamp);
  state.lastGpsTimestamp=timestamp;
  state.x=fix.position.x;state.y=fix.position.y;
  if(!adventureActive(state)||state.adventure?.source!=='gps'){
    // Discovery can reveal/collect in the current tile without a workout or distance rewards.
    G.vision(state);seedLandmarks(state);if(APP_ENV==='development')recordExplorationEvidence(state,fix,false);return true;
  }
  if(state.adventure!.pendingStart){
    const pending=state.adventure!;beginQuest(state);state.adventure={...pending,pendingStart:false,startedAt:timestamp};
  }
  state.meters+=fix.distance;state.energy+=fix.distance;creditWalkingGold(state,fix.distance);G.enter(state);
  state.elapsed=Math.max(state.elapsed,(timestamp-state.adventure!.startedAt)/1000);
  if(fix.distance||fix.startSegment||!state.path.length)state.path.push({x:state.x,y:state.y,breakBefore:fix.startSegment});
  if(state.path.length>2000)state.path.shift();
  if(APP_ENV==='development')recordExplorationEvidence(state,fix,true);
  return true;
}
