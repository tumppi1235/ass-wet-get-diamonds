import {validateBossObjectives} from '../../mobile/src/game/boss-objectives';
import type {D1Database} from '@cloudflare/workers-types';
import {BOSS_DESIGNS,BOSS_RULES,BOSS_TIERS,validateBossRules,type Boss,type BossRules} from '../../mobile/src/game/bosses';
import {LANDMARKS} from '../../mobile/src/game/landmarks';
import {blockedAt} from '../../mobile/src/game/world-regions';
import {loadRegions} from './region-store';
import {WorldError} from './world-error';
import type {Bounds} from './spawn-store';
export async function loadBossRules(db:D1Database){const row=await db.prepare("SELECT document FROM trail_configs WHERE id='boss-rules'").first<{document:string}>();return validateBossRules(row?JSON.parse(row.document):BOSS_RULES);}
export async function saveBossRules(db:D1Database,actor:string,input:BossRules,expected:string){
  const before=await loadBossRules(db);if(expected!==before.revision)throw new WorldError(409,'Boss rules changed; reload first');
  const after=validateBossRules({...input,revision:'boss-'+crypto.randomUUID()}),now=Date.now();
  try{await db.batch([
    db.prepare("INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES('boss-rules',1,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=trail_configs.revision+1,document=excluded.document,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE json_extract(trail_configs.document,'$.revision')=?").bind(JSON.stringify(after),actor,now,expected),
    db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('boss-config-cas',CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid"),
    db.prepare('INSERT INTO trail_configs(id,revision,document,updated_by,updated_at) VALUES(?,1,?,?,?)').bind(after.revision,JSON.stringify(after),actor,now),
    db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,'boss.configure','boss-rules',JSON.stringify({before,after}),now),
  ]);}catch{throw new WorldError(409,'Boss rules changed during save; reload first');}return{rules:after};
}
export async function placeBoss(db:D1Database,actor:string,input:{designId:string;tier:Boss['tier'];placeId:string;startsAt:number;endsAt:number;weaknessBonus:number;objectives?:{uniqueTiles:number}},now=Date.now()){
  const design=BOSS_DESIGNS.find(b=>b.id===input.designId),place=LANDMARKS.find(p=>p.landmarkId===input.placeId);
  if(!design||!BOSS_TIERS.includes(input.tier)||!place||place.latitude==null||place.longitude==null||!place.source)throw new WorldError(400,'Choose a boss design, tier and sourced outdoor path');
  if(!Number.isSafeInteger(input.startsAt)||!Number.isSafeInteger(input.endsAt)||input.startsAt<0||input.endsAt<=input.startsAt||input.endsAt-input.startsAt>90*86400000||!Number.isFinite(input.weaknessBonus)||input.weaknessBonus<0||input.weaknessBonus>.25)throw new WorldError(400,'Use an active window up to 90 days and a weakness bonus up to 25%');
  if(blockedAt({latitude:place.latitude,longitude:place.longitude},now,await loadRegions(db)))throw new WorldError(400,'This path is blocked for encounters');
  let objectives;try{objectives=validateBossObjectives(input.objectives);}catch(e){throw new WorldError(400,(e as Error).message);}
  const boss:Boss={version:1,...(objectives?{objectives}:{}),id:'boss:'+crypto.randomUUID(),designId:design.id,name:design.name,tier:input.tier,tileId:place.id,latitude:place.latitude,longitude:place.longitude,source:place.source,startsAt:input.startsAt,endsAt:input.endsAt,signature:design.signature,artifactType:design.type,weakness:design.weakness,weaknessBonus:input.weaknessBonus,rules:await loadBossRules(db)};
  await db.batch([
    db.prepare('INSERT INTO trail_bosses(id,tile,document,latitude,longitude,starts_at,ends_at,revision) VALUES(?,?,?,?,?,?,?,1)').bind(boss.id,boss.tileId,JSON.stringify(boss),boss.latitude,boss.longitude,boss.startsAt,boss.endsAt),
    db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,'boss.place',boss.id,JSON.stringify({after:boss}),now),
  ]);return{boss};
}
export async function queryBosses(db:D1Database,bounds:Bounds,now=Date.now(),includeInactive=false){
  const rows=await db.prepare('SELECT document,removed_at FROM trail_bosses WHERE latitude>=? AND latitude<=? AND longitude>=? AND longitude<=? AND (?=1 OR (removed_at IS NULL AND starts_at<=? AND ends_at>?)) ORDER BY starts_at DESC,id LIMIT 101').bind(bounds.south,bounds.north,bounds.west,bounds.east,includeInactive?1:0,now,now).all<{document:string;removed_at:number|null}>();
  return{bosses:rows.results.slice(0,100).map(r=>({boss:JSON.parse(r.document)as Boss,retired:r.removed_at!==null})),truncated:rows.results.length>100};
}
export async function retireBoss(db:D1Database,actor:string,id:string,now=Date.now()){
  const before=await db.prepare('SELECT document,removed_at FROM trail_bosses WHERE id=?').bind(id).first<{document:string;removed_at:number|null}>();if(!before)throw new WorldError(404,'Boss not found');if(before.removed_at!==null)return{retired:true};
  await db.batch([db.prepare('UPDATE trail_bosses SET removed_at=?,revision=revision+1 WHERE id=? AND removed_at IS NULL').bind(now,id),db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,'boss.retire',id,JSON.stringify({before:JSON.parse(before.document)}),now)]);return{retired:true};
}
