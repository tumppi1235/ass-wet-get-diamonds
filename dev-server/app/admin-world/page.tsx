import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {chatGPTSignInPath} from '../chatgpt-auth';
import WorldAdmin from './world-admin';
import {serviceScope} from '../../trail/service-scope';
export const dynamic='force-dynamic';
export default async function AdminPage(){
  const requestHeaders=await headers(),subject=requestHeaders.get('oai-authenticated-user-id');
  if(!subject)return <main><h1>Shared world administration</h1><a href={chatGPTSignInPath('/admin-world')} target="_top">Sign in with ChatGPT</a></main>;
  if(!env.DB)return <main>Shared services are not configured.</main>;
  let scope;try{scope=serviceScope(env);}catch{return <main>Shared environment is not configured.</main>;}
  const user=await env.DB.prepare('SELECT role FROM trail_members WHERE id=?').bind(subject).first<{role:string}>();
  if(user?.role!=='admin')return <main><h1>Administrator access required</h1><p>Create your shared profile first. Only the configured owner can administer this world.</p><a href="/shared">Shared game</a></main>;
  return <WorldAdmin environment={scope.environment}/>;
}
