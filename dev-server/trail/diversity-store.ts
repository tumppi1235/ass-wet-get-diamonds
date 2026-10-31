import type {D1Database} from '@cloudflare/workers-types';
import {DIVERSITY_RULES,validateDiversityRules,type DiversityRules} from '../../mobile/src/game/diversity';
import {WorldError} from './world-error';
export async function loadDiversityRules(db:D1Database){const row=await db.prepare("SELECT document,revision FROM trail_configs WHERE id='diversity-rules'").first<{document:string;revision:number}>();return{rules:validateDiversityRules(row?JSON.parse(row.document):DIVERSITY_RULES),revision:row?.revision||0};}
export async function saveDiversityRules(db:D1Database,actor:string,input:DiversityRules,expected:number){
  const current=await loadDiversityRules(db);if(!Number.isSafeInteger(expected)||expected!==current.revision)throw new WorldError(409,'Diversity rules changed; reload first');
  let rules:DiversityRules;try{rules=validateDiversityRules({...input,revision:'diversity-dev-'+(expected+1)});}catch(e){throw new WorldError(400,(e as Error).message);}const revision=expected+1,now=Date.now();
  try{await db.batch([
    db.prepare("INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES('diversity-rules',?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,document=excluded.document,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE trail_configs.revision=?").bind(revision,JSON.stringify(rules),actor,now,expected),
    db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('diversity-config-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid"),
    db.prepare('INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES(?,?,?,?,?)').bind(rules.revision,revision,JSON.stringify(rules),actor,now),
    db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,'diversity.configure','diversity-rules',JSON.stringify({before:current.rules,after:rules}),now),
  ]);}catch{throw new WorldError(409,'Diversity rules changed during save; reload first');}return{rules,revision};
}
