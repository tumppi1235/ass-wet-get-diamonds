import G from './engine';
import type {GameState} from './types';
import type {TrackedFix} from '../location/tracker';
import {beginQuest,seedLandmarks} from './landmarks';
import {creditWalkingGold} from './resources';
import {RELEASE_FEATURES} from '../config/features';
import {ensureLifetime,recordExplorationEvidence,closeActivityEvidence} from './achievements';
import {appendTrail} from './trail';
export type Adventure={id:string;source:'gps'|'demo';status:'active'|'stopped';startedAt:number;pendingStart?:boolean;endedAt?:number};
export const adventureActive=(state:GameState|null)=>state?.adventure?.status==='active';
export function requestAdventure(state:GameState,now=Date.now()){
  if(adventureActive(state)&&state.adventure?.source==='gps')return;
  state.adventure={id:'adventure:'+now,source:'gps',status:'active',startedAt:now,pendingStart:true};
  state.path=[];
}
export function endAdventure(state:GameState,now=Date.now()){
  if(RELEASE_FEATURES.lifetimeJournal)closeActivityEvidence(state,now);
  if(state.adventure)state.adventure={...state.adventure,status:'stopped',pendingStart:false,endedAt:now};
}
export function applyExplorationFix(state:GameState,fix:TrackedFix){
  const timestamp=fix.position.timestamp;
  if(!fix.eligible||timestamp<=(state.lastGpsTimestamp || 0))return false;
  if(RELEASE_FEATURES.lifetimeJournal)ensureLifetime(state,timestamp);
  state.lastGpsTimestamp=timestamp;
  state.x=fix.position.x;state.y=fix.position.y;
  if(!adventureActive(state)||state.adventure?.source!=='gps'){
    // Discovery can reveal/collect in the current tile without a workout or distance rewards.
    G.vision(state);seedLandmarks(state);if(RELEASE_FEATURES.lifetimeJournal)recordExplorationEvidence(state,fix,false);return true;
  }
  if(state.adventure!.pendingStart){
    const pending=state.adventure!;beginQuest(state);state.adventure={...pending,pendingStart:false,startedAt:timestamp};
    // The location watcher can already be running in Discovery mode. Its last
    // distance belongs before this quest, so establish a fresh route baseline.
    fix={...fix,distance:0,startSegment:true};
  }
  state.meters+=fix.distance;state.energy+=fix.distance;creditWalkingGold(state,fix.distance);G.enter(state);
  state.elapsed=Math.max(state.elapsed,(timestamp-state.adventure!.startedAt)/1000);
  appendTrail(state,{x:state.x,y:state.y,breakBefore:fix.startSegment});
  if(RELEASE_FEATURES.lifetimeJournal)recordExplorationEvidence(state,fix,true);
  return true;
}
