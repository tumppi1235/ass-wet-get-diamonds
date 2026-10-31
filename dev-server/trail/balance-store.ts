import type {D1Database} from '@cloudflare/workers-types';
import {DEV_BALANCE,validateBalance,type DevBalance} from '../../mobile/src/game/dev-world';
export async function loadBalance(db:D1Database){
  const row=await db.prepare("SELECT document,revision FROM trail_configs WHERE id='active-balance'").first<{document:string;revision:number}>();
  return{balance:validateBalance(row?JSON.parse(row.document):DEV_BALANCE),revision:row?.revision||0};
}
export async function saveBalance(db:D1Database,actor:string,input:DevBalance,expected:number){
  const current=await loadBalance(db);if(!Number.isSafeInteger(expected)||expected!==current.revision)throw new Error('Configuration changed; reload first');
  const revision=expected+1,balance=validateBalance({...input,revision:'dev-custom-'+revision}),now=Date.now();
  await db.batch([
    db.prepare("INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES('active-balance',?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,document=excluded.document,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE trail_configs.revision=?").bind(revision,JSON.stringify(balance),actor,now,expected),
    db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('config-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid"),
    db.prepare('INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES(?,?,?,?,?)').bind('balance:'+revision,revision,JSON.stringify(balance),actor,now),
    db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,'balance.update','active-balance',JSON.stringify({before:current.balance,after:balance}),now),
  ]);return{balance,revision};
}
