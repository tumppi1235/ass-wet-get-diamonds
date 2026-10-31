import type {Rarity,Relic} from './types';
// The contract is shared with future world services; it does not make local claims authoritative.
export type ArtifactSpawn={
  version:1; id:string; tileId:string; artifactType:string; rarity:Rarity;
  kind:'persistent'|'dynamic'|'personal-first-visit';
  position:{latitude:number;longitude:number};
  createdAt:number|null; expiresAt:number|null;
  claimPolicy:'once-per-player'|'once-worldwide';
  ownerId?:string;
  origin:'legacy'|'world'|'personal';
};
// eslint-disable-next-line @typescript-eslint/no-require-imports -- The existing cross-client geographic engine is CommonJS.
const grid:Pick<import('./types').Engine,'xy'|'geo'|'cell'|'key'>=require('../../../public/engine.js');
const identifier=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=200;
const timestamp=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
export function validateSpawn(value:unknown):ArtifactSpawn{
  if(!value||typeof value!=='object')throw new Error('Spawn must be an object');
  const s=value as ArtifactSpawn;
  if(s.version!==1||!identifier(s.id)||!identifier(s.artifactType)||!['Common','Rare','Legendary'].includes(s.rarity))throw new Error('Invalid spawn identity, version, type or rarity');
  if(!['persistent','dynamic','personal-first-visit'].includes(s.kind)||!['once-per-player','once-worldwide'].includes(s.claimPolicy)||!['legacy','world','personal'].includes(s.origin))throw new Error('Invalid spawn kind, origin or claim policy');
  const p=s.position;
  if(!p||!Number.isFinite(p.latitude)||Math.abs(p.latitude)>90||!Number.isFinite(p.longitude)||Math.abs(p.longitude)>180)throw new Error('Invalid spawn coordinates');
  const point=grid.xy(p.latitude,p.longitude),c=grid.cell(point.x,point.y);
  if(s.tileId!==grid.key(c.i,c.j))throw new Error('Spawn coordinates and tile disagree');
  if(!(timestamp(s.createdAt)||(s.createdAt===null&&s.origin==='legacy')))throw new Error('New spawns require a creation timestamp');
  if(s.expiresAt!==null&&(!timestamp(s.expiresAt)||s.createdAt===null||s.expiresAt<=s.createdAt))throw new Error('Invalid spawn expiry');
  if(s.kind==='dynamic'&&s.expiresAt===null)throw new Error('Dynamic spawns require an expiry');
  if(s.kind==='personal-first-visit'&&(s.origin!=='personal'||!identifier(s.ownerId)||s.claimPolicy!=='once-per-player'))throw new Error('Personal spawns require an owner and personal claim policy');
  if(s.kind!=='personal-first-visit'&&(s.ownerId!==undefined||s.origin==='personal'))throw new Error('World/legacy spawns cannot have a personal owner');
  return {...s,position:{...s.position}};
}
export function legacySpawn(relic:Relic):ArtifactSpawn{
  const p=relic.latitude!=null&&relic.longitude!=null?{latitude:relic.latitude,longitude:relic.longitude}:(()=>{const g=grid.geo((relic.i+.5)*250,(relic.j+.5)*250);return{latitude:g.lat,longitude:g.lon};})();
  // Spawn identity is independent of tile identity. Old saves keep their original relic/tile IDs.
  return validateSpawn({version:1,id:relic.landmarkId?'landmark:'+relic.landmarkId:'legacy-tile:'+relic.id,tileId:relic.id,artifactType:relic.name,rarity:relic.rarity,kind:'persistent',position:p,createdAt:null,expiresAt:null,claimPolicy:'once-per-player',origin:'legacy'});
}
export function spawnVisibleTo(spawn:ArtifactSpawn,playerId:string,now:number){
  return Number.isFinite(now)&&(spawn.createdAt===null||now>=spawn.createdAt)&&(spawn.expiresAt===null||now<spawn.expiresAt)&&(spawn.kind!=='personal-first-visit'||spawn.ownerId===playerId);
}
