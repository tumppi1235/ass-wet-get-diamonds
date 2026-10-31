import type {GameState} from './types';
import {RELEASE_FEATURES} from '../config/features';
import {ensureLifetime} from './achievements';
import {newProgression,validateProgression} from './progression';
export function restoreDevelopmentState(s:GameState,now=Date.now()){
  if(RELEASE_FEATURES.lifetimeJournal){
    ensureLifetime(s,now);
    s.progression=s.progression?validateProgression(s.progression):newProgression();
  }
  return s;
}
