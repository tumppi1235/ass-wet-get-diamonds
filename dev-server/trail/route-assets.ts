import {groundDistance,type Geographic} from '../../mobile/src/map/geodesy';
import type {MappedEdge} from '../../mobile/src/game/mapped-route';
export type RouteAssets={fetch(request:Request):Promise<Response>};
export const ROUTE_MANIFEST_SHA='e16d062504f74c74585ac1538654daedac7cb74add4015f4d217bb6c8104e295';
export const ROUTE_ASSET_PATH='/routing/'+ROUTE_MANIFEST_SHA+'/';
export const ROUTE_POLICY='finland-paths-dev-1';
export class RouteAssetError extends Error{constructor(public reason:'data-unavailable'|'graph-limit'|'data-invalid'){super(reason);}}
type ChunkInfo={sha256:string;bytes:number;decodedBytes:number;edges:number};
type Manifest={version:number;policy:string;source:{timestamp:string;md5:string};chunks:Record<string,ChunkInfo>};
async function bounded(response:Response,max:number){
  if(!response.ok||!response.body)throw new RouteAssetError('data-unavailable');
  const reader=response.body.getReader(),parts:Uint8Array[]=[];let size=0;
  try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>max){await reader.cancel();throw new RouteAssetError('graph-limit');}parts.push(next.value);}}finally{reader.releaseLock();}
  const result=new Uint8Array(size);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.byteLength;}return result;
}
async function hash(bytes:Uint8Array){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>))).map(n=>n.toString(16).padStart(2,'0')).join('');}
/** Same-origin immutable static assets only; no player locations sent to map providers.
 * No global country/graph cache. Each request has compressed/decoded/chunk/point bounds.
 */
export async function loadRouteEdges(assets:RouteAssets|undefined,start:Geographic,end:Geographic){
  if(!assets)throw new RouteAssetError('data-unavailable');
  const get=(name:string)=>assets.fetch(new Request('https://route-assets.invalid'+ROUTE_ASSET_PATH+name));
  const bytes=await bounded(await get('manifest.json'),2*1024*1024);
  if(await hash(bytes)!==ROUTE_MANIFEST_SHA)throw new RouteAssetError('data-invalid');
  const manifest=JSON.parse(new TextDecoder().decode(bytes)) as Manifest;
  if(manifest.version!==1||manifest.policy!==ROUTE_POLICY||manifest.source.md5!=='5b113c7a2c31d8465eead4a958eab97b')throw new RouteAssetError('data-invalid');
  if(groundDistance(start,end)>50000)throw new RouteAssetError('graph-limit');
  // A local search envelope, not proof that no route exists outside this area.
  const south=Math.min(start.latitude,end.latitude)-.01,north=Math.max(start.latitude,end.latitude)+.01;
  const longitudeMargin=.01/Math.cos(Math.max(Math.abs(start.latitude),Math.abs(end.latitude))*Math.PI/180);
  const west=Math.min(start.longitude,end.longitude)-longitudeMargin,east=Math.max(start.longitude,end.longitude)+longitudeMargin;
  const keys:string[]=[];
  for(let y=Math.floor(south*1e7/500000);y<=Math.floor(north*1e7/500000);y++)for(let x=Math.floor(west*1e7/1000000);x<=Math.floor(east*1e7/1000000);x++){
    if(keys.length>=40)throw new RouteAssetError('graph-limit');keys.push(y+'_'+x);
  }
  let decodedTotal=0,pointCount=0;const edges:MappedEdge[]=[];
  for(const key of keys){
    const info=manifest.chunks[key];if(!info)continue;
    if(!/^[a-f0-9]{64}$/.test(info.sha256)||!Number.isSafeInteger(info.bytes)||info.bytes<0||info.bytes>4*1024*1024||!Number.isSafeInteger(info.decodedBytes)||info.decodedBytes<0||info.decodedBytes>10*1024*1024)throw new RouteAssetError('data-invalid');
    decodedTotal+=info.decodedBytes;if(decodedTotal>16*1024*1024)throw new RouteAssetError('graph-limit');
    const compressed=await bounded(await get(key+'.bin'),info.bytes);
    if(compressed.byteLength!==info.bytes||await hash(compressed)!==info.sha256)throw new RouteAssetError('data-invalid');
    // Opaque .bin avoids preview/server automatic decoding of .gz filenames.
    const stream=new Blob([compressed as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('gzip'));
    const decoded=await bounded(new Response(stream),info.decodedBytes);
    if(decoded.byteLength!==info.decodedBytes)throw new RouteAssetError('data-invalid');
    const chunk=JSON.parse(new TextDecoder().decode(decoded));
    if(chunk.version!==1||chunk.policy!==ROUTE_POLICY||chunk.cell!==key||!Array.isArray(chunk.edges)||chunk.edges.length!==info.edges)throw new RouteAssetError('data-invalid');
    for(const edge of chunk.edges as MappedEdge[]){
      if(!Array.isArray(edge.points))throw new RouteAssetError('data-invalid');
      if(!edge.points.some((p,i)=>{const q=edge.points[Math.max(0,i-1)];return Math.min(p[1],q[1])/1e7<=north&&Math.max(p[1],q[1])/1e7>=south&&Math.min(p[2],q[2])/1e7<=east&&Math.max(p[2],q[2])/1e7>=west;}))continue;
      pointCount+=edge.points.length;if(pointCount>100000||edges.length>=30000)throw new RouteAssetError('graph-limit');edges.push(edge);
    }
  }
  return{edges,sourceDate:manifest.source.timestamp,source:manifest.source.md5,coverage:'bounded-envelope' as const};
}
