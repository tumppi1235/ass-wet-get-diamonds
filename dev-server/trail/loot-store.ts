import type {D1Database} from '@cloudflare/workers-types';
import {LOOT_RULES,validateLootRules,type LootRules} from '../../mobile/src/game/loot';
import {WorldError} from './world-error';
export async function loadLootRules(db:D1Database){const row=await db.prepare("SELECT document FROM trail_configs WHERE id='loot-rules'").first<{document:string}>();return validateLootRules(row?JSON.parse(row.document):LOOT_RULES);}
export async function saveLootRules(db:D1Database,actor:string,input:LootRules,expected:string){
  const before=await loadLootRules(db);if(before.revision!==expected)throw new WorldError(409,'Loot rules changed; reload first');const after=validateLootRules({...input,revision:'loot-'+crypto.randomUUID()}),now=Date.now();
  try{await db.batch([
    db.prepare("INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES('loot-rules',1,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=trail_configs.revision+1,document=excluded.document,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE json_extract(trail_configs.document,'$.revision')=?").bind(JSON.stringify(after),actor,now,expected),
    db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('loot-config-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid"),
    db.prepare('INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES(?,1,?,?,?)').bind(after.revision,JSON.stringify(after),actor,now),
    db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,'loot.configure','loot-rules',JSON.stringify({before,after}),now),
  ]);}catch{throw new WorldError(409,'Loot rules changed during save; reload first');}return{rules:after};
}
