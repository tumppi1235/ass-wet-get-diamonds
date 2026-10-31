import {applyWorldEvent,loadWorld,WorldError} from './world-store';
import type {D1Database} from '@cloudflare/workers-types';
import {loadBalance,saveBalance} from './balance-store';
import {querySpawns,readBounds,nearbyBounds,placeSpawn,removeSpawn,loadSpawnRules,saveSpawnRules} from './spawn-store';
import {generateWorldSpawn,validateSpawnRules,type SpawnRules} from '../../mobile/src/game/world-spawns';
import {LANDMARKS} from '../../mobile/src/game/landmarks';
import G from '../../mobile/src/game/engine';
import {inspectPlayer,editPlayer} from './player-admin';
import {DEV_BALANCE,validateBalance} from '../../mobile/src/game/dev-world';
import {loadRegions,saveRegions,queryDensity} from './region-store';
import {rulesForPlace,blockedAt} from '../../mobile/src/game/world-regions';
import {loadBossRules,saveBossRules,placeBoss,queryBosses,retireBoss} from './boss-store';
import {BOSS_DESIGNS,simulateEncounter} from '../../mobile/src/game/bosses';
import {applyEncounterAction,listEncounters,viewEncounter} from './encounter-store';
import {listCompletedActivities,summarizeActivity,allowedBossVisit} from './activity-store';
import {loadLootRules,saveLootRules} from './loot-store';
import {lootChances,validateLootRules} from '../../mobile/src/game/loot';
import {queryEncounters,inspectEncounter,cancelEncounter} from './encounter-admin';
import {exportDevSnapshot} from './snapshot-store';
import {simulateCollection} from '../../mobile/src/game/collection-simulation';
import {spawnAnalytics} from './spawn-analytics';
import {queryClaims} from './claim-store';
import {adventureIdeas} from './recommendation-store';
import {unexpectedApiFailure} from './observability';
import {loadMaintenance,saveMaintenance,guardedGameDatabase,MaintenanceError} from './maintenance-store';
import {loadDiversityRules,saveDiversityRules} from './diversity-store';
type Bindings={DB?:D1Database;TRAIL_ENV?:string;TRAIL_ADMIN_EMAIL?:string;TRAIL_PUBLIC_ORIGIN?:string};
type Member={id:string;display_name:string;role:'admin'|'player';created_at:number};
class ApiError extends Error{constructor(public status:number,message:string){super(message);}}
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const name=(value:unknown)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>40)throw new ApiError(400,'Use a display name of 1–40 characters.');return value.trim();};
async function body(request:Request){
  const reader=request.body?.getReader(),parts:Uint8Array[]=[];let size=0;
  if(reader)try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>131072){await reader.cancel();throw new ApiError(413,'Request is too large.');}parts.push(chunk.value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
  try{const value=JSON.parse(new TextDecoder().decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value;}catch{throw new ApiError(400,'Invalid JSON object.');}
}
function identity(request:Request){const id=request.headers.get('oai-authenticated-user-id');if(!id||id.length>250)throw new ApiError(401,'Sign in with ChatGPT to use the shared dev world.');return id;}
export async function trailApi(request:Request,env:Bindings){
  let requestEpoch:number|undefined;
  try{
    if(env.TRAIL_ENV!=='development'||!env.DB)throw new ApiError(503,'Shared development services are not configured.');
    const url=new URL(request.url),path=url.pathname.replace(/\/$/,'');
    if(path==='/api/trail/health'&&request.method==='GET')return json({environment:'development',service:'trail-shared',schema:1});
    const id=identity(request),rawDb=env.DB;
    if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==new URL(env.TRAIL_PUBLIC_ORIGIN||url.origin).origin)throw new ApiError(403,'Use the app on its own origin.');
    const maintenance=await loadMaintenance(rawDb),db=guardedGameDatabase(rawDb,maintenance.revision);requestEpoch=maintenance.revision;
    let member=await db.prepare('SELECT * FROM trail_members WHERE id=?').bind(id).first<Member>();
    const maintenanceRoute=path==='/api/trail/admin/maintenance',snapshotRoute=path==='/api/trail/admin/snapshot',identityRead=path==='/api/trail/me'&&request.method==='GET',statusRead=path==='/api/trail/maintenance'&&request.method==='GET';
    if(maintenance.paused&&!maintenanceRoute&&!snapshotRoute&&!identityRead&&!statusRead)throw new MaintenanceError();
    if(path==='/api/trail/me'&&request.method==='POST'){
      const input=await body(request),displayName=name(input.displayName??'Explorer');
      const isOwner=!!env.TRAIL_ADMIN_EMAIL&&request.headers.get('oai-authenticated-user-email')?.toLowerCase()===env.TRAIL_ADMIN_EMAIL.toLowerCase();
      await db.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,displayName,isOwner?'admin':'player',Date.now()).run();
      member=await db.prepare('SELECT * FROM trail_members WHERE id=?').bind(id).first<Member>();
    }
    if(!member)throw new ApiError(404,'Create your shared dev profile first. Your local profiles remain saved.');
    if(statusRead)return json({maintenance});
    if(maintenanceRoute){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');
      if(request.method==='GET')return json({maintenance});
      if(request.method==='PUT')return json(await saveMaintenance(rawDb,id,await body(request)));
      throw new ApiError(405,'Use GET or PUT for maintenance');
    }
    if(path==='/api/trail/me'&&['GET','POST'].includes(request.method))return json({user:{id:member.id,displayName:member.display_name,username:'shared',role:member.role,createdAt:member.created_at},environment:'development'});
    if(path==='/api/trail/me'&&request.method==='PATCH'){
      const input=await body(request),displayName=name(input.displayName);
      await db.prepare('UPDATE trail_members SET display_name=? WHERE id=?').bind(displayName,id).run();return json({saved:true});
    }
    if(path==='/api/trail/world'&&request.method==='GET')return json(await loadWorld(db,id));
    if(path==='/api/trail/diversity-rules'&&request.method==='GET')return json(await loadDiversityRules(db));
    if(path==='/api/trail/admin/diversity-rules'&&request.method==='PUT'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');const input=await body(request);return json(await saveDiversityRules(db,id,input.rules,input.revision));
    }
    if(path==='/api/trail/ideas'&&request.method==='POST')return json(await adventureIdeas(db,id,await body(request)));
    if(path==='/api/trail/admin/snapshot'&&request.method==='POST'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');return json(await exportDevSnapshot(rawDb));
    }
    if(path==='/api/trail/admin/collection-simulation'&&request.method==='POST'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');const input=await body(request),place=LANDMARKS.find(p=>p.landmarkId===input.placeId);
      if(!place)throw new ApiError(400,'Choose a sourced catalog path');const regions=await loadRegions(db);try{return json(simulateCollection(place,input.scenario,validateSpawnRules(input.rules),regions));}catch(e){throw new ApiError(400,(e as Error).message);}
    }
    if(path==='/api/trail/admin/spawn-analytics'&&request.method==='GET'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');return json(await spawnAnalytics(db,readBounds(url.searchParams),Number(url.searchParams.get('days')||7)));
    }
    if(path.startsWith('/api/trail/admin/encounter')){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');
      if(path==='/api/trail/admin/encounters'&&request.method==='GET')return json(await queryEncounters(db,url.searchParams));
      if(path==='/api/trail/admin/encounter'&&request.method==='GET')return json(await inspectEncounter(db,url.searchParams.get('id')||''));
      if(path==='/api/trail/admin/encounter-cancel'&&request.method==='POST')return json(await cancelEncounter(db,id,await body(request)));
    }
    if(path==='/api/trail/bosses'&&request.method==='GET'){
      const result=await queryBosses(db,readBounds(url.searchParams)),regions=await loadRegions(db),now=Date.now();
      return json({...result,bosses:result.bosses.filter(r=>!blockedAt(r.boss,now,regions))});
    }
    if(path==='/api/trail/party-players'&&request.method==='GET'){
      const q=url.searchParams.get('q')||'';if(q.length<2||q.length>40)return json({players:[]});
      const rows=await db.prepare('SELECT id,display_name AS name FROM trail_members WHERE id<>? AND instr(lower(display_name),lower(?))>0 ORDER BY display_name,id LIMIT 20').bind(id,q).all();return json({players:rows.results});
    }
    if(path==='/api/trail/encounters'&&request.method==='GET')return json(await listEncounters(db,id));
    if(path==='/api/trail/encounter'&&request.method==='GET')return json(await viewEncounter(db,id,url.searchParams.get('id')||''));
    if(path==='/api/trail/activities'&&request.method==='GET')return json(await listCompletedActivities(db,id));
    if(path==='/api/trail/activity-preview'&&request.method==='GET'){
      const view=await viewEncounter(db,id,url.searchParams.get('encounter')||''),e=view.encounter;
      if(e.state!=='active'||e.startedAt===null||e.deadline===null)throw new ApiError(400,'Activate this encounter before choosing an activity');
      const activity=await summarizeActivity(db,id,url.searchParams.get('activity')||'',e.boss.tileId,e.startedAt,e.deadline),regions=await loadRegions(db);
      return json({activity:{...activity,bossTileVisited:await allowedBossVisit(db,id,activity.id,e.boss,e.startedAt,Math.min(e.deadline,activity.endedAt),regions)!==null}});
    }
    if(path==='/api/trail/encounter-actions'&&request.method==='POST'){
      const input=await body(request);return json(await applyEncounterAction(db,id,input.id,input.action));
    }
    if(path==='/api/trail/admin/loot-rules'&&request.method==='GET'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');return json({rules:await loadLootRules(db)});
    }
    if(path==='/api/trail/admin/loot-rules'&&request.method==='PUT'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');const input=await body(request);
      try{return json(await saveLootRules(db,id,input.rules,input.revision));}catch(e){if(e instanceof WorldError)throw e;throw new ApiError(400,(e as Error).message);}
    }
    if(path==='/api/trail/admin/loot-simulation'&&request.method==='POST'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');const input=await body(request);
      try{return json({simulation:true,writes:0,chances:lootChances(input.tier,input.evidence,validateLootRules(input.rules))});}catch(e){throw new ApiError(400,(e as Error).message);}
    }
    if(path==='/api/trail/admin/spawn-rules'&&request.method==='GET'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');return json({rules:await loadSpawnRules(db)});
    }
    if(path==='/api/trail/admin/spawn-rules'&&request.method==='PUT'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');const input=await body(request);
      try{return json(await saveSpawnRules(db,id,input.rules,input.revision));}catch(e){if(e instanceof WorldError)throw e;throw new ApiError(400,(e as Error).message);}
    }
    if(path==='/api/trail/admin/spawn-simulation'&&request.method==='POST'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');
      const input=await body(request);let rules:SpawnRules;try{rules=validateSpawnRules(input.rules);}catch(e){throw new ApiError(400,(e as Error).message);}
      if(!Number.isSafeInteger(input.at)||input.at<0)throw new ApiError(400,'Invalid simulation time');
      const regions=await loadRegions(db),places=LANDMARKS.filter(r=>r.latitude!=null&&r.longitude!=null&&r.source),spawns=places.flatMap(p=>{const adjusted=rulesForPlace(p,input.at,rules,regions);return adjusted?[generateWorldSpawn(p,input.at,adjusted)]:[];});
      return json({simulation:true,writes:0,count:spawns.length,rarities:Object.fromEntries(['Common','Rare','Legendary'].map(r=>[r,spawns.filter(s=>s.rarity===r).length])),sample:spawns.slice(0,20)});
    }
    if(path==='/api/trail/admin/regions'&&request.method==='GET'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');return json({configuration:await loadRegions(db)});
    }
    if(path==='/api/trail/admin/regions'&&request.method==='PUT'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');const input=await body(request);try{return json(await saveRegions(db,id,input.configuration,input.revision));}catch(e){if(e instanceof WorldError)throw e;throw new ApiError(400,(e as Error).message);}
    }
    if(path==='/api/trail/admin/density'&&request.method==='GET'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');return json(await queryDensity(db,readBounds(url.searchParams)));
    }
    if(path==='/api/trail/admin/boss-rules'&&request.method==='GET'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');return json({rules:await loadBossRules(db),designs:BOSS_DESIGNS});
    }
    if(path==='/api/trail/admin/boss-rules'&&request.method==='PUT'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');const input=await body(request);try{return json(await saveBossRules(db,id,input.rules,input.revision));}catch(e){if(e instanceof WorldError)throw e;throw new ApiError(400,(e as Error).message);}
    }
    if(['/api/trail/admin/boss-places','/api/trail/admin/places'].includes(path)&&request.method==='GET'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');const q=(url.searchParams.get('q')||'').toLowerCase();if(q.length>80)throw new ApiError(400,'Search is too long');return json({places:LANDMARKS.filter(p=>p.landmarkId&&p.source&&((p.landmark||'').toLowerCase().includes(q)||p.landmarkId.includes(q))).slice(0,50).map(p=>({id:p.landmarkId,name:p.landmark,tile:p.id,latitude:p.latitude,longitude:p.longitude}))});
    }
    if(path==='/api/trail/admin/bosses'&&request.method==='POST'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');return json(await placeBoss(db,id,await body(request)));
    }
    if(path==='/api/trail/admin/bosses'&&request.method==='GET'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');return json(await queryBosses(db,readBounds(url.searchParams),Date.now(),true));
    }
    if(path==='/api/trail/admin/bosses'&&request.method==='DELETE'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');const input=await body(request);if(typeof input.id!=='string'||input.id.length>100)throw new ApiError(400,'Invalid boss identity');return json(await retireBoss(db,id,input.id));
    }
    if(path==='/api/trail/admin/boss-simulation'&&request.method==='POST'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');const input=await body(request);try{return json({simulation:true,...simulateEncounter(input.tier,input.partySize,input.contributions,input.boss,input.rules)});}catch(e){throw new ApiError(400,(e as Error).message);}
    }
    if(path==='/api/trail/admin/spawns'&&request.method==='POST'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');
      const input=await body(request),now=Date.now(),point=G.xy(input.latitude,input.longitude),tile=G.cell(point.x,point.y);
      try{return json({spawn:await placeSpawn(db,id,{version:1,id:'manual:'+crypto.randomUUID(),tileId:G.key(tile.i,tile.j),artifactType:input.artifactType,rarity:input.rarity,kind:'dynamic',position:{latitude:input.latitude,longitude:input.longitude},createdAt:now,expiresAt:now+86400000,claimPolicy:'once-per-player',origin:'world'},now)});}catch(e){if(e instanceof WorldError)throw e;throw new ApiError(400,(e as Error).message);}
    }
    if(path==='/api/trail/admin/spawns'&&request.method==='DELETE'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');const input=await body(request);if(typeof input.id!=='string'||input.id.length>200)throw new ApiError(400,'Invalid spawn identity');return json(await removeSpawn(db,id,input.id));
    }
    if(path==='/api/trail/admin/spawns'&&request.method==='GET'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');return json(await querySpawns(db,id,readBounds(url.searchParams),Date.now(),url.searchParams.get('after')||'',Number(url.searchParams.get('limit')||100),true));
    }
    if(path==='/api/trail/events'&&request.method==='POST'){
      const input=await body(request);return json(await applyWorldEvent(db,id,input.id,input.revision,input.event));
    }
    if(path==='/api/trail/visits'&&request.method==='GET'){
      const state=(await loadWorld(db,id)).world,p=state.previous||(()=>{const point=G.geo(state.game.x,state.game.y);return{latitude:point.lat,longitude:point.lon};})(),rows=await queryDensity(db,nearbyBounds(p.latitude,p.longitude),id);return json({visits:rows.density.map(row=>({tile:row.tile,players:row.players})),truncated:rows.truncated});
    }
    if(path==='/api/trail/claims'&&request.method==='GET'){
      return json(await queryClaims(db,id,url.searchParams));
    }
    if(path==='/api/trail/admin/players'&&request.method==='GET'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');
      const q=url.searchParams.get('q')||'';if(q.length>80)throw new ApiError(400,'Search is too long');
      const rows=await db.prepare('SELECT m.id,m.display_name,m.role,m.created_at,p.revision FROM trail_members m LEFT JOIN trail_players p ON p.id=m.id WHERE m.display_name LIKE ? OR m.id=? ORDER BY m.created_at DESC LIMIT 100').bind('%'+q+'%',q).all();return json({players:rows.results});
    }
    if(path==='/api/trail/admin/player'&&request.method==='GET'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');return json(await inspectPlayer(db,url.searchParams.get('id')||''));
    }
    if(path==='/api/trail/admin/player'&&request.method==='POST'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');const input=await body(request);return json(await editPlayer(db,id,input.owner,input.revision,input.action,input));
    }
    if(path==='/api/trail/balance'&&request.method==='GET')return json(await loadBalance(db));
    if(path==='/api/trail/admin/balance-history'&&request.method==='GET'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');
      const rows=await db.prepare("SELECT revision,document,updated_at FROM trail_configs WHERE id LIKE 'balance:%' ORDER BY revision DESC LIMIT 30").all<{revision:number;document:string;updated_at:number}>();return json({history:[...rows.results.map(r=>({revision:r.revision,balance:validateBalance(JSON.parse(r.document)),updatedAt:r.updated_at})),{revision:0,balance:DEV_BALANCE,updatedAt:0}]});
    }
    if(path==='/api/trail/admin/balance'&&request.method==='PUT'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');
      const input=await body(request);try{return json(await saveBalance(db,id,input.balance,input.revision));}catch(error){throw new ApiError(409,(error as Error).message);}
    }
    if(path==='/api/trail/admin/audit'&&request.method==='GET'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');
      const rows=await db.prepare('SELECT id,actor,action,target,details,created_at FROM trail_audit ORDER BY created_at DESC LIMIT 100').all();return json({audit:rows.results});
    }
    throw new ApiError(404,'Unknown API endpoint.');
  }catch(error){
    const errorPath=new URL(request.url).pathname,controlRead=['/api/trail/admin/maintenance','/api/trail/admin/snapshot','/api/trail/maintenance'].includes(errorPath)||(errorPath==='/api/trail/me'&&request.method==='GET');
    if(requestEpoch!==undefined&&env.DB&&!controlRead)try{const current=await loadMaintenance(env.DB);if(current.paused||current.revision!==requestEpoch)error=new MaintenanceError();}catch{/* Keep the original safe failure if status is unavailable. */}
    if(error instanceof MaintenanceError)return new Response(JSON.stringify({error:error.message,code:'dev-maintenance'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Retry-After':'30'}});
    if(error instanceof ApiError||error instanceof WorldError)return json({error:error.message},error.status);return unexpectedApiFailure(request,error);
  }
}
