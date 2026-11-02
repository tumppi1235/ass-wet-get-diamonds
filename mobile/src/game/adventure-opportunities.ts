import type {DevWorld} from './dev-world';
import type {RecommendationPreferences} from './recommendations';
import type {Boss} from './bosses';
import {bossRequirements} from './bosses';
import {explorationObjective} from './boss-objectives';
import type {Relic} from './types';
import {blockedAt,type WorldRegions} from './world-regions';
import {terrainAt} from './diversity';
import {groundDistance} from '../map/geodesy';

export type OpportunityRelic=Relic&{expiresAt?:number|null};
export type OpportunityOrigin={latitude:number;longitude:number;name:string;preview:boolean};
export type AdventureOpportunity={id:string;kind:'boss'|'artefact';name:string;latitude:number;longitude:number;minimumReturnMeters:number;routePlaceId?:string;routePlaceName?:string;endsAt?:number;detail:string};
export type OpportunityIdeas={origin:OpportunityOrigin|null;items:AdventureOpportunity[];truncated:boolean;awardsWritten:0;limits:string[]};
export function freshOpportunityOrigin(world:DevWorld,now:number):OpportunityOrigin|null{
  const p=world.previous;return p&&world.latestGpsValid&&p.accuracy>=0&&p.accuracy<=25&&p.latitude>=59&&p.latitude<=71&&p.longitude>=19&&p.longitude<=32&&now>=p.timestamp&&now-p.timestamp<15000&&[p.latitude,p.longitude].every(Number.isFinite)?{latitude:p.latitude,longitude:p.longitude,name:'your accepted GPS',preview:false}:null;
}
/** Read-only suggestions: no discovery, route generation, activity or reward mutation. */
export function opportunityIdeas(world:DevWorld,p:RecommendationPreferences,origin:OpportunityOrigin|null,bosses:Boss[],relics:OpportunityRelic[],catalog:Relic[],regions:WorldRegions,now:number):OpportunityIdeas{
  const result:OpportunityIdeas={origin,items:[],truncated:false,awardsWritten:0,limits:['At most three bosses and three already-discovered artefacts in a bounded nearby area. Straight-line return distance is a lower bound, not a route.','A path selection is navigation only: confirm current boss status in Encounters and artefact eligibility in Quest. It grants no distance, discovery, XP or loot.']};
  if(!origin||p.access!=='known-paths'){result.limits.push(origin?'Step-free access cannot be verified; no opportunities suggested.':'Use fresh accurate GPS or explicitly select a public boss-preview origin.');return result;}
  if(blockedAt(origin,now,regions)){result.limits.push('The selected origin is in a configured blocked area. Choose an independently verified public path.');return result;}
  const candidates:AdventureOpportunity[]=[];
  const add=(item:Omit<AdventureOpportunity,'minimumReturnMeters'>)=>{
    if(!Number.isFinite(item.latitude)||!Number.isFinite(item.longitude)||blockedAt(item,now,regions))return;
    if(p.terrain!=='any'&&terrainAt(item,now,regions)!==p.terrain)return;
    const minimumReturnMeters=Math.ceil(2*groundDistance(origin,item));if(minimumReturnMeters>p.meters)return;
    // Route only to an exact existing sourced public point, never a guessed connector.
    const path=catalog.find(r=>r.landmarkId&&r.source&&r.latitude===item.latitude&&r.longitude===item.longitude);
    candidates.push({...item,minimumReturnMeters,...(path?{routePlaceId:path.landmarkId,routePlaceName:path.landmark||path.name}:{})});
  };
  for(const b of bosses){if(now<b.startsAt||now>=b.endsAt)continue;const km=bossRequirements(b.tier,1,b.rules).targetKmPerPerson,tiles=explorationObjective(b).required;
    add({id:b.id,kind:'boss',name:b.name,latitude:b.latitude,longitude:b.longitude,endsAt:b.endsAt,detail:`${b.tier} · solo reference ${km} equivalent km (${(km*(p.movement==='foot'?1:b.rules.footHpPerKm/b.rules.bicycleHpPerKm)).toFixed(1)} ${p.movement==='foot'?'Foot':'Bicycle'} km before weakness bonuses)${tiles?` + ${tiles} distinct tiles in one activity`:''}. Party size changes targets; inspect Encounters before activating.`});
  }
  if(!origin.preview)for(const r of relics){if(r.expiresAt!=null&&now>=r.expiresAt||!world.game.revealed[r.id]||world.game.searched[r.id]||world.game.collection.some(c=>c.id===r.id)||r.latitude==null||r.longitude==null)continue;
    add({id:r.id,kind:'artefact',...(r.expiresAt!=null?{endsAt:r.expiresAt}:{}),name:r.title||r.landmark||r.name,latitude:r.latitude,longitude:r.longitude,detail:`${r.rarity} ${r.name} · already discovered. Re-enter its tile with accurate GPS to check collection; a find is not guaranteed.`});
  }
  candidates.sort((a,b)=>a.minimumReturnMeters-b.minimumReturnMeters||a.id.localeCompare(b.id));
  for(const kind of ['boss','artefact']as const){const rows=candidates.filter(c=>c.kind===kind);result.items.push(...rows.slice(0,3));result.truncated ||=rows.length>3;}
  if(origin.preview)result.limits.push('Public preview shows bosses only. It does not move your player or disclose hidden artefacts.');
  return result;
}
