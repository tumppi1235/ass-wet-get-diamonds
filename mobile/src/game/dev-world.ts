import G from './engine';
import {groundDistance} from '../map/geodesy';
import {isPlayablePoint} from '../map/region';
import {applyExplorationFix,endAdventure,requestAdventure} from './adventure';
import {captureAt} from './landmarks';
import {recordArtifactEvidence} from './achievements';
import {newProgression,type Attribute} from './progression';
import type {GameState} from './types';
import type {LocationFix,PlayerPosition} from '../location/tracker';
import {rewardXp} from './reward-rates';
import {DEV_BALANCE,validateBalance} from './dev-balance';
export {DEV_BALANCE,validateBalance,type DevBalance} from './dev-balance';

export type Movement='foot'|'bicycle';
export type DevWorld={version:1;game:GameState;movement:Movement;previous:PlayerPosition|null;anchor:PlayerPosition|null;latestGpsValid:boolean;regions:Record<string,true>;xpRemainder:number;configRevision:string;curveCoefficient?:number;rewardedTiles?:Record<string,boolean>};
export type DevEvent={kind:'start';movement:Movement}|{kind:'stop'}|{kind:'gps';fix:LocationFix}|{kind:'capture'}|{kind:'claim';tile:string;price:number};
export type DevReceipt={accepted:boolean;reason:string;tile?:string;awards:Partial<Record<Attribute,number>>;collected?:string;balanceRevision:string};
export function newDevWorld():DevWorld{const game=G.initial();game.sharedSpawnsOnly=true;game.revealed={};game.progression=newProgression();return{version:1,game,movement:'foot',previous:null,anchor:null,latestGpsValid:false,regions:{},xpRemainder:0,configRevision:DEV_BALANCE.revision};}
/** Pure authoritative event reducer, also used by isolated balancing simulations. */
export function reduceDevEvent(original:DevWorld,event:DevEvent,now:number,balance=DEV_BALANCE,random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/2**32){
  balance=validateBalance(balance);const world:DevWorld=JSON.parse(JSON.stringify(original)),s=world.game;
  const receipt:DevReceipt={accepted:false,reason:'unsupported event',awards:{},balanceRevision:balance.revision};
  if(world.version!==1||!event||!Number.isSafeInteger(now))throw new Error('Unsupported world event');
  world.configRevision=balance.revision;world.curveCoefficient=balance.curveCoefficient;s.progression??=newProgression();
  if(event.kind==='claim')throw new Error('Shared claims require the atomic world store');
  const award=(key:Attribute,value:number)=>{if(!value)return;const total=s.progression!.xp[key]+value;if(!Number.isSafeInteger(total))throw new Error('XP limit reached');s.progression!.xp[key]=total;receipt.awards[key]=(receipt.awards[key]||0)+value;};
  if(event.kind==='start'){
    if(!['foot','bicycle'].includes(event.movement))throw new Error('Choose Foot or Bicycle');
    if(s.adventure?.status==='active'){if(world.movement!==event.movement)throw new Error('Stop the current adventure before changing movement');receipt.reason='already active';}
    else{requestAdventure(s,now);world.movement=event.movement;world.previous=null;world.anchor=null;receipt.reason='adventure started';}receipt.accepted=true;
  }else if(event.kind==='stop'){endAdventure(s,now);world.previous=null;world.anchor=null;receipt.accepted=true;receipt.reason='adventure stopped';}
  else if(event.kind==='gps'){
    const f=event.fix;
    world.latestGpsValid=false;
    if(!f||![f.latitude,f.longitude,f.timestamp].every(Number.isFinite)||Math.abs(f.latitude)>90||Math.abs(f.longitude)>180||f.accuracy==null||!Number.isFinite(f.accuracy)||f.accuracy<0||now-f.timestamp>10000||f.timestamp>now+1000||f.timestamp<=(s.lastGpsTimestamp||0)){receipt.reason='invalid, stale or duplicate GPS';return{world,receipt};}
    const point={...G.xy(f.latitude,f.longitude),latitude:f.latitude,longitude:f.longitude};
    const speed=world.movement==='foot'?balance.footMaxSpeed:balance.bicycleMaxSpeed;
    if(!isPlayablePoint(point)||f.accuracy>25||(f.speed!=null&&(!Number.isFinite(f.speed)||f.speed<0||f.speed>speed))){receipt.reason='GPS outside region, inaccurate or too fast';return{world,receipt};}
    const position:PlayerPosition={...point,accuracy:f.accuracy,timestamp:f.timestamp,inside:true,precise:true};
    let startSegment=!world.previous,distance=0;
    if(world.previous){const seconds=(f.timestamp-world.previous.timestamp)/1000,d=groundDistance(position,world.previous);if(seconds>30){startSegment=true;world.anchor=null;}else if(d>Math.max(35,seconds*speed)){receipt.reason='implausible GPS jump';return{world,receipt};}}
    if(world.anchor){const d=groundDistance(position,world.anchor);if(d>=8){distance=d;world.anchor=position;}}else world.anchor=position;
    world.previous=position;world.latestGpsValid=true;const c=G.cell(position.x,position.y),tile=G.key(c.i,c.j),first=!(world.rewardedTiles?.[tile]||s.visits[tile]>0),active=s.adventure?.status==='active';
    if(!first&&!(s.visits[tile]>0))s.visits[tile]=1;
    applyExplorationFix(s,{position,distance,startSegment,eligible:true,reason:'accurate'});
    // Discovery and both movement categories receive full geographic credit.
    if(first){if(!active){s.visits[tile]=1;s.lastCell=tile;}award('exploration',rewardXp(balance,{tiles:1}).exploration);}
    const region=G.key(Math.floor(position.x/2000),Math.floor(position.y/2000));
    if(!world.regions[region]){world.regions[region]=true;award('agility',rewardXp(balance,{regions:1}).agility);}
    if(active&&distance){world.xpRemainder+=distance*(world.movement==='foot'?balance.footFactor:balance.bicycleFactor);const xp=rewardXp(balance,{equivalentMeters:world.xpRemainder}).endurance;world.xpRemainder-=xp*balance.enduranceMetersPerXp;award('endurance',xp);}
    receipt.accepted=true;receipt.reason='GPS accepted';receipt.tile=tile;
  }else if(event.kind==='capture'){
    const fix=world.previous;
    if(!world.latestGpsValid||!fix||now-fix.timestamp<0||now-fix.timestamp>=15000){receipt.reason='fresh accurate GPS required';return{world,receipt};}
    const result=captureAt(s,fix,true,random);receipt.accepted=result.status!=='unavailable';receipt.reason=result.status;
    if(result.status==='success'){recordArtifactEvidence(s,result.item!,now);award('perception',rewardXp(balance,{finds:1}).perception);receipt.collected=result.item!.id;}
  }
  return{world,receipt};
}
