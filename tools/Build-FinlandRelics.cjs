// Deterministic offline catalog: every new location is an actual eligible OSM way node.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=path.join(root,'.tools/finland-source');
const G=require('../public/engine.js'),country=require('../mobile/assets/finland-boundary.json'),old=require('../mobile/assets/landmarks.json');
const data=JSON.parse(fs.readFileSync(path.join(source,'city-paths.json'),'utf8'));
function inRing(x,y,ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
const inside=p=>country.polygons.some(r=>p.lon>=r.bounds[0]&&p.lon<=r.bounds[2]&&p.lat>=r.bounds[1]&&p.lat<=r.bounds[3]&&inRing(p.lon,p.lat,r.outer)&&!r.holes.some(h=>inRing(p.lon,p.lat,h)));
const distance=(a,b)=>{const r=Math.PI/180,h=Math.sin((a.lat-b.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((a.lon-b.lon)*r/2)**2;return 12742017.6*Math.asin(Math.sqrt(Math.min(1,h)));};
const result=[],proof={},used=new Set(old.map(r=>r.id));
const types=['Compass','Rune','Stone','Shard','Crown','Key','Lantern'];
function add(way,p,name,rarity,locality){
  const xy=G.xy(p.lat,p.lon),c=G.cell(xy.x,xy.y),id=G.key(c.i,c.j);
  if(used.has(id)||!inside(p))return false;
  used.add(id);
  result.push({id,...c,landmarkId:`fi-path-${way.id}-${p.nodeId}`,landmark:`${locality} · ${way.tags.name||name+' path find'}`,name,rarity,novelty:1,latitude:p.lat,longitude:p.lon,source:`https://www.openstreetmap.org/way/${way.id}`,locality});
  proof[id]={wayId:way.id,nodeId:p.nodeId,latitude:p.lat,longitude:p.lon,tags:way.tags};return true;
}
for(const city of data.cities){
  const center={lat:city.latitude,lon:city.longitude},nodes=new Map();
  for(const way of city.ways)for(const p of way.geometry){if(nodes.has(p.nodeId))continue;const d=distance(center,p);if(d>2000||d<100)continue;nodes.set(p.nodeId,{way,p,d,angle:Math.atan2((p.lon-center.lon)*Math.cos(center.lat*Math.PI/180),p.lat-center.lat)});}
  for(let index=0;index<types.length;index++){
    const name=types[index],angle=index*2*Math.PI/types.length;
    const candidates=[...nodes.values()].map(c=>({...c,score:Math.abs(c.d-700)+Math.abs(Math.atan2(Math.sin(c.angle-angle),Math.cos(c.angle-angle)))*200+(c.way.tags.name?0:120)})).sort((a,b)=>a.score-b.score||a.way.id-b.way.id||a.p.nodeId-b.p.nodeId);
    const rarity=name==='Crown'?'Legendary':['Stone','Shard'].includes(name)?'Common':'Rare';
    if(!candidates.some(c=>add(c.way,c.p,name,rarity,city.name)))throw Error('No distinct eligible cell for '+city.name+' '+name);
  }
  console.log(city.name,types.length,'path relics');
}
let rural=0;
for(const way of (data.rural||[]).sort((a,b)=>a.id-b.id||a.point.nodeId-b.point.nodeId)){
  const p=way.point,xy=G.xy(p.lat,p.lon),c=G.cell(xy.x,xy.y),r=G.relic(c.i,c.j,{});
  if(r&&add(way,p,r.name,r.rarity,'Finnish trails'))rural++;
}
fs.writeFileSync(path.join(root,'mobile/assets/finland-relics.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(root,'mobile/assets/finland-relics-provenance.json'),JSON.stringify({source:'https://download.geofabrik.de/europe/finland-latest.osm.pbf',sourceChecksum:fs.readFileSync(path.join(source,'finland.osm.pbf.md5'),'utf8').trim(),license:'ODbL-1.0',attribution:'© OpenStreetMap contributors / Geofabrik',selectionVersion:1,cities:data.cities.map(c=>c.name),ruralCount:rural,count:result.length,records:proof},null,2)+'\n');
console.log('Built',result.length,'national relics, including',rural,'rural trail locations. Original catalog SHA256:',crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'mobile/assets/landmarks.json'))).digest('hex'));
