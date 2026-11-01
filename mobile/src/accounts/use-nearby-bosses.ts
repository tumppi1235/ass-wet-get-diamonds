import {useEffect,useState} from 'react';
import type {SharedWorldClient} from './shared-world';
import type {Boss} from '../game/bosses';

/** Load independently of the drawer. GPS jitter cannot restart this bounded query. */
export function useNearbyBosses(client:SharedWorldClient,owner:string|undefined,latitude:number,longitude:number){
  const [result,setResult]=useState<{owner?:string;bosses:Boss[];error:string}>({bosses:[],error:''});
  const lat=Math.round(latitude*100)/100,lon=Math.round(longitude*100)/100;
  useEffect(()=>{
    if(!owner)return;let cancelled=false,inFlight=false;
    const load=async()=>{if(cancelled||inFlight||(typeof document!=='undefined'&&document.hidden))return;inFlight=true;
      try{const response=await client.bosses({south:lat-.1,north:lat+.1,west:lon-.2,east:lon+.2});if(!cancelled)setResult({owner,bosses:response.bosses.filter(b=>!b.retired).map(b=>b.boss),error:''});}
      catch(e){if(!cancelled)setResult(old=>({owner,bosses:old.owner===owner?old.bosses:[],error:(e as Error).message}));}
      finally{inFlight=false;}};
    void load();const timer=setInterval(()=>{void load();},30000);return()=>{cancelled=true;clearInterval(timer);};
  },[client,owner,lat,lon]);
  return result.owner===owner?result:{bosses:[],error:''};
}
