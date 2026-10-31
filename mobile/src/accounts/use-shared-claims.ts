import {useCallback,useEffect,useMemo,useState} from 'react';
import type {SharedWorldClient} from './shared-world';
import {tilePoint,type TileClaim,type TileClaims} from '../game/claims';
import {claimWindow,type ClaimWindow,type ClaimCluster,type ClaimRecord,type MapBounds} from '../map/claim-window';
import {observeLocationLifecycle} from '../location/lifecycle';
const mapped=(row:ClaimRecord):TileClaim=>({ownerId:row.owner,ownerName:row.display_name,pricePaid:row.price,claimedAt:row.updated_at});
const visible=()=>typeof document==='undefined'||!document.hidden;
type MapResult={owner:string;claims:TileClaims;clusters:ClaimCluster[]};
type Detail={owner:string;tile:string;claim?:TileClaim};
type QueryError={owner:string;key:string;message:string};
/** Read-only queries do not change the GPS sender's identity, revision or pending-event journal. */
export function useSharedClaims(client:SharedWorldClient,owner:string|undefined,tile:string){
  const[view,setView]=useState<ClaimWindow|null>(null),[map,setMap]=useState<MapResult>(),[detail,setDetail]=useState<Detail>(),[mapError,setMapError]=useState<QueryError>(),[priceError,setPriceError]=useState<QueryError>(),[refreshKey,setRefreshKey]=useState(0);
  const validTile=useMemo(()=>!!tilePoint(tile),[tile]);
  const onViewBounds=useCallback((bounds:MapBounds)=>{const next=claimWindow(bounds);setView(previous=>previous?.key===next?.key?previous:next);},[]);
  const refresh=useCallback(async()=>{setDetail(undefined);setRefreshKey(value=>value+1);},[]);
  const key=view?.key;
  useEffect(()=>{
    if(!owner||!view)return;let cancelled=false,inFlight=false;const abort=new AbortController(),selected=view;
    const load=async()=>{if(cancelled||inFlight||!visible())return;inFlight=true;try{const result=await client.claimMap(selected,abort.signal);if(cancelled)return;setMap({owner,claims:Object.fromEntries(result.claims.map(row=>[row.tile,mapped(row)])),clusters:result.clusters});setMapError(result.truncated?{owner,key:selected.key,message:'Zoom in to see all nearby claims.'}:undefined);}catch(e){if(!cancelled)setMapError({owner,key:selected.key,message:'Ownership map: '+(e as Error).message});}finally{inFlight=false;}};
    const delay=setTimeout(()=>{void load();},300),poll=setInterval(()=>{void load();},30000),stop=observeLocationLifecycle(active=>{if(active)void load();});
    return()=>{cancelled=true;abort.abort();clearTimeout(delay);clearInterval(poll);stop();};
    // The quantized key is the complete tile-window identity; sub-tile map movement keeps the same view object.
  },[client,owner,view,refreshKey]);
  useEffect(()=>{
    if(!owner||!validTile)return;let cancelled=false,inFlight=false;const abort=new AbortController();
    const load=async()=>{if(cancelled||inFlight||!visible())return;inFlight=true;try{const result=await client.claimTile(tile,abort.signal);if(cancelled)return;setDetail({owner,tile,claim:result.claims[0]?mapped(result.claims[0]):undefined});setPriceError(undefined);}catch(e){if(!cancelled)setPriceError({owner,key:tile,message:'Tile price: '+(e as Error).message});}finally{inFlight=false;}};
    void load();const poll=setInterval(()=>{void load();},30000),stop=observeLocationLifecycle(active=>{if(active)void load();});return()=>{cancelled=true;abort.abort();clearInterval(poll);stop();};
  },[client,owner,tile,validTile,refreshKey]);
  const priceFailure=priceError&&priceError.owner===owner&&priceError.key===tile?priceError.message:'',mapFailure=mapError&&mapError.owner===owner&&mapError.key===key?mapError.message:'';
  const selected=detail&&detail.owner===owner&&detail.tile===tile?detail:undefined,shown=owner&&view&&map?.owner===owner?map:undefined;
  return{claims:shown?.claims||{},clusters:shown?.clusters||[],claim:selected?.claim,ready:!!selected&&!priceFailure,validTile,error:[priceFailure,mapFailure].filter(Boolean).join(' '),onViewBounds,refresh};
}
