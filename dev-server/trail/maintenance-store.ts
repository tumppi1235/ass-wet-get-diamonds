import type {D1Database,D1PreparedStatement,D1Result} from '@cloudflare/workers-types';
import {WorldError} from './world-error';
import {requestHash} from './hash';
import {INITIAL_GENERATION} from '../../mobile/src/game/recovery';
export type MaintenanceState={revision:number;paused:boolean;reason:'normal'|'planned-update'|'recovery-check';changedAt:number};
type MaintenanceAction={id:string;revision:number;paused:boolean;reason:MaintenanceState['reason'];confirmed:boolean};
const DEFAULT:MaintenanceState={revision:0,paused:false,reason:'normal',changedAt:0};
export class MaintenanceError extends WorldError{constructor(){super(503,'Shared world maintenance is in progress or changed during this request. Your pending action is preserved; retry after the service reopens.');}}
export async function loadMaintenance(db:D1Database):Promise<MaintenanceState>{
  const row=await db.prepare("SELECT revision,document FROM trail_configs WHERE id='maintenance'").first<{revision:number;document:string}>();if(!row)return{...DEFAULT};
  let state:MaintenanceState;try{state={...JSON.parse(row.document),revision:row.revision};}catch{throw new MaintenanceError();}
  if(!Number.isSafeInteger(state.revision)||state.revision<0||typeof state.paused!=='boolean'||!['normal','planned-update','recovery-check'].includes(state.reason)||!Number.isSafeInteger(state.changedAt)||state.changedAt<0||(state.paused?state.reason==='normal':state.reason!=='normal'))throw new MaintenanceError();
  return{revision:state.revision,paused:state.paused,reason:state.reason,changedAt:state.changedAt};
}
export async function saveMaintenance(db:D1Database,actor:string,input:MaintenanceAction,now=Date.now()){
  if(!input||typeof input.id!=='string'||!/^[a-zA-Z0-9:_-]{8,100}$/.test(input.id)||!Number.isSafeInteger(input.revision)||input.revision<0||typeof input.paused!=='boolean'||input.confirmed!==true||!['normal','planned-update','recovery-check'].includes(input.reason)||(input.paused?input.reason==='normal':input.reason!=='normal'))throw new WorldError(400,'Confirm a valid pause/resume action, reason and current revision');
  const hash=await requestHash({revision:input.revision,paused:input.paused,reason:input.reason}),auditId='maintenance:'+await requestHash({actor,id:input.id});
  const replay=async()=>{const row=await db.prepare('SELECT details FROM trail_audit WHERE id=?').bind(auditId).first<{details:string}>();if(!row)return null;const details=JSON.parse(row.details);if(details.requestHash!==hash)throw new WorldError(409,'Maintenance action identity changed');return{maintenance:await loadMaintenance(db),appliedRevision:details.after.revision as number,replayed:true};};
  const existing=await replay();if(existing)return existing;
  const before=await loadMaintenance(db);if(before.revision!==input.revision)throw new WorldError(409,'Maintenance state changed; reload before continuing');if(before.paused===input.paused)throw new WorldError(409,'Shared world is already '+(before.paused?'paused':'open'));
  const after:MaintenanceState={revision:before.revision+1,paused:input.paused,reason:input.reason,changedAt:now};
  try{await db.batch([
    db.prepare("INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES('maintenance',?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,document=excluded.document,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE trail_configs.revision=?").bind(after.revision,JSON.stringify(after),actor,now,before.revision),
    db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('maintenance-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid"),
    db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind(auditId,actor,after.paused?'maintenance.pause':'maintenance.resume','shared-dev',JSON.stringify({requestHash:hash,before,after}),now),
  ]);}catch{const raced=await replay();if(raced)return raced;throw new WorldError(409,'Maintenance changed during save; reload before continuing');}
  return{maintenance:after,appliedRevision:after.revision,replayed:false};
}

function readOnlyStatement(query:string){
  // Trusted application SQL only, not an arbitrary-SQL endpoint. Strip literals/identifiers/comments before checking conservative write keywords.
  const text=query.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[[^\]]*\]|--[^\r\n]*|\/\*[\s\S]*?\*\//g,' ');
  return /^\s*(?:SELECT|WITH|EXPLAIN)\b/i.test(text)&&! /\b(?:INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP|ATTACH|DETACH|VACUUM|REINDEX|ANALYZE|PRAGMA|BEGIN|COMMIT|ROLLBACK)\b/i.test(text);
}

/** Every game write, including lazy GET writes, checks the request's epoch in the SAME D1 batch transaction. */
export function guardedGameDatabase(db:D1Database,epoch:number,generation=INITIAL_GENERATION,owner='',baseGeneration=INITIAL_GENERATION):D1Database{
  if(!Number.isSafeInteger(epoch)||epoch<0)throw new MaintenanceError();
  const originals=new WeakMap<D1PreparedStatement,D1PreparedStatement>(),reads=new WeakSet<D1PreparedStatement>();
  const fence=()=>db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('maintenance-write-fence',CASE WHEN COALESCE((SELECT revision FROM trail_configs WHERE id='maintenance'),0)=? AND COALESCE((SELECT json_extract(document,'$.paused') FROM trail_configs WHERE id='maintenance'),0)=0 AND COALESCE((SELECT json_extract(document,'$.generation') FROM trail_configs WHERE id='recovery-generation'),?)=? AND NOT EXISTS(SELECT 1 FROM trail_configs c,json_each(c.document,'$.players') p WHERE c.id='tester-access' AND json_extract(p.value,'$.id')=? AND json_extract(p.value,'$.allowed')=0) THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid").bind(epoch,baseGeneration,generation,owner);
  const batch=async<T>(statements:D1PreparedStatement[]):Promise<D1Result<T>[]>=>{
    if(statements.every(statement=>reads.has(statement)))return db.batch<T>(statements.map(statement=>originals.get(statement)!));
    try{return(await db.batch<T>([fence(),...statements.map(statement=>originals.get(statement)||statement)])).slice(1);}catch(error){const current=await loadMaintenance(db);if(current.paused||current.revision!==epoch)throw new MaintenanceError();throw error;}
  };
  const wrap=(statement:D1PreparedStatement,readOnly:boolean):D1PreparedStatement=>{
    const wrapped={
      bind(...values:unknown[]){return wrap(statement.bind(...values),readOnly);},
      async first<T>(column?:string){if(readOnly)return column===undefined?statement.first<T>():statement.first<T>(column);const row=(await batch<T>([statement]))[0].results[0];return row?(column?(row as Record<string,unknown>)[column]:row):null;},
      async all<T>(){return readOnly?statement.all<T>():(await batch<T>([statement]))[0];},
      async run<T>(){return readOnly?statement.run<T>():(await batch<T>([statement]))[0];},
      async raw(){throw new Error('Raw queries are not supported on the guarded game database');},
    }as D1PreparedStatement;originals.set(wrapped,statement);if(readOnly)reads.add(wrapped);return wrapped;
  };
  // Do not inherit unguarded exec/session escape hatches from the raw binding.
  return{prepare(query:string){return wrap(db.prepare(query),readOnlyStatement(query));},batch,exec(){throw new Error('Use guarded prepared statements');},dump(){throw new Error('Use the protected snapshot exporter');},withSession(){throw new Error('Use the guarded game database');}}as unknown as D1Database;
}
