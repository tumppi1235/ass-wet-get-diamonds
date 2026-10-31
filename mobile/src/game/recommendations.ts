import G from './engine';
import type {DevWorld,DevBalance,Movement} from './dev-world';
import {ATTRIBUTES,levelProgress,type Attribute} from './progression';
import {rewardXp} from './reward-rates';
import {blockedAt,type WorldRegions} from './world-regions';
import {groundDistance} from '../map/geodesy';
import type {Relic} from './types';
import {terrainAt,DIVERSITY_RULES,type DiversityRules} from './diversity';

export type RecommendationPreferences={goal:Attribute;movement:Movement;meters:number;terrain:'any'|'urban'|'trail'|'woodland';access:'known-paths'|'step-free'};
export type SuggestedPlace={id:string;name:string;latitude:number;longitude:number;source:string;tile:string;minimumReturnMeters:number;terrain:string;newTile:boolean;newRegion:boolean};
export type AdventureIdeas={preferences:RecommendationPreferences;generatedAt:number;balanceRevision:string;locationUsed:boolean;title:string;guidance:string;assumptions:string[];xp:Record<Attribute,number>;levels:{attribute:Attribute;before:number;after:number}[];places:SuggestedPlace[];limits:string[];awardsWritten:0};
export function validatePreferences(value:RecommendationPreferences){
  if(!value||!ATTRIBUTES.includes(value.goal)||!['foot','bicycle'].includes(value.movement)||!Number.isSafeInteger(value.meters)||value.meters<250||value.meters>100000||!['any','urban','trail','woodland'].includes(value.terrain)||!['known-paths','step-free'].includes(value.access))throw new Error('Choose a goal, Foot/Bicycle, 0.25–100 km and supported preferences');return value;
}
/** Non-route, conditional guidance only. It neither starts an activity nor evaluates or grants rewards. */
export function recommendAdventure(world:DevWorld,balance:DevBalance,preferences:RecommendationPreferences,catalog:Relic[],regions:WorldRegions,now:number,diversityRules:DiversityRules=DIVERSITY_RULES):AdventureIdeas{
  const p=validatePreferences(preferences),unsupported=p.goal==='power'||p.goal==='fellowship';
  const fix=world.previous,locationUsed=!!fix&&world.latestGpsValid&&fix.accuracy<=25&&now>=fix.timestamp&&now-fix.timestamp<15000;
  const evidence={equivalentMeters:unsupported?0:world.xpRemainder+p.meters*(p.movement==='foot'?balance.footFactor:balance.bicycleFactor),tiles:p.goal==='exploration'?1:0,regions:p.goal==='agility'?1:0,finds:p.goal==='perception'?1:0};
  const xp=rewardXp(balance,evidence),assumptions=unsupported?[]:[`${p.meters/1000} km of accepted ${p.movement==='foot'?'Foot':'Bicycle'} distance, with the current effort factor and saved fractional Endurance credit.`];
  if(p.goal==='exploration')assumptions.push('Reach one distinct tile never previously rewarded to this account. Repeated visits add no first-tile XP.');
  if(p.goal==='agility')assumptions.push('Reach one previously unrewarded regional block. A different tile in an old block adds no regional Agility XP.');
  if(p.goal==='perception')assumptions.push('One successful eligible artefact collection, not just an attempt. A find is not guaranteed by distance or this plan.');
  if(p.goal==='agility'){
    if(!world.diversity?.movements[p.movement]&&p.meters>=diversityRules.movementMeters&&diversityRules.movementXp){xp.agility+=diversityRules.movementXp;assumptions.push(`Complete a new ${p.movement==='foot'?'Foot':'Bicycle'} outing with at least ${diversityRules.movementMeters} accepted metres, then Stop; this movement category has not qualified before. Diversity policy ${diversityRules.revision}.`);}
    if(p.terrain!=='any'&&!world.diversity?.terrains[p.terrain]&&p.meters>=diversityRules.terrainMeters&&diversityRules.terrainXp){xp.agility+=diversityRules.terrainXp;assumptions.push(`Record at least ${diversityRules.terrainMeters} conservatively classified metres in new ${p.terrain} terrain within one outing. Unknown/blocked/conflicting terrain does not qualify. Diversity policy ${diversityRules.revision}.`);}
    assumptions.push('Diversity estimates use rules for a new outing. An already active outing keeps its starting diversity policy; no past mileage is backfilled.');
  }
  const titles:Record<Attribute,string>={exploration:'Find one new tile',endurance:'Build recorded distance',agility:'Explore an unfamiliar region',perception:'Look for a new find',power:'Power needs elevation evidence',fellowship:'Cooperate in a boss encounter'};
  const guidance=p.goal==='power'?'Elevation earning is not supported yet. Hill repeats cannot currently award Power XP.':p.goal==='fellowship'?'Open Encounters to plan a shared boss. Fellowship requires at least two qualified submitted participants and a victory; joining a party alone earns none.':`Choose ${p.movement==='foot'?'walking':'cycling'} paths you know are usable and aim for ${p.meters/1000} km of recorded distance. These are ordinary activity estimates, with no plan-completion bonus.`;
  const places:SuggestedPlace[]=[],seen=new Set<string>();
  if(locationUsed&&!unsupported&&p.access==='known-paths'&&(p.goal==='exploration'||p.goal==='agility')){
    for(const place of catalog){
      if(!place.landmarkId||!place.source||place.latitude==null||place.longitude==null||blockedAt({latitude:place.latitude,longitude:place.longitude},now,regions))continue;
      const point=G.xy(place.latitude,place.longitude),cell=G.cell(point.x,point.y),tile=G.key(cell.i,cell.j),region=G.key(Math.floor(point.x/2000),Math.floor(point.y/2000));
      const newTile=!(world.rewardedTiles?.[tile]||world.game.visits[tile]>0),newRegion=!world.regions[region];
      if((p.goal==='exploration'&&!newTile)||(p.goal==='agility'&&!newRegion))continue;
      const terrain=terrainAt({latitude:place.latitude,longitude:place.longitude},now,regions)||'unknown';
      if(p.terrain!=='any'&&terrain!==p.terrain)continue;
      const minimumReturnMeters=2*groundDistance(fix!,{latitude:place.latitude,longitude:place.longitude});
      if(minimumReturnMeters>p.meters||seen.has(tile))continue;seen.add(tile);
      places.push({id:place.landmarkId,name:place.landmark||place.name,latitude:place.latitude,longitude:place.longitude,source:place.source,tile,minimumReturnMeters:Math.ceil(minimumReturnMeters),terrain,newTile,newRegion});
    }
    places.sort((a,b)=>a.minimumReturnMeters-b.minimumReturnMeters||a.id.localeCompare(b.id));
  }
  const limits=['No route, turn-by-turn navigation, path-distance guarantee or GPX is generated. Actual path distance can be much longer than the straight-line minimum return.','Catalog destinations are ideas, not promises of artefacts, cycling permission, trail conditions or current public access. Blocked dev regions are excluded.'];
  if(!locationUsed)limits.push('Nearby destinations require a fresh accurate location. Use Me to request location; no city-centre location is assumed.');
  if(p.access==='step-free')limits.push('Step-free access cannot be verified from this catalog. No destinations are suggested under this constraint; choose a route you have independently checked.');
  if(p.terrain!=='any')limits.push('Terrain matching uses explicit active admin classifications only; unknown or conflicting classifications are excluded. It is not an automatic terrain survey.');
  return{preferences:{...p},generatedAt:now,balanceRevision:balance.revision,locationUsed,title:titles[p.goal],guidance,assumptions,xp,levels:ATTRIBUTES.map(attribute=>({attribute,before:levelProgress(world.game.progression?.xp[attribute]||0,balance.curveCoefficient).level,after:levelProgress((world.game.progression?.xp[attribute]||0)+xp[attribute],balance.curveCoefficient).level})),places:places.slice(0,3),limits,awardsWritten:0};
}
