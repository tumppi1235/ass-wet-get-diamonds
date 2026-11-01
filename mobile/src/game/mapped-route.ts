import {groundDistance,type Geographic} from '../map/geodesy';
import {validateRegions,type WorldRegions} from './world-regions';

/** Offline graph contract. Never treat a planned route as recorded activity evidence. */
export type MappedNode=[number,number,number]; // OSM ID, latitude E7, longitude E7
export type MappedEdge={id:string;way:number;f:number;b:number;meters:number;tags:Record<string,string>;points:MappedNode[]};
export type RoutePoint=Geographic&{nodeId:number};
export type MappedRoute={status:'ready';kind:'planned-map-route';points:RoutePoint[];meters:number;startOffsetMeters:number;endOffsetMeters:number;wayIds:number[]};
export type RouteUnavailable={status:'unavailable';reason:'access-unverified'|'graph-limit'|'start-unmapped'|'end-unmapped'|'disconnected'|'distance-limit'};
type Options={start:Geographic;end:Geographic;movement:'foot'|'bicycle';maxMeters:number;access:'known-paths'|'step-free';blocked?:(a:Geographic,b:Geographic)=>boolean};
type Link={to:number;way:number;meters:number};
type Node={point:RoutePoint;links:Link[]};
type Entry={id:number;g:number;f:number};
const fail=(reason:RouteUnavailable['reason']):RouteUnavailable=>({status:'unavailable',reason});
function validPoint(p:Geographic){return !!p&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180;}

/** Conservatively avoid any active blocked rectangle touching a mapped segment's
 * bounding box, including closures between its endpoints. Over-exclusion is
 * intentional; no path through a closure may be inferred from endpoint tests.
 * Call with a fresh server configuration, not a client-supplied list of regions.
 */
export function routeClosureCheck(regions:WorldRegions,now:number){
  validateRegions(regions);if(!Number.isSafeInteger(now)||now<0)throw new Error('Invalid closure time');
  const blocked=regions.regions.filter(r=>r.blocked&&now>=r.startsAt&&now<r.endsAt).map(r=>({...r}));
  return(a:Geographic,b:Geographic)=>{
    if(!validPoint(a)||!validPoint(b))throw new Error('Invalid closure coordinate');
    return blocked.some(r=>r.south<=Math.max(a.latitude,b.latitude)&&r.north>=Math.min(a.latitude,b.latitude)&&r.west<=Math.max(a.longitude,b.longitude)&&r.east>=Math.min(a.longitude,b.longitude));
  };
}

class Queue{
  private values:Entry[]=[];
  push(value:Entry){const v=this.values;v.push(value);let i=v.length-1;while(i>0){const p=(i-1)>>1;if(v[p].f<=v[i].f)break;[v[p],v[i]]=[v[i],v[p]];i=p;}}
  pop(){const v=this.values,first=v[0],last=v.pop();if(v.length&&last){v[0]=last;let i=0;while(true){let j=i*2+1;if(j>=v.length)break;if(j+1<v.length&&v[j+1].f<v[j].f)j++;if(v[i].f<=v[j].f)break;[v[i],v[j]]=[v[j],v[i]];i=j;}}return first;}
}

/** Bounded pure A*. All segments are original adjacent mapped node pairs.
 * The caller loads a bounded geographic graph, validates its manifest and supplies
 * current closure intersections. No endpoint connectors, coordinate merging,
 * inaccessible fallback, distance credit, database write or XP exists here.
 */
