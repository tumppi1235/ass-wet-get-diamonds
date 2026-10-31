import type {DevWorld,Movement} from './dev-world';
import type {PlayerPosition} from '../location/tracker';
import {blockedAt,type WorldRegions,type WorldRegion} from './world-regions';
export const TERRAINS=['urban','trail','woodland']as const;
export type Terrain=typeof TERRAINS[number];
export type DiversityRules={revision:string;terrainXp:number;movementXp:number;terrainMeters:number;movementMeters:number};
// Existing installations gain no new rate implicitly. An audited admin revision enables the experiment.
export const DIVERSITY_RULES:DiversityRules={revision:'diversity-experiment-1',terrainXp:0,movementXp:0,terrainMeters:250,movementMeters:1000};
export const DIVERSITY_EXPERIMENT={terrainXp:3,movementXp:5,terrainMeters:250,movementMeters:1000};
export type DiversityState={version:1;terrains:Partial<Record<Terrain,{at:number;activity:string;regionsRevision:string}>>;movements:Partial<Record<Movement,{at:number;activity:string;meters:number}>>;active:{id:string;movement:Movement;meters:number;terrainMeters:Partial<Record<Terrain,number>>;policy:DiversityRules;anchorRevision?:string}|null};
export type DiversityContext={rules:DiversityRules;regions:WorldRegions};
export type DiversityReceipt={revision:string;xp:number;terrain?:Terrain;movement?:Movement};
export function validateDiversityRules(value:DiversityRules){
  if(!value||typeof value.revision!=='string'||!/^[a-z0-9-]{3,60}$/.test(value.revision))throw new Error('Invalid diversity revision');
  for(const key of ['terrainXp','movementXp']as const)if(!Number.isSafeInteger(value[key])||value[key]<0||value[key]>10000)throw new Error('Diversity XP must be 0–10000');
  for(const key of ['terrainMeters','movementMeters']as const)if(!Number.isSafeInteger(value[key])||value[key]<250||value[key]>100000)throw new Error('Diversity distance must be 250–100000 metres');return{...value};
}
export function ensureDiversity(world:DevWorld){if(world.diversity&&world.diversity.version!==1)throw new Error('Unsupported diversity evidence');return world.diversity??={version:1,terrains:{},movements:{},active:null};}
export function beginDiversity(world:DevWorld,id:string,movement:Movement,rules:DiversityRules){const state=ensureDiversity(world);if(state.active?.id!==id)state.active={id,movement,meters:0,terrainMeters:{},policy:validateDiversityRules(rules)};return state.active!;}
const inside=(p:{latitude:number;longitude:number},r:WorldRegion)=>p.latitude>=r.south&&p.latitude<=r.north&&p.longitude>=r.west&&p.longitude<=r.east;
/** Manual region classification only; unknown, blocked or conflicting classes remain unknown. */
export function terrainAt(p:{latitude:number;longitude:number},at:number,regions:WorldRegions):Terrain|null{const matching=regions.regions.filter(r=>at>=r.startsAt&&at<r.endsAt&&inside(p,r));if(matching.some(r=>r.blocked))return null;const types=new Set(matching.map(r=>r.terrain));return types.size===1?[...types][0]:null;}
function segmentTerrain(a:PlayerPosition,b:PlayerPosition,now:number,regions:WorldRegions):Terrain|null{
  const terrain=terrainAt(a,a.timestamp,regions);if(!terrain||terrainAt(b,b.timestamp,regions)!==terrain||blockedAt(b,now,regions))return null;
  if(!regions.regions.some(r=>!r.blocked&&r.terrain===terrain&&r.startsAt<=a.timestamp&&r.endsAt>now&&inside(a,r)&&inside(b,r)))return null;
  // Conservatively exclude any active conflicting/blocked rectangle touching the segment's bounding box.
  if(regions.regions.some(r=>(r.blocked||r.terrain!==terrain)&&r.startsAt<=now&&r.endsAt>a.timestamp&&r.south<=Math.max(a.latitude,b.latitude)&&r.north>=Math.min(a.latitude,b.latitude)&&r.west<=Math.max(a.longitude,b.longitude)&&r.east>=Math.min(a.longitude,b.longitude)))return null;
  return terrain;
}
export function recordDiversity(world:DevWorld,position:PlayerPosition,priorAnchor:PlayerPosition|null,distance:number,startSegment:boolean,now:number,context:DiversityContext):DiversityReceipt|undefined{
  const adventure=world.game.adventure;if(adventure?.status!=='active'||adventure.source!=='gps')return;
  const active=beginDiversity(world,adventure.id,world.movement,context.rules),state=world.diversity!,result:DiversityReceipt={revision:active.policy.revision,xp:0};
  if(distance>0&&!startSegment){
    active.meters+=distance;if(!Number.isFinite(active.meters))throw new Error('Diversity evidence exceeds distance limits');
    const terrain=priorAnchor&&active.anchorRevision===context.regions.revision?segmentTerrain(priorAnchor,position,now,context.regions):null;
    if(terrain){active.terrainMeters[terrain]=(active.terrainMeters[terrain]||0)+distance;if(!state.terrains[terrain]&&active.terrainMeters[terrain]!>=active.policy.terrainMeters){state.terrains[terrain]={at:now,activity:active.id,regionsRevision:context.regions.revision};result.terrain=terrain;result.xp=active.policy.terrainXp;}}
  }
  if(world.anchor?.timestamp===position.timestamp)active.anchorRevision=context.regions.revision;
  return result;
}
export function finishDiversity(world:DevWorld,now:number):DiversityReceipt|undefined{
  if(world.diversity&&world.diversity.version!==1)throw new Error('Unsupported diversity evidence');
  const state=world.diversity,active=state?.active,adventure=world.game.adventure;if(!active||!state)return;
  state.active=null;if(adventure?.status!=='active'||adventure.id!==active.id||active.movement!==world.movement)return;
  const result:DiversityReceipt={revision:active.policy.revision,xp:0};if(!state.movements[active.movement]&&active.meters>=active.policy.movementMeters){state.movements[active.movement]={at:now,activity:active.id,meters:active.meters};result.movement=active.movement;result.xp=active.policy.movementXp;}return result;
}
/** Recovery retains permanent observed novelty, and never resumes a backed-up partial qualification. */
export function mergeDiversity(saved:DiversityState|undefined,current:DiversityState|undefined):DiversityState|undefined{if((saved&&saved.version!==1)||(current&&current.version!==1))throw new Error('Unsupported diversity evidence');if(!saved&&!current)return;return{version:1,terrains:{...saved?.terrains,...current?.terrains},movements:{...saved?.movements,...current?.movements},active:null};}
