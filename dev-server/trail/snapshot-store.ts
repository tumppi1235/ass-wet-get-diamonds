import type {D1Database} from '@cloudflare/workers-types';
import {SNAPSHOT_COLUMNS,SNAPSHOT_TABLES,SNAPSHOT_SCHEMA,MAX_SNAPSHOT_BYTES,MAX_SNAPSHOT_ROWS,validateSnapshot,snapshotBytes,type DevSnapshot,type SnapshotRow} from './snapshot-format';
import {requestHash} from './hash';
import {WorldError} from './world-error';
import {DEV_SCOPE,type WorldScope} from './service-scope';
export async function exportDevSnapshot(db:D1Database,now=Date.now(),scope:WorldScope=DEV_SCOPE){
  // One D1 transaction captures every game table. SQL suppresses oversized table results before transfer.
  const sizes=SNAPSHOT_TABLES.map(table=>{const object=SNAPSHOT_COLUMNS[table].map(c=>`'${c}',"${c}"`).join(',');return`COALESCE(SUM(length(CAST(json_object(${object}) AS BLOB))),0)`;});
  const batch=await db.batch([
    ...SNAPSHOT_TABLES.map((table,i)=>db.prepare(`SELECT COUNT(*) AS count,${sizes[i]} AS bytes FROM ${table}`)),
    ...SNAPSHOT_TABLES.map((table,i)=>db.prepare(`SELECT * FROM ${table} WHERE (SELECT ${sizes[i]} FROM ${table})<=? ORDER BY ${SNAPSHOT_COLUMNS[table].map(c=>'"'+c+'"').join(',')} LIMIT ?`).bind(MAX_SNAPSHOT_BYTES,MAX_SNAPSHOT_ROWS+1)),
    db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND substr(name,1,6)='trail_' ORDER BY name"),
  ]);
  const actual=batch[SNAPSHOT_TABLES.length*2].results.map(r=>(r as {name:string}).name);if(actual.length!==SNAPSHOT_TABLES.length||SNAPSHOT_TABLES.some(t=>!actual.includes(t)))throw new WorldError(503,'Database schema differs from this exporter; use the matching release before taking a complete snapshot');
  for(let i=0;i<SNAPSHOT_TABLES.length;i++){const meta=batch[i].results[0] as {count:number;bytes:number},rows=batch[i+SNAPSHOT_TABLES.length].results;if(!meta||meta.count>MAX_SNAPSHOT_ROWS||meta.bytes>MAX_SNAPSHOT_BYTES)throw new WorldError(413,'Dev snapshot is too large for this download. Use a provider-level backup; no partial snapshot was exported.');if(rows.length!==meta.count)throw new WorldError(503,'Could not capture a complete consistent snapshot');}
  const tables=Object.fromEntries(SNAPSHOT_TABLES.map((table,i)=>[table,batch[i+SNAPSHOT_TABLES.length].results as SnapshotRow[]]))as DevSnapshot['tables'];
  const payload={format:scope.environment==='development'?'trail-relics-shared-dev' as const:'trail-relics-shared-world' as const,version:1 as const,schema:SNAPSHOT_SCHEMA,projectId:scope.projectId,environment:scope.environment,capturedAt:now,tables},result={...payload,digest:await requestHash(payload)};
  if(snapshotBytes(result)>MAX_SNAPSHOT_BYTES)throw new WorldError(413,'Combined dev snapshot exceeds the download limit; no partial backup was exported.');
  return validateSnapshot(result,scope);
}
