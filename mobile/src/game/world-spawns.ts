import type {ArtifactSpawn} from './spawns';
import {validateSpawn} from './spawns';
import type {Relic,Rarity} from './types';
import {groundDistance} from '../map/geodesy';

export type SpawnRules={revision:string;context?:string;windowHours:number;weights:Record<Rarity,number>;firstVisitChance:number;minimumDetectionMeters:number;maximumDetectionMeters:number;densityCap:number};
export const SPAWN_RULES:SpawnRules={revision:'spawn-experiment-1',windowHours:24,weights:{Common:75,Rare:22,Legendary:3},firstVisitChance:.25,minimumDetectionMeters:300,maximumDetectionMeters:2000,densityCap:20};
export function validateSpawnRules(r:SpawnRules){
  if(!r||typeof r.revision!=='string'||!/^[a-z0-9-]{3,60}$/.test(r.revision)||!Number.isInteger(r.windowHours)||r.windowHours<1||r.windowHours>168)throw new Error('Invalid spawn window');
  if(r.context!==undefined&&(typeof r.context!=='string'||!/^[a-z0-9-]{3,60}$/.test(r.context)))throw new Error('Invalid spawn context');
  if(!r.weights||!(['Common','Rare','Legendary']as const).every(k=>Number.isSafeInteger(r.weights[k])&&r.weights[k]>=0&&r.weights[k]<=10000)||Object.values(r.weights).reduce((a,b)=>a+b,0)<=0)throw new Error('Invalid rarity weights');
  if(!Number.isFinite(r.firstVisitChance)||r.firstVisitChance<0||r.firstVisitChance>1||!Number.isSafeInteger(r.densityCap)||r.densityCap<1||r.densityCap>10000)throw new Error('Invalid discovery rules');
  if(![r.minimumDetectionMeters,r.maximumDetectionMeters].every(v=>Number.isSafeInteger(v)&&v>=0&&v<=10000)||r.minimumDetectionMeters>r.maximumDetectionMeters)throw new Error('Invalid detection range');
  return r;
}
// Stable unsigned FNV-1a; no runtime randomness, locale, account count or request order.
export function seededFraction(seed:string){let h=2166136261;for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0)/4294967296;}
export function weightedRarity(seed:string,rules=SPAWN_RULES):Rarity{
  validateSpawnRules(rules);const total=rules.weights.Common+rules.weights.Rare+rules.weights.Legendary,roll=seededFraction(seed)*total;
  return roll<rules.weights.Common?'Common':roll<rules.weights.Common+rules.weights.Rare?'Rare':'Legendary';
}
export function generateWorldSpawn(place:Relic,now:number,rules=SPAWN_RULES):ArtifactSpawn{
  validateSpawnRules(rules);if(!Number.isSafeInteger(now)||now<0||place.latitude==null||place.longitude==null||!place.source)throw new Error('A sourced outdoor position is required');
  const duration=rules.windowHours*3600000,start=Math.floor(now/duration)*duration,seed=`${rules.revision}:${rules.context?rules.context+':':''}${place.landmarkId||place.id}:${start}`;
  return validateSpawn({version:1,id:'world:'+seed,tileId:place.id,artifactType:place.name,rarity:weightedRarity(seed,rules),kind:'dynamic',position:{latitude:place.latitude,longitude:place.longitude},createdAt:start,expiresAt:start+duration,claimPolicy:'once-per-player',origin:'world'});
}
export function firstVisitSpawn(place:Relic,owner:string,at:number,rules=SPAWN_RULES):ArtifactSpawn|null{
  const world=generateWorldSpawn(place,at,rules),seed=`first:${owner}:${place.id}:${rules.revision}`;
  if(seededFraction(seed)>=rules.firstVisitChance)return null;
  return validateSpawn({...world,id:`personal:${owner}:${place.id}`,rarity:weightedRarity(seed+':rarity',rules),kind:'personal-first-visit',origin:'personal',ownerId:owner,createdAt:at,expiresAt:null});
}
export function detectionMeters(uniqueVisitors:number,rules=SPAWN_RULES){validateSpawnRules(rules);const density=Math.max(0,Math.min(rules.densityCap,uniqueVisitors));return rules.maximumDetectionMeters-(rules.maximumDetectionMeters-rules.minimumDetectionMeters)*density/rules.densityCap;}
export function detectable(spawn:ArtifactSpawn,position:{latitude:number;longitude:number},uniqueVisitors:number,rules=SPAWN_RULES){return groundDistance(spawn.position,position)<=detectionMeters(uniqueVisitors,rules);}
export function spawnRelic(spawn:ArtifactSpawn,label?:string):Relic{
  const[i,j]=spawn.tileId.split(',').map(Number);return{id:spawn.id,i,j,name:spawn.artifactType,rarity:spawn.rarity,novelty:1,latitude:spawn.position.latitude,longitude:spawn.position.longitude,landmark:label||'World artefact',source:'Shared dev world'};
}
