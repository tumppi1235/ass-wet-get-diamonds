// Public-catalog offline checks only. No GPS, private world, provider call or reward write.
import {readFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {openLazyRouteNetwork,ROUTE_ASSET_PATH} from '../dev-server/trail/route-assets';
import {planLazyMappedRoute} from '../mobile/src/game/mapped-route';
const root=resolve(process.argv[2]??'.tools/finland-routing-runtime-v2');
type Place={landmarkId:string;landmark:string;locality?:string;latitude:number;longitude:number};
const local=JSON.parse(readFileSync('mobile/assets/landmarks.json','utf8'))as Place[],national=JSON.parse(readFileSync('mobile/assets/finland-relics.json','utf8'))as Place[],haukivuori=JSON.parse(readFileSync('mobile/assets/haukivuori-relics.json','utf8'))as Place[];
const church=local.find(p=>p.landmarkId==='church-park'),cases=[{name:'Rantalantie',start:haukivuori[0],end:haukivuori[1]},...['Helsinki','Rovaniemi'].map(name=>{const rows=national.filter(p=>p.locality===name);return{name,start:rows[0],end:rows[1]};}),{name:'Kirkkopuisto–Haukkala',start:church,end:local.find(p=>p.landmark.startsWith('Haukkala'))},{name:'Kirkkopuisto–Sippulanniemi',start:church,end:local.find(p=>p.landmark.startsWith('Sippulanniemi'))}];
for(const entry of cases)for(const movement of ['foot','bicycle']as const){
  if(!entry.start||!entry.end)throw Error('Missing fixed public catalog pair');
  let reads=0;const before=performance.now(),network=await openLazyRouteNetwork({async fetch(request){const name=new URL(request.url).pathname.slice(ROUTE_ASSET_PATH.length);if(!/^(manifest\.json|\d+_\d+\.bin)$/.test(name))throw Error('Unexpected route asset');reads++;const file=join(root,name.replace(/\.bin$/,'.json.gz'));return existsSync(file)?new Response(readFileSync(file)):new Response(null,{status:404});}},entry.start,entry.end);
  const result=await planLazyMappedRoute(network,{start:entry.start,end:entry.end,movement,access:'known-paths',maxMeters:50000});
  console.log(JSON.stringify({name:entry.name,movement,elapsedMs:Math.round(performance.now()-before),assetReads:reads,...network.statistics(),result:result.status==='ready'?{status:result.status,meters:result.meters,points:result.points.length,startOffsetMeters:result.startOffsetMeters,endOffsetMeters:result.endOffsetMeters}:result}));
}
