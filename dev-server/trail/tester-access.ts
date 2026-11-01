import type {D1Database} from '@cloudflare/workers-types';
import {WorldError} from './world-error';
import {requestHash} from './hash';
type Access={revision:number;players:{id:string;allowed:boolean}[]};
export async function loadTesterAccess(db:D1Database):Promise<Access>{
  const row=await db.prepare("SELECT revision,document FROM trail_configs WHERE id='tester-access'").first<{revision:number;document:string}>();if(!row)return{revision:0,players:[]};
  let config:Access;try{config={...JSON.parse(row.document),revision:row.revision};}catch{throw new WorldError(503,'Tester access configuration needs administrator review');}
  if(!Number.isSafeInteger(config.revision)||config.revision<0||!Array.isArray(config.players)||config.players.length>500||config.players.some(p=>!p||typeof p.id!=='string'||!p.id||p.id.length>250||typeof p.allowed!=='boolean')||new Set(config.players.map(p=>p.id)).size!==config.players.length)throw new WorldError(503,'Tester access configuration needs administrator review');return config;
}
export function testerAllowed(config:Access,id:string){return config.players.find(p=>p.id===id)?.allowed??true;}
export async function saveTesterAccess(db:D1Database,actor:string,input:{id:string;revision:number;target:string;allowed:boolean;confirmed:boolean},now=Date.now()){
  if(!input||typeof input.id!=='string'||!/^[a-zA-Z0-9:_-]{8,100}$/.test(input.id)||!Number.isSafeInteger(input.revision)||input.revision<0||typeof input.target!=='string'||!input.target||input.target.length>250||typeof input.allowed!=='boolean'||input.confirmed!==true)throw new WorldError(400,'Confirm a valid tester access change');
  const target=await db.prepare('SELECT role FROM trail_members WHERE id=?').bind(input.target).first<{role:string}>();
  if(!target)throw new WorldError(404,'Choose an existing shared dev player');if(actor===input.target||target.role!=='player')throw new WorldError(403,'Administrator and own-account access cannot be changed here');
  const hash=await requestHash({revision:input.revision,target:input.target,allowed:input.allowed}),auditId='tester-access:'+await requestHash({actor,id:input.id});
  const replay=async()=>{const known=await db.prepare('SELECT details FROM trail_audit WHERE id=?').bind(auditId).first<{details:string}>();if(!known)return null;const details=JSON.parse(known.details);if(details.requestHash!==hash)throw new WorldError(409,'Access action identity changed');return{access:await loadTesterAccess(db),replayed:true};};
  const known=await replay();if(known)return known;
  const before=await loadTesterAccess(db);if(before.revision!==input.revision)throw new WorldError(409,'Tester access changed; refresh before saving');
  const after:Access={revision:before.revision+1,players:[...before.players.filter(p=>p.id!==input.target),{id:input.target,allowed:input.allowed}]};if(after.players.length>500)throw new WorldError(413,'Tester access list is full');
  try{await db.batch([
    db.prepare("INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES('tester-access',?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,document=excluded.document,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE trail_configs.revision=?").bind(after.revision,JSON.stringify({players:after.players}),actor,now,before.revision),
    db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('tester-access-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid"),
    db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('tester-role-cas',CASE WHEN (SELECT role FROM trail_members WHERE id=?)='admin' AND (SELECT role FROM trail_members WHERE id=?)='player' THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid").bind(actor,input.target),
    db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind(auditId,actor,'tester.access',input.target,JSON.stringify({requestHash:hash,allowed:input.allowed,revision:after.revision}),now),
  ]);}catch{const raced=await replay();if(raced)return raced;throw new WorldError(409,'Tester access changed during save; refresh before continuing');}
  return{access:after,replayed:false};
}
