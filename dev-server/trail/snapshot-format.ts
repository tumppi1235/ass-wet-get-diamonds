import {requestHash} from './hash';
import {DEV_SCOPE,type WorldScope} from './service-scope';
export const SNAPSHOT_PROJECT='appgprj_6ae5c02d5c008191b51fda4f4f39c7a5';
export const SNAPSHOT_SCHEMA=7,MAX_SNAPSHOT_BYTES=524288,MAX_SNAPSHOT_ROWS=5000;
// Explicit order restores parents before dependent rows. Update schema/version and recovery tests together.
export const SNAPSHOT_COLUMNS={
  trail_members:['id','display_name','role','created_at'],
  trail_players:['id','state','revision','updated_at'],
  trail_configs:['id','revision','document','updated_by','updated_at'],
  trail_spawns:['id','tile','document','starts_at','expires_at','revision','removed_at','latitude','longitude','owner'],
  trail_bosses:['id','tile','document','latitude','longitude','starts_at','ends_at','revision','removed_at'],
  trail_encounters:['id','boss','owner','state','document','revision','started_at','deadline','updated_at'],
  trail_events:['owner','id','kind','result','request_hash','created_at','activity_id','activity_at'],
  trail_visits:['tile','owner','first_at','last_at','cell_i','cell_j'],
  trail_claims:['tile','owner','price','revision','updated_at','cell_i','cell_j'],
  trail_audit:['id','actor','action','target','details','created_at'],
  trail_backups:['id','owner','state','revision','created_at'],
  trail_spawn_claims:['spawn','owner','event','created_at'],
  trail_party_members:['encounter','owner','boss','accepted','active'],
  trail_contributions:['encounter','owner','boss','activity_id','document','created_at'],
  trail_encounter_actions:['owner','id','request_hash','receipt','created_at'],
  trail_boss_rewards:['encounter','owner','document','created_at'],
  trail_integrity:['id','valid'],
}as const;
export type SnapshotTable=keyof typeof SNAPSHOT_COLUMNS;
export const SNAPSHOT_TABLES=Object.keys(SNAPSHOT_COLUMNS)as SnapshotTable[];
export function columnsForSnapshot(schema:number):Record<SnapshotTable,readonly string[]>{
  if(schema===6||schema===7)return SNAPSHOT_COLUMNS;
  if(schema===5)return{...SNAPSHOT_COLUMNS,trail_claims:['tile','owner','price','revision','updated_at']};
  throw new Error('Unsupported snapshot schema');
}
export type SnapshotRow=Record<string,string|number|null>;
export type DevSnapshot={format:'trail-relics-shared-dev'|'trail-relics-shared-world';version:1;schema:number;projectId:string;environment:'development'|'production';capturedAt:number;tables:Record<SnapshotTable,SnapshotRow[]>;digest:string};
export function snapshotBytes(value:unknown){return new TextEncoder().encode(JSON.stringify(value)).byteLength;}
export async function validateSnapshot(value:unknown,scope:WorldScope=DEV_SCOPE):Promise<DevSnapshot>{
  if(!value||typeof value!=='object'||snapshotBytes(value)>MAX_SNAPSHOT_BYTES)throw new Error('Invalid or oversized dev snapshot');
  const s=value as DevSnapshot;
  if(s.format!==(scope.environment==='development'?'trail-relics-shared-dev':'trail-relics-shared-world')||s.version!==1||![5,6,7].includes(s.schema)||s.projectId!==scope.projectId||s.environment!==scope.environment||!Number.isSafeInteger(s.capturedAt)||s.capturedAt<0||typeof s.digest!=='string'||!/^[a-f0-9]{64}$/.test(s.digest))throw new Error('Snapshot environment, project, schema or checksum is invalid');
  if(!s.tables||Object.keys(s.tables).length!==SNAPSHOT_TABLES.length||Object.keys(s.tables).some(t=>!Object.hasOwn(SNAPSHOT_COLUMNS,t)))throw new Error('Snapshot tables do not match this schema');
  const layout=columnsForSnapshot(s.schema);
  for(const table of SNAPSHOT_TABLES){const rows=s.tables[table],columns=layout[table];if(!Array.isArray(rows)||rows.length>MAX_SNAPSHOT_ROWS)throw new Error('Snapshot row limit exceeded');for(const row of rows){if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).length!==columns.length||columns.some(c=>!Object.hasOwn(row,c))||Object.entries(row).some(([c,v])=>!columns.includes(c)||!(v===null||typeof v==='string'||typeof v==='number'&&Number.isFinite(v))))throw new Error('Snapshot columns or values are invalid');}}
  const{digest,...payload}=s;if(await requestHash(payload)!==digest)throw new Error('Snapshot checksum mismatch');return s;
}
