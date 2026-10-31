import type {D1Database,D1PreparedStatement} from '@cloudflare/workers-types';
import type {Boss} from '../../mobile/src/game/bosses';
import {bossRequirements,bossDamage} from '../../mobile/src/game/bosses';
import type {Encounter,EncounterAction,EncounterReceipt,EncounterView,Contribution} from '../../mobile/src/game/encounters';
import {newProgression} from '../../mobile/src/game/progression';
import {rollBossLoot} from '../../mobile/src/game/loot';
import {recordArtifactEvidence} from '../../mobile/src/game/achievements';
import type {Relic} from '../../mobile/src/game/types';
import {loadWorld} from './world-store';
import {summarizeActivity,allowedBossVisit} from './activity-store';
import {loadLootRules} from './loot-store';
import {loadRegions} from './region-store';
import {blockedAt} from '../../mobile/src/game/world-regions';
import {WorldError} from './world-error';
import {requestHash} from './hash';
import G from '../../mobile/src/game/engine';
type Row={document:string;revision:number};
type PartyRow={id:string;name:string;accepted:number};
const guard=(db:D1Database,key:string)=>db.prepare('INSERT INTO trail_integrity(id,valid) VALUES(?,CASE WHEN changes()=1 THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid').bind(key);
const regionGuard=(db:D1Database,revision:string)=>db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('encounter-region-cas',CASE WHEN COALESCE((SELECT json_extract(document,'$.revision') FROM trail_configs WHERE id='world-regions'),'regions-experiment-1')=? THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid").bind(revision);
async function raw(db:D1Database,id:string){const row=await db.prepare('SELECT document,revision FROM trail_encounters WHERE id=?').bind(id).first<Row>();if(!row)throw new WorldError(404,'Encounter not found');return{encounter:JSON.parse(row.document)as Encounter,revision:row.revision};}
async function party(db:D1Database,id:string){return(await db.prepare('SELECT p.owner AS id,m.display_name AS name,p.accepted FROM trail_party_members p JOIN trail_members m ON m.id=p.owner WHERE p.encounter=? ORDER BY p.owner').bind(id).all<PartyRow>()).results;}
async function expire(db:D1Database,id:string,now:number){
  const current=await raw(db,id),e=current.encounter;let terminal:'expired'|'cancelled'|null=null;
  if(e.state==='active'&&e.deadline!==null&&now>=e.deadline)terminal='expired';
  if(e.state==='draft'){const boss=await db.prepare('SELECT ends_at,removed_at FROM trail_bosses WHERE id=?').bind(e.boss.id).first<{ends_at:number;removed_at:number|null}>();if(!boss||boss.removed_at!==null||now>=boss.ends_at)terminal='cancelled';}
  if(!terminal)return current;e.state=terminal;e.resolvedAt=now;
  try{await db.batch([
    db.prepare('UPDATE trail_encounters SET state=?,document=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(terminal,JSON.stringify(e),now,id,current.revision),guard(db,'encounter-expire-cas'),
    db.prepare('UPDATE trail_party_members SET active=0 WHERE encounter=?').bind(id),
    db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind('resolve:'+id,'system','encounter.'+terminal,id,JSON.stringify({deadline:e.deadline}),now),
  ]);}catch{/* A concurrent contribution/expiration owns the newer revision. */}
  return raw(db,id);
}
export async function viewEncounter(db:D1Database,owner:string,id:string,now=Date.now()):Promise<EncounterView>{
  if(typeof id!=='string'||!await db.prepare('SELECT 1 FROM trail_party_members WHERE encounter=? AND owner=?').bind(id,owner).first())throw new WorldError(404,'Encounter not found');
  const current=await expire(db,id,now),members=await party(db,id),reward=await db.prepare('SELECT document FROM trail_boss_rewards WHERE encounter=? AND owner=?').bind(id,owner).first<{document:string}>();
  // Party members see effort and qualification, without another player's private XP snapshot.
  const encounter:Encounter=JSON.parse(JSON.stringify(current.encounter));for(const[id,c]of Object.entries(encounter.contributions))if(id!==owner){delete c.progression;delete c.curveCoefficient;}
  return{encounter,revision:current.revision,members:members.map(m=>({...m,accepted:!!m.accepted})),...(reward?{reward:JSON.parse(reward.document)}:{})};
}
export async function listEncounters(db:D1Database,owner:string,now=Date.now()){
  const rows=await db.prepare("SELECT e.id FROM trail_encounters e JOIN trail_party_members p ON p.encounter=e.id WHERE p.owner=? ORDER BY CASE WHEN e.state IN ('draft','active') THEN 0 ELSE 1 END,e.updated_at DESC LIMIT 50").bind(owner).all<{id:string}>();
  return{encounters:await Promise.all(rows.results.map(r=>viewEncounter(db,owner,r.id,now)))};
}
async function ensureFreeSlot(db:D1Database,owner:string,boss:string,except='',now=Date.now()){
  const existing=await db.prepare('SELECT encounter FROM trail_party_members WHERE owner=? AND boss=? AND active=1 AND encounter<>?').bind(owner,boss,except).first<{encounter:string}>();if(existing){await expire(db,existing.encounter,now);if(await db.prepare('SELECT 1 FROM trail_party_members WHERE owner=? AND boss=? AND active=1 AND encounter<>?').bind(owner,boss,except).first())throw new WorldError(409,'You already have a party for this boss. Open or cancel its draft first.');}
}
async function replayView(db:D1Database,owner:string,id:string,now:number){return await db.prepare('SELECT 1 FROM trail_party_members WHERE encounter=? AND owner=?').bind(id,owner).first()?viewEncounter(db,owner,id,now):null;}
export async function applyEncounterAction(db:D1Database,owner:string,id:string,action:EncounterAction,now=Date.now()){
  if(typeof id!=='string'||!/^[a-zA-Z0-9:_-]{8,100}$/.test(id)||!Number.isSafeInteger(now)||now<0||!action||!['create','accept','activate','cancel','leave','contribute','claim-loot'].includes(action.kind))throw new WorldError(400,'Invalid encounter action');
  if(action.kind!=='create'&&(typeof action.encounterId!=='string'||action.encounterId.length>100))throw new WorldError(400,'Invalid encounter identity');
  if(action.kind==='contribute'&&(typeof action.activityId!=='string'||action.activityId.length>160))throw new WorldError(400,'Invalid activity identity');
  const hash=await requestHash(action),known=await db.prepare('SELECT request_hash,receipt FROM trail_encounter_actions WHERE owner=? AND id=?').bind(owner,id).first<{request_hash:string;receipt:string}>();
  if(known){if(known.request_hash!==hash)throw new WorldError(409,'Action identity was reused with different contents');const receipt=JSON.parse(known.receipt)as EncounterReceipt;return{view:await replayView(db,owner,receipt.encounterId,now),receipt,replayed:true,...(receipt.kind==='claim-loot'?{world:await loadWorld(db,owner,now)}:{})};}
  let encounter:Encounter,expected=0,roster:PartyRow[]=[];const statements:D1PreparedStatement[]=[];let regionRevision:string|undefined,worldResult:Awaited<ReturnType<typeof loadWorld>>|undefined;
  if(action.kind==='create'){
    if(typeof action.bossId!=='string'||!Array.isArray(action.members)||action.members.length>4||!action.members.every(x=>typeof x==='string'&&x.length>0&&x.length<=250))throw new WorldError(400,'Choose up to four other shared players');
    const ids=[owner,...action.members.filter(x=>x!==owner)];if(new Set(ids).size!==ids.length)throw new WorldError(400,'Party members must be distinct');
    await ensureFreeSlot(db,owner,action.bossId,'',now);
    const bossRow=await db.prepare('SELECT document,removed_at FROM trail_bosses WHERE id=?').bind(action.bossId).first<{document:string;removed_at:number|null}>(),boss=bossRow?JSON.parse(bossRow.document)as Boss:null;
    if(!boss||bossRow!.removed_at!==null||now<boss.startsAt||now>=boss.endsAt)throw new WorldError(400,'Boss is not available for a new encounter');
    const regions=await loadRegions(db);if(blockedAt(boss,now,regions))throw new WorldError(400,'Boss path is currently blocked');regionRevision=regions.revision;
    const members=await db.prepare(`SELECT id,display_name FROM trail_members WHERE id IN (${ids.map(()=>'?').join(',')})`).bind(...ids).all<{id:string;display_name:string}>();if(members.results.length!==ids.length)throw new WorldError(400,'Every invited player needs a shared profile');
    roster=ids.map(id=>({id,name:members.results.find(m=>m.id===id)!.display_name,accepted:id===owner?1:0}));const encounterId='encounter:'+crypto.randomUUID();
    encounter={version:1,id:encounterId,boss,creator:owner,roster:roster.map(m=>({id:m.id,name:m.name})),state:'draft',createdAt:now,startedAt:null,deadline:null,resolvedAt:null,totalHp:0,remainingHp:0,contributions:{},lootRules:null};
    statements.push(db.prepare('INSERT INTO trail_encounters(id,boss,owner,state,document,revision,updated_at) VALUES(?,?,?,?,?,1,?)').bind(encounter.id,boss.id,owner,encounter.state,JSON.stringify(encounter),now));
    for(const member of roster)statements.push(db.prepare('INSERT INTO trail_party_members(encounter,owner,boss,accepted,active) VALUES(?,?,?,?,?)').bind(encounter.id,member.id,boss.id,member.accepted,member.accepted));
  }else{
    const view=await viewEncounter(db,owner,action.encounterId,now);if(!Number.isSafeInteger(action.revision)||action.revision!==view.revision)throw new WorldError(409,'Party progress changed; reload before continuing');
    const current=await raw(db,action.encounterId);if(current.revision!==action.revision)throw new WorldError(409,'Party progress changed while loading; reload before continuing');encounter=current.encounter;expected=current.revision;roster=await party(db,encounter.id);const actor=roster.find(m=>m.id===owner);if(!actor)throw new WorldError(404,'Encounter not found');
    if(action.kind==='accept'){
      if(encounter.state!=='draft'||actor.accepted)throw new WorldError(409,'This invitation is no longer pending');await ensureFreeSlot(db,owner,encounter.boss.id,encounter.id,now);
      statements.push(db.prepare('UPDATE trail_party_members SET accepted=1,active=1 WHERE encounter=? AND owner=? AND accepted=0').bind(encounter.id,owner),guard(db,'party-accept-cas'));
    }else if(action.kind==='leave'){
      if(encounter.creator===owner||encounter.state!=='draft')throw new WorldError(400,'Party composition is locked after activation; creators can cancel a draft');
      encounter.roster=encounter.roster.filter(m=>m.id!==owner);statements.push(db.prepare('DELETE FROM trail_party_members WHERE encounter=? AND owner=?').bind(encounter.id,owner),guard(db,'party-leave-cas'));
    }else if(action.kind==='cancel'){
      if(encounter.creator!==owner||encounter.state!=='draft')throw new WorldError(403,'Only the creator can cancel a draft party');encounter.state='cancelled';encounter.resolvedAt=now;statements.push(db.prepare('UPDATE trail_party_members SET active=0 WHERE encounter=?').bind(encounter.id));
    }else if(action.kind==='activate'){
      if(encounter.creator!==owner||encounter.state!=='draft'||roster.some(m=>!m.accepted))throw new WorldError(400,'The creator activates after every invited member accepts');
      const state=await loadWorld(db,owner,now),fix=state.world.previous;
      if(!state.world.latestGpsValid||!fix||now-fix.timestamp<0||now-fix.timestamp>=15000||G.key(G.cell(fix.x,fix.y).i,G.cell(fix.x,fix.y).j)!==encounter.boss.tileId)throw new WorldError(400,'Reach the boss tile with fresh accurate GPS before activating');
      const regions=await loadRegions(db);if(blockedAt(encounter.boss,now,regions))throw new WorldError(400,'Boss path is currently blocked');regionRevision=regions.revision;
      const requirement=bossRequirements(encounter.boss.tier,roster.length,encounter.boss.rules);encounter.state='active';encounter.startedAt=now;encounter.deadline=now+requirement.windowHours*3600000;encounter.totalHp=requirement.hp;encounter.remainingHp=requirement.hp;encounter.lootRules=await loadLootRules(db);
      statements.push(db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('activation-player-cas',CASE WHEN (SELECT revision FROM trail_players WHERE id=?)=? THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid").bind(owner,state.revision));
    }else if(action.kind==='contribute'){
      if(encounter.state!=='active'||!actor.accepted||encounter.startedAt===null||encounter.deadline===null||now>=encounter.deadline||Object.hasOwn(encounter.contributions,owner))throw new WorldError(400,'Submit one completed activity before the party wins or its window ends');
      if(await db.prepare('SELECT 1 FROM trail_contributions WHERE owner=? AND boss=? AND activity_id=?').bind(owner,encounter.boss.id,action.activityId).first())throw new WorldError(400,'That activity was already used for this boss');
      const evidence=await summarizeActivity(db,owner,action.activityId,encounter.boss.tileId,encounter.startedAt,encounter.deadline,now);if(!evidence.bossTileVisited)throw new WorldError(400,'That activity did not visit this boss tile during the encounter');
      const regions=await loadRegions(db);if(await allowedBossVisit(db,owner,evidence.id,encounter.boss,encounter.startedAt,Math.min(encounter.deadline,evidence.endedAt),regions)===null)throw new WorldError(400,'That activity needs a boss-tile visit outside blocked access intervals');regionRevision=regions.revision;
      const state=await loadWorld(db,owner,now),damage=bossDamage(evidence.meters,evidence.movement,encounter.boss,encounter.boss.rules),minimum=bossRequirements(encounter.boss.tier,roster.length,encounter.boss.rules).minimumKmPerPerson;
      const contribution:Contribution={owner,activityId:evidence.id,meters:evidence.meters,movement:evidence.movement,bossTileVisited:true,activityStartedAt:evidence.eligibleStartedAt,activityEndedAt:evidence.endedAt,equivalentKm:damage.equivalentKm,hp:damage.hp,qualified:damage.equivalentKm>=minimum,submittedAt:now,progression:state.world.game.progression||newProgression(),curveCoefficient:state.world.curveCoefficient||25,source:evidence.source,observedSeconds:evidence.observedSeconds};
      encounter.contributions={...encounter.contributions,[owner]:contribution};const all=Object.values(encounter.contributions),hp=all.reduce((total,c)=>total+c.hp,0);encounter.remainingHp=Math.max(0,encounter.totalHp-hp);
      if(encounter.remainingHp===0&&all.some(c=>c.qualified)){encounter.state='won';encounter.resolvedAt=now;}else if(all.length===roster.length){encounter.state='failed';encounter.resolvedAt=now;}
      statements.push(db.prepare('INSERT INTO trail_contributions(encounter,owner,boss,activity_id,document,created_at) VALUES(?,?,?,?,?,?)').bind(encounter.id,owner,encounter.boss.id,evidence.id,JSON.stringify(contribution),now));
      if(encounter.state!=='active')statements.push(db.prepare('UPDATE trail_party_members SET active=0 WHERE encounter=?').bind(encounter.id));
    }else if(action.kind==='claim-loot'){
      if(encounter.state!=='won'||!encounter.contributions[owner]?.qualified||!encounter.lootRules)throw new WorldError(400,'Loot requires a winning encounter and your qualifying contribution');
      const previous=await db.prepare('SELECT document FROM trail_boss_rewards WHERE encounter=? AND owner=?').bind(encounter.id,owner).first<{document:string}>();
      if(!previous){
        const state=await loadWorld(db,owner,now),c=encounter.contributions[owner],qualified=Object.values(encounter.contributions).filter(p=>p.qualified).length,requirement=bossRequirements(encounter.boss.tier,roster.length,encounter.boss.rules),loot=rollBossLoot(encounter.boss,{progression:c.progression||newProgression(),curveCoefficient:c.curveCoefficient||25,equivalentKm:c.equivalentKm,targetKm:requirement.targetKmPerPerson,qualifiedPlayers:qualified},encounter.lootRules);
        const item:Relic={id:'boss-loot:'+crypto.randomUUID(),i:Number(encounter.boss.tileId.split(',')[0]),j:Number(encounter.boss.tileId.split(',')[1]),name:loot.name,title:loot.title,rarity:loot.rarity,novelty:1,landmark:encounter.boss.name+' victory',latitude:encounter.boss.latitude,longitude:encounter.boss.longitude,source:'Boss victory',date:new Date(c.activityEndedAt).toISOString()};
        state.world.game.gold+=loot.gold;if(!Number.isSafeInteger(state.world.game.gold))throw new WorldError(400,'Gold limit reached');state.world.game.collection.push(item);recordArtifactEvidence(state.world.game,item,c.activityEndedAt);state.world.game.progression??=newProgression();state.world.game.progression.xp.fellowship+=loot.fellowshipXp;if(!Number.isSafeInteger(state.world.game.progression.xp.fellowship))throw new WorldError(400,'Fellowship XP limit reached');
        const reward={gold:loot.gold,itemId:item.id,itemName:item.title||item.name,rarity:item.rarity,fellowshipXp:loot.fellowshipXp,chances:loot,activityId:c.activityId,qualifiedPlayers:qualified};
        statements.push(db.prepare('INSERT INTO trail_boss_rewards(encounter,owner,document,created_at) VALUES(?,?,?,?)').bind(encounter.id,owner,JSON.stringify(reward),now),db.prepare('UPDATE trail_players SET state=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(JSON.stringify(state.world),now,owner,state.revision),guard(db,'loot-player-cas'));worldResult={world:state.world,revision:state.revision+1};
      }else worldResult=await loadWorld(db,owner,now);
    }
    if(action.kind!=='claim-loot')statements.push(db.prepare('UPDATE trail_encounters SET state=?,document=?,revision=revision+1,started_at=?,deadline=?,updated_at=? WHERE id=? AND revision=?').bind(encounter.state,JSON.stringify(encounter),encounter.startedAt,encounter.deadline,now,encounter.id,expected),guard(db,'encounter-action-cas'));
  }
  if(action.kind==='create'||action.kind==='activate'){
    statements.push(db.prepare("INSERT INTO trail_integrity(id,valid) VALUES('encounter-boss-cas',CASE WHEN EXISTS(SELECT 1 FROM trail_bosses WHERE id=? AND removed_at IS NULL AND starts_at<=? AND ends_at>?) THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET valid=excluded.valid").bind(encounter.boss.id,now,now));
  }
  if(regionRevision)statements.push(regionGuard(db,regionRevision));
  const receipt:EncounterReceipt={kind:action.kind,encounterId:encounter.id,reason:action.kind==='claim-loot'?'loot ready':encounter.state};
  const actionInsert=db.prepare('INSERT INTO trail_encounter_actions(owner,id,request_hash,receipt,created_at) VALUES(?,?,?,?,?)').bind(owner,id,hash,JSON.stringify(receipt),now);
  try{await db.batch([actionInsert,...statements,db.prepare('INSERT INTO trail_audit(id,actor,action,target,details,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),owner,'encounter.'+action.kind,encounter.id,JSON.stringify({state:encounter.state,activityId:action.kind==='contribute'?action.activityId:undefined}),now)]);}catch{
    const raced=await db.prepare('SELECT request_hash,receipt FROM trail_encounter_actions WHERE owner=? AND id=?').bind(owner,id).first<{request_hash:string;receipt:string}>();if(raced?.request_hash===hash){const cached=JSON.parse(raced.receipt)as EncounterReceipt;return{view:await replayView(db,owner,cached.encounterId,now),receipt:cached,replayed:true,...(action.kind==='claim-loot'?{world:await loadWorld(db,owner,now)}:{})};}throw new WorldError(409,'Party, activity or player progress changed; reload before retrying');
  }
  return{view:action.kind==='leave'?null:await viewEncounter(db,owner,encounter.id,now),receipt,replayed:false,...(worldResult?{world:worldResult}:{})};
}
