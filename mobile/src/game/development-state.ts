import type {GameState} from './types';
import {APP_ENV} from '../config/environment';
import {ensureLifetime} from './achievements';
import {newProgression,validateProgression} from './progression';
export function restoreDevelopmentState(s:GameState,now=Date.now()){
  if(APP_ENV==='development'){
    ensureLifetime(s,now);
    s.progression=s.progression?validateProgression(s.progression):newProgression();
  }
  return s;
}
