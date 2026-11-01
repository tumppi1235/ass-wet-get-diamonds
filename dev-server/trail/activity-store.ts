import type {D1Database} from '@cloudflare/workers-types';
import type {Movement} from '../../mobile/src/game/dev-world';
import {WorldError} from './world-error';
import type {WorldRegions} from '../../mobile/src/game/world-regions';
export type ActivitySummary={id:string;source:'browser-gps';movement:Movement;actualStartedAt:number;eligibleStartedAt:number;endedAt:number;meters:number;observedSeconds:number;bossTileVisited:boolean;uniqueTiles:number;samples:number};
/** Only immutable server-derived receipts qualify; client totals, legacy saves and unknown providers do not. */
export async function summarizeActivity(db:D1Database,owner:string,id:string,bossTile:string,windowStart:number,deadline:number,now=Date.now()):Promise<ActivitySummary>{
  if(typeof id!=='string'||id.length>160||!Number.isSafeInteger(windowStart)||!Number.isSafeInteger(deadline)||deadline<=windowStart)throw new WorldError(400,'Invalid activity or encounter window');
  const row=await db.prepare(`SELECT
    MIN(json_extract(result,'$.activity.startedAt')) AS startedAt,
    MIN(CASE WHEN kind='stop' AND json_extract(result,'$.activity.phase')='stop' THEN activity_at END) AS endedAt,
    MIN(json_extract(result,'$.activity.movement')) AS movement,
    MAX(json_extract(result,'$.activity.movement')) AS lastMovement,
    COALESCE(SUM(CASE WHEN kind='gps' AND json_extract(result,'$.activity.distanceStartedAt')>=? THEN json_extract(result,'$.activity.meters') ELSE 0 END),0) AS meters,
    COALESCE(SUM(CASE WHEN kind='gps' AND activity_at-json_extract(result,'$.activity.observedSeconds')*1000>=? THEN json_extract(result,'$.activity.observedSeconds') ELSE 0 END),0) AS seconds,
    MAX(CASE WHEN kind='gps' AND json_extract(result,'$.tile')=? THEN 1 ELSE 0 END) AS visited,
    COUNT(DISTINCT CASE WHEN kind='gps' THEN json_extract(result,'$.tile') ELSE NULL END) AS uniqueTiles,
    SUM(CASE WHEN kind='gps' THEN 1 ELSE 0 END) AS samples
    FROM trail_events WHERE owner=? AND activity_id=? AND activity_at>=? AND activity_at<=?
    AND json_extract(result,'$.accepted')=1 AND json_extract(result,'$.activity.source')='browser-gps'`).bind(windowStart,windowStart,bossTile,owner,id,windowStart,Math.min(deadline,now)).first<{startedAt:number|null;endedAt:number|null;movement:string|null;lastMovement:string|null;meters:number;seconds:number;visited:number|null;samples:number|null;uniqueTiles:number}>();
  if(!row||row.startedAt===null||row.endedAt===null||!row.samples||!['foot','bicycle'].includes(row.movement||'')||row.movement!==row.lastMovement)throw new WorldError(400,'Complete one recorded Foot or Bicycle activity within the encounter window');
  if(!Number.isFinite(row.meters)||row.meters<0||!Number.isFinite(row.seconds)||row.seconds<0||row.endedAt<windowStart)throw new WorldError(400,'Activity evidence is inconsistent');
  return{id,source:'browser-gps',movement:row.movement as Movement,actualStartedAt:row.startedAt,eligibleStartedAt:Math.max(windowStart,row.startedAt),endedAt:row.endedAt,meters:row.meters,observedSeconds:row.seconds,bossTileVisited:!!row.visited,uniqueTiles:row.uniqueTiles,samples:row.samples};
}
export async function listCompletedActivities(db:D1Database,owner:string,now=Date.now()){
  const rows=await db.prepare("SELECT activity_id AS id,activity_at AS endedAt,json_extract(result,'$.activity.startedAt') AS startedAt,json_extract(result,'$.activity.movement') AS movement FROM trail_events WHERE owner=? AND kind='stop' AND activity_at>=? AND activity_at<=? AND activity_id IS NOT NULL AND json_extract(result,'$.activity.source')='browser-gps' ORDER BY activity_at DESC LIMIT 30").bind(owner,now-7*86400000,now).all<{id:string;endedAt:number;startedAt:number;movement:Movement}>();return{activities:rows.results};
}
/** Current configured closure intervals cannot force a player to visit a blocked boss path. */
export async function allowedBossVisit(db:D1Database,owner:string,activityId:string,boss:{tileId:string;latitude:number;longitude:number},start:number,end:number,regions:WorldRegions){
  const closures=regions.regions.filter(r=>r.blocked&&boss.latitude>=r.south&&boss.latitude<=r.north&&boss.longitude>=r.west&&boss.longitude<=r.east);let cursor=start;
  for(let attempt=0;attempt<=closures.length&&cursor<=end;attempt++){
    const row=await db.prepare("SELECT MIN(activity_at) AS at FROM trail_events WHERE owner=? AND activity_id=? AND activity_at>=? AND activity_at<=? AND kind='gps' AND json_extract(result,'$.tile')=? AND json_extract(result,'$.accepted')=1 AND json_extract(result,'$.activity.source')='browser-gps'").bind(owner,activityId,cursor,end,boss.tileId).first<{at:number|null}>();
    if(row?.at==null)return null;const blocking=closures.filter(r=>row.at!>=r.startsAt&&row.at!<r.endsAt);if(!blocking.length)return row.at;cursor=Math.max(...blocking.map(r=>r.endsAt));
  }return null;
}
