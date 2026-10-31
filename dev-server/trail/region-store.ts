import type {D1Database} from '@cloudflare/workers-types';
import {WORLD_REGIONS,validateRegions,type WorldRegions} from '../../mobile/src/game/world-regions';
import G from '../../mobile/src/game/engine';
import type {Bounds} from './spawn-store';
import {WorldError} from './world-error';
export async function loadRegions(db:D1Database){const row=await db.prepare("SELECT document FROM trail_configs WHERE id='world-regions'").first<{document:string}>();return validateRegions(row?JSON.parse(row.document):WORLD_REGIONS);}
export async function saveRegions(db:D1Database,actor:string,input:WorldRegions,expected:string){
  const before=await loadRegions(db);if(before.revision!==expected)throw new WorldError(409,'Regions changed; reload first');
  const after=validateRegions({...input,revision:'regions-'+crypto.randomUUID()}),now=Date.now();
  try{await db.batch([
    db.prepare("INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES('world-regions',1,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=trail_configs.revision+1,document=excluded.document,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE json_extract(trail_configs.document,'$.revision')=?").bind(JSON.stringify(after),actor,now,expected),
    db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('region-config-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid"),
    db.prepare('INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES(?,1,?,?,?)').bind(after.revision,JSON.stringify(after),actor,now),
    db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,'regions.configure','world-regions',JSON.stringify({before,after}),now),
  ]);}catch{throw new WorldError(409,'Region configuration changed during save; reload first');}return{configuration:after};
}
export async function queryDensity(db:D1Database,b:Bounds,excludeOwner=''){
  const a=G.xy(b.south,b.west),z=G.xy(b.north,b.east),min=G.cell(a.x,a.y),max=G.cell(z.x,z.y);
  const result=await db.prepare('SELECT tile,COUNT(*) AS players,MIN(first_at) AS firstAt,MAX(last_at) AS lastAt FROM trail_visits WHERE cell_i>=? AND cell_i<=? AND cell_j>=? AND cell_j<=? AND owner<>? GROUP BY tile ORDER BY players DESC,tile LIMIT 501').bind(min.i,max.i,min.j,max.j,excludeOwner).all<{tile:string;players:number;firstAt:number;lastAt:number}>();
  const density=result.results.slice(0,500);return{density,truncated:result.results.length>500,geojson:{type:'FeatureCollection' as const,features:density.map(row=>{const[i,j]=row.tile.split(',').map(Number),corners=[[i,j],[i+1,j],[i+1,j+1],[i,j+1],[i,j]].map(([x,y])=>{const p=G.geo(x*250,y*250);return[p.lon,p.lat];});return{type:'Feature' as const,properties:{tile:row.tile,players:row.players},geometry:{type:'Polygon' as const,coordinates:[corners]}};})}};
}
