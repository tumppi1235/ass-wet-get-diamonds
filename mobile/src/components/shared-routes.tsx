import React,{useEffect,useRef,useState} from 'react';
import {Platform,Text,View} from 'react-native';
import {Button,Field,styles} from './ui';
import {LANDMARKS,catalogLabel,searchCatalog} from '../game/landmarks';
import type {SharedWorldClient} from '../accounts/shared-world';
import type {RoutePlan,RoutePlanInput} from '../game/route-plan';
import {plannedRouteGpx} from '../game/route-gpx';
const initial:RoutePlanInput={from:'gps',to:'',movement:'foot',maxMeters:5000,access:'known-paths'};
const messages:Record<string,string>={
  'access-unverified':'Step-free access is not verified for this network.',
  'graph-limit':'This plan exceeds the current search limit. Try a closer destination.',
  'distance-limit':'No mapped route was found within this distance budget.',
  'start-unmapped':'No permitted mapped start was found within 100 m.',
  'end-unmapped':'No permitted mapped destination was found within 100 m.',
  disconnected:'No connected permitted route was found in the searched area. No shortcut was drawn.',
  'data-unavailable':'The route map data is currently unavailable. Try again later.',
  'data-invalid':'The route map data could not be verified. Try again later.',
  busy:'The route planner is busy. Try again shortly.',
};
export function SharedRoutes({client,plan,onPlan,onShow}:{client:SharedWorldClient;plan?:RoutePlan;onPlan(plan?:RoutePlan):void;onShow():void}){
  const[input,setInput]=useState(plan?.preferences||initial),[originSearch,setOriginSearch]=useState(LANDMARKS.find(p=>p.landmarkId===plan?.preferences?.from)?.landmark||''),[search,setSearch]=useState(LANDMARKS.find(p=>p.landmarkId===plan?.preferences?.to)?.landmark||''),[catalogOrigin,setCatalogOrigin]=useState(plan?.preview||false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const sequence=useRef(0),request=useRef<AbortController|null>(null);
  useEffect(()=>()=>{sequence.current++;request.current?.abort();},[]);
  const change=(patch:Partial<RoutePlanInput>)=>{sequence.current++;request.current?.abort();setBusy(false);setInput(value=>({...value,...patch}));onPlan(undefined);setError('');};
  const matches=searchCatalog;
  const load=async()=>{request.current?.abort();const abort=new AbortController(),id=++sequence.current;request.current=abort;setBusy(true);setError('');onPlan(undefined);try{const result=await client.route(input,abort.signal);if(sequence.current===id)onPlan(result);}catch(e){if(sequence.current===id)setError((e as Error).message);}finally{if(sequence.current===id)setBusy(false);}};
  const download=()=>{if(!plan)return;try{const gpx=plannedRouteGpx(plan),url=URL.createObjectURL(new Blob([gpx],{type:'application/gpx+xml;charset=utf-8'})),anchor=document.createElement('a');anchor.href=url;anchor.download='TrailRelics-Planned-'+plan.destination.replace(/[^a-z0-9]+/gi,'-').slice(0,60)+'.gpx';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}catch(e){setError((e as Error).message);}};
  const origin=LANDMARKS.find(p=>p.landmarkId===input.from),destination=LANDMARKS.find(p=>p.landmarkId===input.to);
  return <View style={{gap:12}}><Text style={styles.heading}>Mapped route</Text><Text style={styles.small}>Plan to a public destination. Gold dashed lines are plans; your recorded adventure remains separate.</Text>
    <View style={styles.row}><Button title="From my GPS" quiet={catalogOrigin} onPress={()=>{setCatalogOrigin(false);change({from:'gps'});}}/><Button title="Public preview" quiet={!catalogOrigin} onPress={()=>{setCatalogOrigin(true);change({from:''});}}/></View>
    {catalogOrigin?<><Field label="Find preview origin" value={originSearch} onChangeText={setOriginSearch} placeholder="e.g. Haukkala, Rantalantie"/>{matches(originSearch).map(p=><Button key={p.landmarkId} title={catalogLabel(p)} quiet={input.from!==p.landmarkId} onPress={()=>change({from:p.landmarkId!})}/>)}<Text style={styles.small}>Preview origin: {origin?.landmark||'choose a catalog point'}. A preview does not move your player or start an adventure.</Text></>:<Text style={styles.small}>Use Me for a fresh accurate GPS fix before planning from your location.</Text>}
    <Field label="Find route destination" value={search} onChangeText={setSearch} placeholder="City or landmark, at least 2 letters"/>{matches(search).map(p=><Button key={p.landmarkId} title={catalogLabel(p)} quiet={input.to!==p.landmarkId} onPress={()=>change({to:p.landmarkId!})}/>)}<Text style={styles.small}>Destination: {destination?.landmark||'choose a public catalog point'}</Text>
    <View style={styles.row}>{(['foot','bicycle']as const).map(movement=><Button key={movement} title={movement==='foot'?'Foot route':'Bicycle route'} quiet={input.movement!==movement} onPress={()=>change({movement})}/>)}</View>
    <Text style={styles.eyebrow}>Maximum mapped distance</Text><View style={styles.row}>{[1000,3000,5000,10000,20000,50000].map(maxMeters=><Button key={maxMeters} title={`${maxMeters/1000} km`} quiet={input.maxMeters!==maxMeters} onPress={()=>change({maxMeters})}/>)}</View>
    <View style={styles.row}><Button title="Mapped paths" quiet={input.access!=='known-paths'} onPress={()=>change({access:'known-paths'})}/><Button title="Step-free required" quiet={input.access!=='step-free'} onPress={()=>change({access:'step-free'})}/></View>
    <Button title="Plan mapped route" disabled={!input.from||!input.to} busy={busy} onPress={()=>{void load();}}/>{error&&<Text style={styles.error}>{error}</Text>}
    {plan&&<><Text style={styles.small}>{plan.preview?'PUBLIC PREVIEW':'GPS START'} · {plan.destination} · planned {new Date(plan.generatedAt).toLocaleTimeString()}</Text>{plan.result.status==='ready'?<><Text style={styles.body}>{(plan.result.meters/1000).toFixed(2)} km mapped · start offset {Math.ceil(plan.result.startOffsetMeters)} m · destination offset {Math.ceil(plan.result.endOffsetMeters)} m</Text><Text style={styles.small}>Offsets are excluded from the line and distance. Check access from your location to the mapped start. No connector is assumed.</Text><View style={styles.row}><Button title="Show route on map" onPress={onShow}/>{Platform.OS==='web'&&<Button title="Download planned GPX" quiet onPress={download}/>}<Button title="Clear route" quiet onPress={()=>onPlan(undefined)}/></View><Text style={styles.small}>OSM source {plan.sourceDate?.slice(0,10)} · mapped access, difficulty and current conditions need checking. GPX is navigation only; no recorded activity or rewards.</Text></>:<Text style={styles.error}>{messages[plan.result.reason]||'This route is unavailable.'}</Text>}</>}
  </View>;
}
