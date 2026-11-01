// Offline public-catalog smoke checks. No GPS, API, player, XP or write operations.
// Run from the repository root: node --import ./mobile/node_modules/tsx/dist/loader.mjs tools/Check-MappedRoute.mts .tools/finland-routing-dev-1
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {planMappedRoute,type MappedEdge} from '../mobile/src/game/mapped-route.ts';

const root=resolve(process.argv[2]??'.tools/finland-routing-dev-1');
const manifest=JSON.parse(readFileSync(join(root,'manifest.json'),'utf8'));
if(manifest.policy!=='finland-paths-dev-1')throw new Error('Unknown route source policy');
type Place={landmarkId:string;locality?:string;latitude:number;longitude:number};
const original=JSON.parse(readFileSync('mobile/assets/landmarks.json','utf8')) as Place[];
const national=JSON.parse(readFileSync('mobile/assets/finland-relics.json','utf8')) as Place[];
const haukivuori=JSON.parse(readFileSync('mobile/assets/haukivuori-relics.json','utf8')) as Place[];
const cases=[{name:'Jyväskylä Kirkkopuisto–Harju',start:original.find(p=>p.landmarkId==='church-park'),end:original.find(p=>p.landmarkId==='harju')},
  {name:'Haukivuori Rantalantie',start:haukivuori[0],end:haukivuori[1]},
  ...['Helsinki','Rovaniemi'].map(name=>{const places=national.filter(p=>p.locality===name);return{name,start:places[0],end:places[1]};})];
for(const item of cases){
  if(!item.start||!item.end)throw new Error('Missing public catalog case');
  const south=Math.min(item.start.latitude,item.end.latitude)-.008,north=Math.max(item.start.latitude,item.end.latitude)+.008;
  const west=Math.min(item.start.longitude,item.end.longitude)-.016,east=Math.max(item.start.longitude,item.end.longitude)+.016;
  const edges:MappedEdge[]=[];
  for(let y=Math.floor(south*1e7/500000);y<=Math.floor(north*1e7/500000);y++){
    for(let x=Math.floor(west*1e7/1000000);x<=Math.floor(east*1e7/1000000);x++){
      const key=y+'_'+x,info=manifest.chunks[key];if(!info)continue;
      const compressed=readFileSync(join(root,key+'.json.gz'));
      if(compressed.length!==info.bytes||createHash('sha256').update(compressed).digest('hex')!==info.sha256)throw new Error('Chunk checksum mismatch');
      const decoded=gunzipSync(compressed,{maxOutputLength:16*1024*1024});
      if(decoded.length!==info.decodedBytes)throw new Error('Decoded size mismatch');
      const chunk=JSON.parse(decoded.toString());if(chunk.cell!==key||chunk.policy!==manifest.policy)throw new Error('Chunk identity mismatch');
      edges.push(...chunk.edges.filter((edge:MappedEdge)=>edge.points.some(p=>p[1]/1e7>=south&&p[1]/1e7<=north&&p[2]/1e7>=west&&p[2]/1e7<=east)));
    }
  }
  for(const movement of ['foot','bicycle']as const){
    const result=planMappedRoute(edges,{start:item.start,end:item.end,movement,access:'known-paths',maxMeters:5000});
    console.log(JSON.stringify({name:item.name,movement,inputEdges:edges.length,result:result.status==='ready'?{
      status:result.status,kind:result.kind,meters:result.meters,points:result.points.length,
      startOffset:result.startOffsetMeters,endOffset:result.endOffsetMeters,wayIds:result.wayIds}:result}));
  }
}
