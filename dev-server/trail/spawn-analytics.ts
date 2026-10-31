import type {D1Database} from '@cloudflare/workers-types';
import type {Bounds} from './spawn-store';
import {WorldError} from './world-error';
export type AppearanceRow={spawnRevision:string;rarity:string;kind:string;instances:number;active:number};
export type RewardRow={spawnRevision:string;balanceRevision:string;rarity:string;claims:number;perceptionXp:number;missingReceipts:number};
export async function spawnAnalytics(db:D1Database,b:Bounds,days=7,now=Date.now()){
  if(!Number.isInteger(days)||days<1||days>31)throw new WorldError(400,'Choose 1–31 days');const since=Math.max(0,now-days*86400000),args=[b.south,b.north,b.west,b.east,since,now];
  const where='s.latitude>=? AND s.latitude<=? AND s.longitude>=? AND s.longitude<=? AND s.starts_at>=? AND s.starts_at<=?',revision="CASE WHEN substr(s.id,1,6)='world:' THEN substr(s.id,7,instr(substr(s.id,7),':')-1) ELSE 'personal-or-manual' END";
  const [appearances,rewards]=await db.batch([
    db.prepare(`SELECT ${revision} AS spawnRevision,json_extract(s.document,'$.rarity') AS rarity,json_extract(s.document,'$.kind') AS kind,COUNT(*) AS instances,SUM(CASE WHEN s.removed_at IS NULL AND (s.expires_at IS NULL OR s.expires_at>?) THEN 1 ELSE 0 END) AS active FROM trail_spawns s WHERE ${where} GROUP BY spawnRevision,rarity,kind ORDER BY spawnRevision,rarity,kind LIMIT 101`).bind(now,...args),
    db.prepare(`SELECT ${revision} AS spawnRevision,COALESCE(json_extract(e.result,'$.balanceRevision'),'unknown') AS balanceRevision,json_extract(s.document,'$.rarity') AS rarity,COUNT(*) AS claims,COALESCE(SUM(json_extract(e.result,'$.awards.perception')),0) AS perceptionXp,SUM(CASE WHEN e.id IS NULL THEN 1 ELSE 0 END) AS missingReceipts FROM trail_spawn_claims c JOIN trail_spawns s ON s.id=c.spawn LEFT JOIN trail_events e ON e.owner=c.owner AND e.id=c.event WHERE ${where} AND c.created_at<=? GROUP BY spawnRevision,balanceRevision,rarity ORDER BY spawnRevision,balanceRevision,rarity LIMIT 101`).bind(...args,now),
  ]);
  return{since,until:now,bounds:b,days,durationDays:(now-since)/86400000,appearances:appearances.results.slice(0,100)as AppearanceRow[],rewards:rewards.results.slice(0,100)as RewardRow[],truncated:appearances.results.length>100||rewards.results.length>100,scope:'recorded-appearance-cohort',writes:0};
}
