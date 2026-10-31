import type {D1Database} from '@cloudflare/workers-types';
import {newDevWorld,type DevWorld} from '../../mobile/src/game/dev-world';
import {recommendAdventure,validatePreferences,type RecommendationPreferences} from '../../mobile/src/game/recommendations';
import {LANDMARKS} from '../../mobile/src/game/landmarks';
import {loadBalance} from './balance-store';
import {loadRegions} from './region-store';
import {WorldError} from './world-error';
import {loadDiversityRules} from './diversity-store';
/** Read stored owner state directly: do not hydrate/materialize spawns or create a player during planning. */
export async function adventureIdeas(db:D1Database,owner:string,input:RecommendationPreferences,now=Date.now()){
  try{validatePreferences(input);}catch(e){throw new WorldError(400,(e as Error).message);}
  const row=await db.prepare('SELECT state FROM trail_players WHERE id=?').bind(owner).first<{state:string}>(),world=row?JSON.parse(row.state)as DevWorld:newDevWorld();
  const balance=await loadBalance(db),regions=await loadRegions(db),diversity=await loadDiversityRules(db);return recommendAdventure(world,balance.balance,input,LANDMARKS,regions,now,diversity.rules);
}
