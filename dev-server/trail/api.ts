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
import {rulesForPlace} from '../../mobile/src/game/world-regions';
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
  try{
    if(env.TRAIL_ENV!=='development'||!env.DB)throw new ApiError(503,'Shared development services are not configured.');
    const url=new URL(request.url),path=url.pathname.replace(/\/$/,'');
    if(path==='/api/trail/health'&&request.method==='GET')return json({environment:'development',service:'trail-shared',schema:1});
    const id=identity(request),db=env.DB;
    if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==new URL(env.TRAIL_PUBLIC_ORIGIN||url.origin).origin)throw new ApiError(403,'Use the app on its own origin.');
    let member=await db.prepare('SELECT * FROM trail_members WHERE id=?').bind(id).first<Member>();
    if(path==='/api/trail/me'&&request.method==='POST'){
      const input=await body(request),displayName=name(input.displayName??'Explorer');
      const isOwner=!!env.TRAIL_ADMIN_EMAIL&&request.headers.get('oai-authenticated-user-email')?.toLowerCase()===env.TRAIL_ADMIN_EMAIL.toLowerCase();
      await db.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,displayName,isOwner?'admin':'player',Date.now()).run();
      member=await db.prepare('SELECT * FROM trail_members WHERE id=?').bind(id).first<Member>();
    }
    if(!member)throw new ApiError(404,'Create your shared dev profile first. Your local profiles remain saved.');
    if(path==='/api/trail/me'&&['GET','POST'].includes(request.method))return json({user:{id:member.id,displayName:member.display_name,username:'shared',role:member.role,createdAt:member.created_at},environment:'development'});
    if(path==='/api/trail/me'&&request.method==='PATCH'){
      const input=await body(request),displayName=name(input.displayName);
      await db.prepare('UPDATE trail_members SET display_name=? WHERE id=?').bind(displayName,id).run();return json({saved:true});
    }
    if(path==='/api/trail/world'&&request.method==='GET')return json(await loadWorld(db,id));
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
      const rows=await db.prepare('SELECT c.tile,c.owner,c.price,c.updated_at,m.display_name FROM trail_claims c JOIN trail_members m ON m.id=c.owner ORDER BY c.updated_at DESC LIMIT 1000').all();return json({claims:rows.results});
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
  }catch(error){if(error instanceof ApiError||error instanceof WorldError)return json({error:error.message},error.status);console.error('Trail API request failed');return json({error:'The shared dev service could not complete this request.'},500);}
}
