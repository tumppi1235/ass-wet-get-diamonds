import type {D1Database} from '@cloudflare/workers-types';
import {newDevWorld,type DevWorld} from '../../mobile/src/game/dev-world';
import {recommendAdventure,validatePreferences,type RecommendationPreferences} from '../../mobile/src/game/recommendations';
import {LANDMARKS} from '../../mobile/src/game/landmarks';
import {loadBalance} from './balance-store';
import {loadRegions} from './region-store';
import {WorldError} from './world-error';
import {loadDiversityRules} from './diversity-store';
import {freshOpportunityOrigin,opportunityIdeas} from '../../mobile/src/game/adventure-opportunities';
import {queryBosses} from './boss-store';
import {spawnRelic} from '../../mobile/src/game/world-spawns';
import type {ArtifactSpawn} from '../../mobile/src/game/spawns';
/** Read stored owner state directly: do not hydrate/materialize spawns or create a player during planning. */
export async function adventureIdeas(db:D1Database,owner:string,input:RecommendationPreferences,now=Date.now()){
  try{validatePreferences(input);}catch(e){throw new WorldError(400,(e as Error).message);}
  const row=await db.prepare('SELECT state FROM trail_players WHERE id=?').bind(owner).first<{state:string}>(),world=row?JSON.parse(row.state)as DevWorld:newDevWorld();
  const balance=await loadBalance(db),regions=await loadRegions(db),diversity=await loadDiversityRules(db);
  let origin=freshOpportunityOrigin(world,now);
  if(input.opportunityOrigin!==undefined){const place=LANDMARKS.find(p=>p.landmarkId===input.opportunityOrigin&&p.source);if(!place||place.latitude==null||place.longitude==null)throw new WorldError(400,'Choose a sourced public boss-preview origin');origin={latitude:place.latitude,longitude:place.longitude,name:place.landmark||place.name,preview:true};}
  const bounds=origin?{south:Math.max(59,origin.latitude-.1),north:Math.min(71,origin.latitude+.1),west:Math.max(19,origin.longitude-.2),east:Math.min(32,origin.longitude+.2)}:null;
  const bosses=bounds&&input.access==='known-paths'?await queryBosses(db,bounds,now):{bosses:[],truncated:false};
  const rows=origin&&!origin.preview&&input.access==='known-paths'?await db.prepare("SELECT document FROM trail_spawns s WHERE id IN (SELECT value FROM json_each(?)) AND removed_at IS NULL AND starts_at<=? AND (expires_at IS NULL OR expires_at>?) AND (owner IS NULL OR owner=?) AND NOT EXISTS(SELECT 1 FROM trail_spawn_claims c WHERE c.spawn=s.id AND c.owner=?) ORDER BY id LIMIT 101").bind(JSON.stringify(Object.keys(world.game.revealed)),now,now,owner,owner).all<{document:string}>():{results:[]};
  const relics=rows.results.map(r=>{const spawn=JSON.parse(r.document)as ArtifactSpawn;return{...spawnRelic(spawn),expiresAt:spawn.expiresAt,landmark:world.game.revealed[spawn.id]?.landmark};});
  const opportunities=opportunityIdeas(world,input,origin,bosses.bosses.map(b=>b.boss),relics,LANDMARKS,regions,now);opportunities.truncated ||=bosses.truncated||rows.results.length>100;
  return{...recommendAdventure(world,balance.balance,input,LANDMARKS,regions,now,diversity.rules),opportunities};
}
