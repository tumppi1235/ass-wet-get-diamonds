import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {chatGPTSignInPath} from '../chatgpt-auth';
import WorldAdmin from './world-admin';
export const dynamic='force-dynamic';
export default async function AdminPage(){
  const requestHeaders=await headers(),subject=requestHeaders.get('oai-authenticated-user-id');
  if(!subject)return <main><h1>Shared dev administration</h1><a href={chatGPTSignInPath('/admin-world')} target="_top">Sign in with ChatGPT</a></main>;
  if(env.TRAIL_ENV!=='development'||!env.DB)return <main>Shared development is not configured.</main>;
  const user=await env.DB.prepare('SELECT role FROM trail_members WHERE id=?').bind(subject).first<{role:string}>();
  if(user?.role!=='admin')return <main><h1>Administrator access required</h1><p>Create your shared dev profile first. Only the configured owner can administer this world.</p><a href="/shared">Shared game</a></main>;
  return <WorldAdmin/>;
}
