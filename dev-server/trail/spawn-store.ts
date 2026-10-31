import type {D1Database} from '@cloudflare/workers-types';
import {LANDMARKS} from '../../mobile/src/game/landmarks';
import {generateWorldSpawn,firstVisitSpawn,SPAWN_RULES,spawnRelic,detectable,validateSpawnRules,type SpawnRules} from '../../mobile/src/game/world-spawns';
import {spawnVisibleTo,validateSpawn,type ArtifactSpawn} from '../../mobile/src/game/spawns';
import type {DevWorld} from '../../mobile/src/game/dev-world';
import {isPlayablePoint} from '../../mobile/src/map/region';
import G from '../../mobile/src/game/engine';
import {WorldError} from './world-error';
import {loadRegions} from './region-store';
import {rulesForPlace,blockedAt} from '../../mobile/src/game/world-regions';

export async function loadSpawnRules(db:D1Database){const row=await db.prepare("SELECT document FROM trail_configs WHERE id='spawns'").first<{document:string}>();return row?JSON.parse(row.document)as SpawnRules:SPAWN_RULES;}
export async function saveSpawnRules(db:D1Database,actor:string,input:SpawnRules,expected:string){
  const before=await loadSpawnRules(db);if(expected!==before.revision)throw new WorldError(409,'Spawn rules changed; reload first');
  const now=Date.now(),after=validateSpawnRules({...input,revision:'spawn-'+crypto.randomUUID()});
  try{await db.batch([
    db.prepare("INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES('spawns',1,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=trail_configs.revision+1,document=excluded.document,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE json_extract(trail_configs.document,'$.revision')=?").bind(JSON.stringify(after),actor,now,expected),
    db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('spawn-config-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid"),
    db.prepare('INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES(?,1,?,?,?)').bind(after.revision,JSON.stringify(after),actor,now),
    db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,'spawns.configure','spawns',JSON.stringify({before,after}),now),
  ]);}catch{throw new WorldError(409,'Spawn configuration changed during save; reload first');}return{rules:after};
}
export type Bounds={south:number;north:number;west:number;east:number};
export function readBounds(params:URLSearchParams):Bounds{
  const values=['south','north','west','east'].map(k=>params.has(k)?Number(params.get(k)):NaN),[south,north,west,east]=values;
  if(!values.every(Number.isFinite)||south<59||north>71||west<19||east>32||south>=north||west>=east||north-south>1||east-west>2)throw new WorldError(400,'Use a Finland map area up to 1° high and 2° wide');
  return{south,north,west,east};
}
export function nearbyBounds(latitude:number,longitude:number):Bounds{return{south:Math.max(59,latitude-.035),north:Math.min(71,latitude+.035),west:Math.max(19,longitude-.07),east:Math.min(32,longitude+.07)};}
const inside=(p:{latitude:number;longitude:number},b:Bounds)=>p.latitude>=b.south&&p.latitude<=b.north&&p.longitude>=b.west&&p.longitude<=b.east;
export function insertSpawn(db:D1Database,spawn:ArtifactSpawn){
  return db.prepare('INSERT INTO trail_spawns(id,tile,document,starts_at,expires_at,revision,latitude,longitude,owner) VALUES(?,?,?,?,?,1,?,?,?) ON CONFLICT(id) DO NOTHING').bind(spawn.id,spawn.tileId,JSON.stringify(spawn),spawn.createdAt,spawn.expiresAt,spawn.position.latitude,spawn.position.longitude,spawn.ownerId??null);
}
export async function ensureWorldSpawns(db:D1Database,bounds:Bounds,now:number,rules:SpawnRules){
  // Only reviewed path-side catalog coordinates; no random building/sea centres.
  const places=LANDMARKS.filter(p=>p.latitude!=null&&p.longitude!=null&&p.source&&inside(p as {latitude:number;longitude:number},bounds));
  const recorded=await db.prepare('SELECT id FROM trail_spawns WHERE latitude>=? AND latitude<=? AND longitude>=? AND longitude<=? AND starts_at<=? AND (expires_at IS NULL OR expires_at>?)').bind(bounds.south,bounds.north,bounds.west,bounds.east,now,now).all<{id:string}>();
  const regions=await loadRegions(db),known=new Set(recorded.results.map(r=>r.id)),missing=places.flatMap(p=>{const adjusted=rulesForPlace(p,now,rules,regions);return adjusted?[generateWorldSpawn(p,now,adjusted)]:[];}).filter(s=>!known.has(s.id));
  for(let offset=0;offset<missing.length;offset+=50)await db.batch(missing.slice(offset,offset+50).map(s=>insertSpawn(db,s)));
}
export async function querySpawns(db:D1Database,owner:string,b:Bounds,now=Date.now(),after='',limit=100,admin=false){
  if(!Number.isInteger(limit)||limit<1||limit>100||after.length>200)throw new WorldError(400,'Invalid spawn page');
  const rules=await loadSpawnRules(db);await ensureWorldSpawns(db,b,now,rules);
  const rows=await db.prepare('SELECT s.document,(SELECT COUNT(*) FROM trail_visits v WHERE v.tile=s.tile) AS visitors FROM trail_spawns s WHERE s.latitude>=? AND s.latitude<=? AND s.longitude>=? AND s.longitude<=? AND s.id>? AND s.removed_at IS NULL AND s.starts_at<=? AND (s.expires_at IS NULL OR s.expires_at>?) AND (s.owner IS NULL OR s.owner=?) AND (?=1 OR NOT EXISTS(SELECT 1 FROM trail_spawn_claims c WHERE c.spawn=s.id AND c.owner=?)) ORDER BY s.id LIMIT ?').bind(b.south,b.north,b.west,b.east,after,now,now,owner,admin?1:0,owner,limit+1).all<{document:string;visitors:number}>();
  const regions=await loadRegions(db),page=rows.results.slice(0,limit);return{spawns:page.map(row=>{const spawn=JSON.parse(row.document)as ArtifactSpawn;return{spawn,visitors:row.visitors,blocked:blockedAt(spawn.position,now,regions)};}),next:rows.results.length>limit?JSON.parse(page[page.length-1].document).id as string:null,rulesRevision:rules.revision,admin};
}
export async function hydrateSpawns(db:D1Database,owner:string,world:DevWorld,now:number){
  world.game.sharedSpawnsOnly=true;world.game.revealed={};const p=world.previous;if(!p)return world;
  const cell=G.cell(p.x,p.y),ownTile=G.key(cell.i,cell.j);
  const rules=await loadSpawnRules(db),b=nearbyBounds(p.latitude,p.longitude);await ensureWorldSpawns(db,b,now,rules);
  const rows=await db.prepare('SELECT s.document,(SELECT COUNT(*) FROM trail_visits v WHERE v.tile=s.tile) AS visitors FROM trail_spawns s WHERE s.latitude>=? AND s.latitude<=? AND s.longitude>=? AND s.longitude<=? AND s.removed_at IS NULL AND s.starts_at<=? AND (s.expires_at IS NULL OR s.expires_at>?) AND (s.owner IS NULL OR s.owner=?) AND NOT EXISTS(SELECT 1 FROM trail_spawn_claims c WHERE c.spawn=s.id AND c.owner=?) ORDER BY CASE WHEN s.tile=? THEN 0 ELSE 1 END,s.id LIMIT 300').bind(b.south,b.north,b.west,b.east,now,now,owner,owner,ownTile).all<{document:string;visitors:number}>();
  const regions=await loadRegions(db);world.spawnContextRevision=regions.revision;
  for(const row of rows.results){const spawn=JSON.parse(row.document)as ArtifactSpawn;if(!blockedAt(spawn.position,now,regions)&&spawnVisibleTo(spawn,owner,now)&&(spawn.tileId===ownTile||detectable(spawn,p,row.visitors,rules)))world.game.revealed[spawn.id]=spawnRelic(spawn,LANDMARKS.find(r=>r.id===spawn.tileId)?.landmark);}
  return world;
}
export async function firstVisitStatement(db:D1Database,owner:string,tile:string,now:number){
  if(await db.prepare('SELECT 1 FROM trail_visits WHERE tile=? AND owner=?').bind(tile,owner).first())return null;
  const place=LANDMARKS.find(r=>r.id===tile);if(!place)return null;
  const adjusted=rulesForPlace(place,now,await loadSpawnRules(db),await loadRegions(db));if(!adjusted)return null;
  const spawn=firstVisitSpawn(place,owner,now,adjusted);return spawn?insertSpawn(db,spawn):null;
}
export async function placeSpawn(db:D1Database,actor:string,input:unknown,now=Date.now()){
  const spawn=validateSpawn(input);
  if(spawn.origin!=='world'||spawn.ownerId||spawn.claimPolicy!=='once-per-player'||spawn.kind==='personal-first-visit'||!isPlayablePoint(G.xy(spawn.position.latitude,spawn.position.longitude))||spawn.createdAt!==now)throw new WorldError(400,'Place a current, personal-claim world spawn inside Finland');
  if(blockedAt(spawn.position,now,await loadRegions(db)))throw new WorldError(400,'This region is blocked for placement and collection');
  // Manual positions are explicit admin test placements; accessibility must be reviewed.
  await db.batch([insertSpawn(db,spawn),db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,'spawn.place',spawn.id,JSON.stringify({after:spawn,accessibility:'admin-review-required'}),now)]);return spawn;
}
export async function removeSpawn(db:D1Database,actor:string,id:string,now=Date.now()){
  const row=await db.prepare('SELECT document,removed_at FROM trail_spawns WHERE id=?').bind(id).first<{document:string;removed_at:number|null}>();
  if(!row)throw new WorldError(404,'Spawn not found');if(row.removed_at!==null)return{removed:true};
  await db.batch([db.prepare('UPDATE trail_spawns SET removed_at=?,revision=revision+1 WHERE id=? AND removed_at IS NULL').bind(now,id),db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,'spawn.remove',id,JSON.stringify({before:JSON.parse(row.document)}),now)]);return{removed:true};
}
