'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Game pages are a separate Expo static app; cross-client navigation must reload. */
import {useCallback,useEffect,useState} from 'react';
import SpawnAdmin from './spawn-admin';
import PlayerAdmin from './player-admin';
import ProgressionAdmin from './progression-admin';
import WorldMap from './world-map';
import type {DevBalance} from '../../../mobile/src/game/dev-world';
type Balance=DevBalance;
type Audit={id:string;action:string;target:string;created_at:number};
type Config={balance:Balance;revision:number};
async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{const r=await fetch('/api/trail/'+path,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json() as T&{error?:string};if(!r.ok)throw new Error(data.error||'Request failed');return data;}
export default function WorldAdmin(){
  const [config,setConfig]=useState<{balance:Balance;revision:number}|null>(null),[audit,setAudit]=useState<{id:string;action:string;target:string;created_at:number}[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const reload=useCallback(async()=>{const[c,a]=await Promise.all([api<Config>('balance'),api<{audit:Audit[]}>('admin/audit')]);setConfig(c);setAudit(a.audit);},[]);
  useEffect(()=>{let cancelled=false;void Promise.all([api<Config>('balance'),api<{audit:Audit[]}>('admin/audit')]).then(([c,a])=>{if(!cancelled){setConfig(c);setAudit(a.audit);}}).catch(e=>{if(!cancelled)setMessage(e.message);});return()=>{cancelled=true;};},[]);
  async function save(){if(!config)return;setBusy(true);try{await api('admin/balance','PUT',config);await reload();setMessage('Experimental balance saved as a new dev revision. Existing XP was not recalculated.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  const labels:Record<Exclude<keyof Balance,'revision'>,string>={curveCoefficient:'Quadratic curve coefficient',tileXp:'Exploration XP per first tile',regionXp:'Agility XP per first regional block',findXp:'Perception XP per collected artefact',enduranceMetersPerXp:'Equivalent metres per Endurance XP',footFactor:'Foot effort factor',bicycleFactor:'Bicycle effort factor',footMaxSpeed:'Foot speed limit (m/s)',bicycleMaxSpeed:'Bicycle speed limit (m/s)'};
  return <main className="trail-admin" style={{maxWidth:1000,margin:'auto',padding:24,background:'#142A2B',color:'#F5E7BB',fontFamily:'monospace',minHeight:'100vh'}}><h1>TRAIL RELICS · DEV ADMIN</h1><p>Shared development only. Production and phone-local saves are separate.</p><nav><a href="/shared" style={{color:'#E6B653'}}>Shared game</a> · <a href="/" style={{color:'#E6B653'}}>Local game</a></nav>{message&&<p role="status">{message}</p>}
    <section style={{border:'2px solid #E6B653',padding:20,marginTop:20}}><h2>Experimental balance</h2><p>Revision {config?.balance.revision}. Changes affect future accepted events, without retroactive XP.</p>{config&&Object.entries(labels).map(([key,label])=><label key={key} style={{display:'flex',gap:20,justifyContent:'space-between',padding:8}}>{label}<input aria-label={label} type="number" step={key.endsWith('Factor')?'.1':'1'} value={config.balance[key as keyof typeof labels]} onChange={e=>setConfig({...config,balance:{...config.balance,[key]:Number(e.target.value)}})} style={{width:100,color:'#142A2B',background:'#F5E7BB',padding:6}}/></label>)}<button disabled={busy||!config} onClick={()=>{void save();}}>Save new dev revision</button></section>
    {config&&<ProgressionAdmin balance={config.balance} onUseHistory={balance=>{setConfig({...config,balance:{...balance,revision:config.balance.revision}});setMessage('Earlier balance copied into the draft. Review it, then save a new dev revision.');}}/>}
    <PlayerAdmin/>
    <SpawnAdmin/>
    <WorldMap/>
    <section style={{padding:20}}><h2>Recent audit</h2><button onClick={()=>{void reload().catch(e=>setMessage(e.message));}}>Refresh audit</button><ul>{audit.map(a=><li key={a.id}>{new Date(a.created_at).toLocaleString()} · {a.action} · {a.target}</li>)}</ul></section></main>;
}
