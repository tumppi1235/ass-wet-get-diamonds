import type {DevBalance,Movement} from './dev-world';
import {levelProgress,type Attribute} from './progression';
export type RewardEvidence={tiles?:number;regions?:number;finds?:number;equivalentMeters?:number};
/** Shared earning arithmetic for accepted server evidence and clearly labelled projections. */
export function rewardXp(balance:DevBalance,evidence:RewardEvidence):Record<Attribute,number>{
  for(const value of Object.values(evidence))if(!Number.isFinite(value)||value<0)throw new Error('Invalid reward evidence');
  const result={exploration:(evidence.tiles||0)*balance.tileXp,power:0,agility:(evidence.regions||0)*balance.regionXp,endurance:Math.floor((evidence.equivalentMeters||0)/balance.enduranceMetersPerXp),perception:(evidence.finds||0)*balance.findXp,fellowship:0};
  if(!Object.values(result).every(v=>Number.isSafeInteger(v)&&v>=0))throw new Error('Reward exceeds whole XP limits');return result;
}
export type ActivityEstimate={meters:number;tiles:number;regions:number;finds:number;movement:Movement};
export function estimateProgression(balance:DevBalance,e:ActivityEstimate){
  if(!['foot','bicycle'].includes(e.movement)||!Number.isFinite(e.meters)||e.meters<0||e.meters>100000000||![e.tiles,e.regions,e.finds].every(v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000))throw new Error('Invalid simulation assumptions');
  const xp=rewardXp(balance,{tiles:e.tiles,regions:e.regions,finds:e.finds,equivalentMeters:e.meters*(e.movement==='foot'?balance.footFactor:balance.bicycleFactor)});
  return{xp,levels:Object.fromEntries(Object.entries(xp).map(([k,v])=>[k,levelProgress(v,balance.curveCoefficient).level])),assumptions:e,awardsWritten:0};
}
export const PROGRESSION_SCENARIOS=[
  {name:'Casual · 4 weeks',activities:12,meters:24000,tiles:40,regions:4,finds:8},
  {name:'Regular · 4 weeks',activities:20,meters:100000,tiles:120,regions:12,finds:24},
  {name:'Highly active · 4 weeks',activities:32,meters:400000,tiles:300,regions:30,finds:60},
];
export type SimulatedActivity={id:string;at:number;meters:number;tiles:string[];regions:string[];finds:string[];movement:Movement};
export function simulateHistory(balance:DevBalance,history:SimulatedActivity[]){
  if(history.length>500)throw new Error('Use at most 500 simulated activities');
  const activities=new Map<string,string>(),tiles=new Set<string>(),regions=new Set<string>(),finds=new Set<string>(),steps:{id:string;xp:Record<Attribute,number>}[]=[];let equivalentMeters=0,meters=0,lastAt=-1;
  for(const event of history){
    if(!event||typeof event.id!=='string'||event.id.length>128||!event.id||!Number.isSafeInteger(event.at)||event.at<0||!['foot','bicycle'].includes(event.movement)||!Number.isFinite(event.meters)||event.meters<0||event.meters>1000000)throw new Error('Invalid simulated activity');
    const payload=JSON.stringify(event),recorded=activities.get(event.id);if(recorded){if(recorded!==payload)throw new Error('Activity identity changed');continue;}
    if(event.at<lastAt)throw new Error('Replay activities in time order');lastAt=event.at;activities.set(event.id,payload);
    for(const[key,target]of [['tiles',tiles],['regions',regions],['finds',finds]]as const){if(!Array.isArray(event[key])||event[key].length>10000||!event[key].every(id=>typeof id==='string'&&id.length>0&&id.length<=200))throw new Error('Invalid simulated coverage');event[key].forEach(id=>target.add(id));}
    meters+=event.meters;equivalentMeters+=event.meters*(event.movement==='foot'?balance.footFactor:balance.bicycleFactor);
    steps.push({id:event.id,xp:rewardXp(balance,{tiles:tiles.size,regions:regions.size,finds:finds.size,equivalentMeters})});
  }
  const xp=rewardXp(balance,{tiles:tiles.size,regions:regions.size,finds:finds.size,equivalentMeters});return{xp,levels:Object.fromEntries(Object.entries(xp).map(([k,v])=>[k,levelProgress(v,balance.curveCoefficient).level])),activities:activities.size,meters,steps,awardsWritten:0};
}
export function scenarioHistory(scenario:typeof PROGRESSION_SCENARIOS[number],movement:Movement):SimulatedActivity[]{
  const ids=(count:number,index:number,prefix:string)=>Array.from({length:Math.floor(count*(index+1)/scenario.activities)-Math.floor(count*index/scenario.activities)},(_,offset)=>prefix+(Math.floor(count*index/scenario.activities)+offset));
  return Array.from({length:scenario.activities},(_,i)=>({id:'scenario:'+i,at:i*86400000,meters:scenario.meters/scenario.activities,movement,tiles:ids(scenario.tiles,i,'tile:'),regions:ids(scenario.regions,i,'region:'),finds:ids(scenario.finds,i,'find:')}));
}
