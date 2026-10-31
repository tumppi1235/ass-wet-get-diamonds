import {applyWorldEvent,loadWorld,WorldError} from './world-store';
import type {D1Database} from '@cloudflare/workers-types';
import {loadBalance,saveBalance} from './balance-store';
type Bindings={DB?:D1Database;TRAIL_ENV?:string;TRAIL_ADMIN_EMAIL?:string;TRAIL_PUBLIC_ORIGIN?:string};
type Member={id:string;display_name:string;role:'admin'|'player';created_at:number};
class ApiError extends Error{constructor(public status:number,message:string){super(message);}}
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const name=(value:unknown)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>40)throw new ApiError(400,'Use a display name of 1–40 characters.');return value.trim();};
async function body(request:Request){const raw=await request.text();if(raw.length>131072)throw new ApiError(413,'Request is too large.');try{const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value;}catch{throw new ApiError(400,'Invalid JSON object.');}}
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
    if(path==='/api/trail/events'&&request.method==='POST'){
      const input=await body(request);return json(await applyWorldEvent(db,id,input.id,input.revision,input.event));
    }
    if(path==='/api/trail/visits'&&request.method==='GET'){
      const rows=await db.prepare('SELECT tile,COUNT(*) AS players FROM trail_visits WHERE owner<>? GROUP BY tile ORDER BY MAX(last_at) DESC LIMIT 1000').bind(id).all();return json({visits:rows.results});
    }
    if(path==='/api/trail/claims'&&request.method==='GET'){
      const rows=await db.prepare('SELECT c.tile,c.owner,c.price,c.updated_at,m.display_name FROM trail_claims c JOIN trail_members m ON m.id=c.owner ORDER BY c.updated_at DESC LIMIT 1000').all();return json({claims:rows.results});
    }
    if(path==='/api/trail/admin/players'&&request.method==='GET'){
      if(member.role!=='admin')throw new ApiError(403,'Administrator access required.');
      const rows=await db.prepare('SELECT m.id,m.display_name,m.role,m.created_at,p.revision FROM trail_members m LEFT JOIN trail_players p ON p.id=m.id ORDER BY m.created_at DESC LIMIT 100').all();return json({players:rows.results});
    }
    if(path==='/api/trail/balance'&&request.method==='GET')return json(await loadBalance(db));
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
