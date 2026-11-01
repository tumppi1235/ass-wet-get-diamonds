import type {D1Database} from '@cloudflare/workers-types';
import {WorldError} from './world-error';
import {loadMaintenance} from './maintenance-store';
import {exportDevSnapshot} from './snapshot-store';
import {SNAPSHOT_COLUMNS,SNAPSHOT_TABLES,SNAPSHOT_SCHEMA,validateSnapshot,type DevSnapshot,type SnapshotTable} from './snapshot-format';

import {INITIAL_GENERATION,initialGeneration} from '../../mobile/src/game/recovery';
import {DEV_SCOPE,serviceScope,type WorldScope} from './service-scope';
export {INITIAL_GENERATION};
export type RecoveryBindings={TRAIL_ENV?:string;TRAIL_PROJECT_ID?:string;TRAIL_RECOVERY_GENERATION?:string;TRAIL_RECOVERY_BASELINE_SHA256?:string;TRAIL_RECOVERY_DRAINED_GENERATION?:string};
export class RecoveryError extends WorldError{constructor(){super(503,'Shared world recovery needs administrator review. Your saved actions are preserved.');}}
export async function recoveryStatus(db:D1Database,env:RecoveryBindings){
  const scope=env.TRAIL_ENV?serviceScope(env):DEV_SCOPE,base=initialGeneration(scope.environment),generation=env.TRAIL_RECOVERY_GENERATION??base;
  if(!/^[a-zA-Z0-9_-]{8,100}$/.test(generation))throw new RecoveryError();
  const row=await db.prepare("SELECT revision,document FROM trail_configs WHERE id='recovery-generation'").first<{revision:number;document:string}>();
  let stored:{generation?:string;baselineDigest?:string}={generation:base};
  if(row)try{stored=JSON.parse(row.document);}catch{stored={};}
  const initial=generation===base&&!env.TRAIL_RECOVERY_BASELINE_SHA256;
  const ready=(!row||Number.isSafeInteger(row.revision)&&row.revision>=0)&&stored?.generation===generation&&(initial||!!env.TRAIL_RECOVERY_BASELINE_SHA256&&/^[a-f0-9]{64}$/.test(env.TRAIL_RECOVERY_BASELINE_SHA256)&&stored.baselineDigest===env.TRAIL_RECOVERY_BASELINE_SHA256);
  return{generation,ready,revision:row?.revision??0,storedGeneration:stored?.generation??null};
}
// Operational controls/fence bookkeeping are not gameplay. All other rows must match exactly.
function filter(table:SnapshotTable){return table==='trail_configs'?" WHERE id NOT IN ('maintenance','recovery-generation')":table==='trail_audit'?" WHERE action NOT IN ('maintenance.pause','maintenance.resume','recovery.seal')":'';}
function relevant(snapshot:DevSnapshot,table:SnapshotTable){return snapshot.tables[table].filter(row=>table==='trail_configs'?!['maintenance','recovery-generation'].includes(String(row.id)):table==='trail_audit'?!['maintenance.pause','maintenance.resume','recovery.seal'].includes(String(row.action)):true);}
export async function compareRecovery(before:unknown,after:unknown,scope:WorldScope=DEV_SCOPE){
  const a=await validateSnapshot(before,scope),b=await validateSnapshot(after,scope);
  if(a.schema!==SNAPSHOT_SCHEMA||b.schema!==SNAPSHOT_SCHEMA)throw new WorldError(400,'Use complete current-schema recovery snapshots');
  const changed=SNAPSHOT_TABLES.filter(table=>table!=='trail_integrity'&&JSON.stringify(relevant(a,table).map(row=>SNAPSHOT_COLUMNS[table].map(c=>row[c])).map(row=>JSON.stringify(row)).sort())!==JSON.stringify(relevant(b,table).map(row=>SNAPSHOT_COLUMNS[table].map(c=>row[c])).map(row=>JSON.stringify(row)).sort()));
  return{matches:changed.length===0,changedTables:changed,baselineDigest:a.digest,candidateDigest:b.digest};
}
/** No restore operation. Only seals an already reconciled, paused world against an OUTSIDE-DB baseline. */
export async function sealRecovery(db:D1Database,env:RecoveryBindings,actor:string,input:{confirmed?:unknown;baseline?:unknown},now=Date.now()){
  const current=await recoveryStatus(db,env),maintenance=await loadMaintenance(db),scope=env.TRAIL_ENV?serviceScope(env):DEV_SCOPE;
  if(input?.confirmed!==true||!maintenance.paused)throw new WorldError(400,'Confirm reconciliation while shared world is paused');
  if(current.generation===initialGeneration(scope.environment)||env.TRAIL_RECOVERY_DRAINED_GENERATION!==current.generation||!env.TRAIL_RECOVERY_BASELINE_SHA256)throw new WorldError(409,'A new external recovery generation, trusted baseline digest and provider drain acknowledgement are required');
  if(!current.ready&&current.storedGeneration===current.generation)throw new WorldError(409,'Do not reuse a recovery generation for another baseline');
  let baseline:DevSnapshot;try{baseline=await validateSnapshot(input.baseline,scope);}catch{throw new WorldError(400,'Invalid private recovery baseline');}
  if(baseline.digest!==env.TRAIL_RECOVERY_BASELINE_SHA256)throw new WorldError(409,'Snapshot does not match the baseline pinned outside the database');
  const frozen=baseline.tables.trail_configs.find(row=>row.id==='maintenance');
  if(!frozen||JSON.parse(String(frozen.document)).paused!==true)throw new WorldError(409,'The trusted baseline must have been captured while paused after provider drain');
  const report=await compareRecovery(baseline,await exportDevSnapshot(db,now,scope),scope);
  if(!report.matches)throw new WorldError(409,'Complete gameplay ledgers differ; reconcile offline before reopening. Changed tables: '+report.changedTables.join(', '));
  if(current.ready)return{...current,replayed:true};
  const statements=SNAPSHOT_TABLES.filter(table=>table!=='trail_integrity').map(table=>{
    const columns=SNAPSHOT_COLUMNS[table].map(c=>'"'+c+'"').join(','),wanted=SNAPSHOT_COLUMNS[table].map(c=>`json_extract(value,'$.${c}')`).join(','),actual=`SELECT ${columns} FROM ${table}${filter(table)}`,expected=`SELECT ${wanted} FROM json_each(?)`,rows=JSON.stringify(relevant(baseline,table));
    return db.prepare("INSERT INTO trail_integrity(id,valid) VALUES(?,CASE WHEN NOT EXISTS("+actual+' EXCEPT '+expected+') AND NOT EXISTS('+expected+' EXCEPT '+actual+") THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid").bind('recovery-check:'+table,rows,rows);
  });
  statements.push(db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('recovery-pause-cas',CASE WHEN (SELECT revision FROM trail_configs WHERE id='maintenance')=? AND (SELECT json_extract(document,'$.paused') FROM trail_configs WHERE id='maintenance')=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid").bind(maintenance.revision));
  statements.push(db.prepare("INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES('recovery-generation',?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,document=excluded.document,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE trail_configs.revision=?").bind(current.revision+1,JSON.stringify({generation:current.generation,baselineDigest:baseline.digest,verifiedAt:now}),actor,now,current.revision));
  statements.push(db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('recovery-seal-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid"));
  statements.push(db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind('recovery:'+crypto.randomUUID(),actor,'recovery.seal',current.generation,JSON.stringify({baselineDigest:baseline.digest,schema:baseline.schema}),now));
  try{await db.batch(statements);}catch{if((await recoveryStatus(db,env)).ready)return{...(await recoveryStatus(db,env)),replayed:true};throw new WorldError(409,'World or maintenance changed during reconciliation; keep paused and review again');}
  return{...(await recoveryStatus(db,env)),replayed:false};
}