export function planMappedRoute(edges:MappedEdge[],options:Options):MappedRoute|RouteUnavailable{
  if(!validPoint(options.start)||!validPoint(options.end)||!['foot','bicycle'].includes(options.movement)||!Number.isInteger(options.maxMeters)||options.maxMeters<250||options.maxMeters>50000||!['known-paths','step-free'].includes(options.access))throw new Error('Invalid route preferences');
  if(options.access==='step-free')return fail('access-unverified');
  if(edges.length>30000)return fail('graph-limit');
  const nodes=new Map<number,Node>(),seen=new Map<string,string>(),mode=options.movement==='foot'?1:2;
  let count=0;
  for(const edge of edges){
    if(!edge||typeof edge.id!=='string'||edge.id.length>50||!Number.isSafeInteger(edge.way)||edge.way<=0||!Number.isInteger(edge.f)||!Number.isInteger(edge.b)||edge.f<0||edge.f>3||edge.b<0||edge.b>3||!(edge.f|edge.b)||!Array.isArray(edge.points)||edge.points.length<2||edge.points.length>10000)throw new Error('Invalid mapped edge');
    if(!((edge.f|edge.b)&mode))continue;
    const encoded=JSON.stringify(edge),prior=seen.get(edge.id);
    if(prior){if(prior!==encoded)throw new Error('Conflicting mapped edge');continue;}
    seen.set(edge.id,encoded);count+=edge.points.length;if(count>100000)return fail('graph-limit');
    const points=edge.points.map(raw=>{
      if(!Array.isArray(raw)||raw.length!==3||!raw.every(Number.isSafeInteger)||raw[0]<=0||Math.abs(raw[1])>900000000||Math.abs(raw[2])>1800000000)throw new Error('Invalid mapped coordinate');
      const point:RoutePoint={nodeId:raw[0],latitude:raw[1]/1e7,longitude:raw[2]/1e7},prior=nodes.get(point.nodeId);
      if(prior&&(prior.point.latitude!==point.latitude||prior.point.longitude!==point.longitude))throw new Error('Conflicting mapped node');
      if(!prior)nodes.set(point.nodeId,{point,links:[]});return point;
    });
    if(nodes.size>60000)return fail('graph-limit');
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],meters=groundDistance(a,b);
      if(a.nodeId===b.nodeId||meters>20000)throw new Error('Invalid mapped segment');
      if(options.blocked?.(a,b))continue;
      if(edge.f&mode)nodes.get(a.nodeId)!.links.push({to:b.nodeId,way:edge.way,meters});
      if(edge.b&mode)nodes.get(b.nodeId)!.links.push({to:a.nodeId,way:edge.way,meters});
    }
  }
  const snap=(p:Geographic)=>{let nearest:Node|undefined,distance=Infinity;for(const node of nodes.values()){const d=groundDistance(p,node.point);if(d<distance){nearest=node;distance=d;}}return{node:distance<=100?nearest:undefined,distance};};
  const start=snap(options.start),end=snap(options.end);
  if(!start.node)return fail('start-unmapped');if(!end.node)return fail('end-unmapped');
  const from=start.node.point.nodeId,target=end.node.point.nodeId;
  if(from===target)return fail('distance-limit'); // no zero-length "route" or invented connector
  const costs=new Map<number,number>([[from,0]]),parents=new Map<number,{id:number;way:number}>(),queue=new Queue();
  queue.push({id:from,g:0,f:groundDistance(start.node.point,end.node.point)});
  let expansions=0,limited=false;
  while(true){
    const current=queue.pop();if(!current)break;if(current.g!==costs.get(current.id))continue;
    if(++expansions>100000)return fail('graph-limit');
    if(current.id===target){
      const points:RoutePoint[]=[],ways=new Set<number>();let id=target;
      while(true){points.push(nodes.get(id)!.point);if(points.length>20000)return fail('graph-limit');if(id===from)break;const parent=parents.get(id)!;ways.add(parent.way);id=parent.id;}
      return{status:'ready',kind:'planned-map-route',points:points.reverse(),meters:current.g,startOffsetMeters:start.distance,endOffsetMeters:end.distance,wayIds:[...ways].sort((a,b)=>a-b)};
    }
    for(const link of nodes.get(current.id)!.links){
      const g=current.g+link.meters;if(g>options.maxMeters){limited=true;continue;}
      if(g>=(costs.get(link.to)??Infinity))continue;
      costs.set(link.to,g);parents.set(link.to,{id:current.id,way:link.way});queue.push({id:link.to,g,f:g+groundDistance(nodes.get(link.to)!.point,end.node.point)});
    }
  }
  return fail(limited?'distance-limit':'disconnected');
}
