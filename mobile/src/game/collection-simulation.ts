import G from './engine';
import {captureAt,captureTarget} from './landmarks';
import {generateWorldSpawn,firstVisitSpawn,spawnRelic,detectable,detectionMeters,seededFraction,validateSpawnRules,type SpawnRules} from './world-spawns';
import {rulesForPlace,type WorldRegions} from './world-regions';
import {groundDestination} from '../map/geodesy';
import type {Relic,Rarity} from './types';
export type CollectionScenario={at:number;samples:number;seed:string;energyMeters:number;walkedMeters:number;weather:'clear'|'rain'|'snow'|'cold';viewDistanceMeters:number;uniqueVisitors:number;attemptAt:'own-tile'|'view-point';accurate:boolean};
export function validateCollectionScenario(s:CollectionScenario){
  if(!s||!Number.isSafeInteger(s.at)||s.at<0||s.at>4102444800000||!Number.isInteger(s.samples)||s.samples<1||s.samples>500||typeof s.seed!=='string'||!s.seed.length||s.seed.length>80)throw new Error('Use a seed, valid time and 1–500 independent synthetic players');
  for(const k of ['energyMeters','walkedMeters','viewDistanceMeters','uniqueVisitors']as const)if(!Number.isFinite(s[k])||s[k]<0||s[k]>(k==='energyMeters'||k==='walkedMeters'?1000000:10000))throw new Error('Invalid collection scenario distance or visitor count');
  if(!Number.isInteger(s.uniqueVisitors)||!['clear','rain','snow','cold'].includes(s.weather)||!['own-tile','view-point'].includes(s.attemptAt)||typeof s.accurate!=='boolean')throw new Error('Choose a supported weather, accuracy and attempt position');return s;
}
function randomFor(seed:string){let state=Math.floor(seededFraction(seed)*2**32);return()=>{state=(state+0x6d2b79f5)|0;let t=Math.imul(state^(state>>>15),state|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/2**32;};}
/** Uses actual spawn/discovery/search rules in fresh temporary games; never creates GPS or world events. */
export function simulateCollection(place:Relic,scenario:CollectionScenario,base:SpawnRules,regions:WorldRegions){
  const s=validateCollectionScenario(scenario);validateSpawnRules(base);const rules=rulesForPlace(place,s.at,base,regions);
  const counts={players:s.samples,worldSpawns:0,personalDrops:0,visibleFromView:0,detectedAtAttempt:0,attempts:0,misses:0,successes:0,repeatedAttemptsRejected:0};
  const rarities:Record<Rarity,{attempts:number;successes:number;expectedSuccesses:number}>={Common:{attempts:0,successes:0,expectedSuccesses:0},Rare:{attempts:0,successes:0,expectedSuccesses:0},Legendary:{attempts:0,successes:0,expectedSuccesses:0}};
  if(!rules)return{simulation:true,writes:0,blocked:true,rulesRevision:base.revision,regionsRevision:regions.revision,worldRarity:null,rangeMeters:detectionMeters(s.uniqueVisitors,base),counts,rarities};
  const world=generateWorldSpawn(place,s.at,rules),view=groundDestination(world.position,s.viewDistanceMeters,90),attempt=s.attemptAt==='own-tile'?world.position:view,point=G.xy(attempt.latitude,attempt.longitude),cell=G.cell(point.x,point.y),tile=G.key(cell.i,cell.j);
  counts.worldSpawns=1;
  for(let i=0;i<s.samples;i++){
    const owner=`collection-sim:${s.seed}:${i}`,personal=firstVisitSpawn(place,owner,s.at,rules),spawns=personal?[world,personal]:[world],game=G.initial();game.sharedSpawnsOnly=true;game.revealed={};game.x=point.x;game.y=point.y;game.energy=s.energyMeters;game.meters=s.walkedMeters;game.weather=s.weather;
    if(personal)counts.personalDrops++;
    const viewPoint=G.xy(view.latitude,view.longitude),viewCell=G.cell(viewPoint.x,viewPoint.y),viewTile=G.key(viewCell.i,viewCell.j);
    for(const spawn of spawns){if(spawn.tileId===viewTile||detectable(spawn,view,s.uniqueVisitors,base))counts.visibleFromView++;if(spawn.tileId===tile||detectable(spawn,attempt,s.uniqueVisitors,base)){game.revealed[spawn.id]=spawnRelic(spawn,place.landmark);counts.detectedAtAttempt++;}}
    const random=randomFor(s.seed+':'+i);
    for(let n=0;n<spawns.length;n++){
      const target=s.accurate?captureTarget(game,point):undefined,expected=target?G.chance(game.energy,game.weather,target.rarity,game.meters):0,result=captureAt(game,point,s.accurate,random);
      if(result.status==='unavailable')continue;counts.attempts++;if(target){rarities[target.rarity].attempts++;rarities[target.rarity].expectedSuccesses+=expected;}
      if(result.status==='success'){counts.successes++;if(target)rarities[target.rarity].successes++;}else counts.misses++;
    }
    if(captureAt(game,point,s.accurate,random).status==='unavailable')counts.repeatedAttemptsRejected++;
  }
  return{simulation:true,writes:0,blocked:false,rulesRevision:base.revision,regionsRevision:regions.revision,worldRarity:world.rarity,rangeMeters:detectionMeters(s.uniqueVisitors,base),counts,rarities};
}
