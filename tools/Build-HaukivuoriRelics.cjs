// Offline addition only: existing Jyväskylä/national catalogs and collected IDs are never rewritten.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),G=require('../public/engine.js');
const source=JSON.parse(fs.readFileSync(path.join(root,'.tools/finland-source/haukivuori-paths.json'),'utf8'));
const roads=source.roads.filter(r=>r.id===1156889836);if(roads.length!==1)throw Error('Exact Haukivuori Rantalantie missing');
const road=roads[0],roadPoints=road.geometry;
const distance=(a,b)=>{const r=Math.PI/180,h=Math.sin((a.lat-b.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((a.lon-b.lon)*r/2)**2;return 12742017.6*Math.asin(Math.sqrt(Math.min(1,h)));};
const used=new Set([...require('../mobile/assets/landmarks.json'),...require('../mobile/assets/finland-relics.json')].map(r=>r.id)),best=new Map();
for(const way of source.ways)for(const p of way.geometry){
  const near=Math.min(...roadPoints.map(q=>distance(p,q)));if(near>900)continue;
  const xy=G.xy(p.lat,p.lon),c=G.cell(xy.x,xy.y),id=G.key(c.i,c.j);if(used.has(id))continue;
  const old=best.get(id),rank=near+(way.id===road.id?-1000:0);
  if(!old||rank<old.rank)best.set(id,{way,p,c,id,near,rank});
}
const chosen=[...best.values()].sort((a,b)=>a.rank-b.rank||a.way.id-b.way.id||a.p.nodeId-b.p.nodeId).slice(0,28);
if(chosen.length<21)throw Error('Only '+chosen.length+' eligible cells within 900m; review rather than inventing locations');
const names=['Compass','Rune','Stone','Shard','Crown','Key','Lantern'],records={};
const relics=chosen.map((v,index)=>{
  const name=names[index%names.length],rarity=name==='Crown'?'Legendary':['Stone','Shard'].includes(name)?'Common':'Rare';
  records[v.id]={wayId:v.way.id,nodeId:v.p.nodeId,latitude:v.p.lat,longitude:v.p.lon,distanceToRantalantie:v.near,tags:v.way.tags};
  return{id:v.id,...v.c,landmarkId:`haukivuori-rantalantie-${v.way.id}-${v.p.nodeId}`,landmark:`Haukivuori · Rantalantie · ${name} ${String(index+1).padStart(2,'0')}`,name,rarity,novelty:1,latitude:v.p.lat,longitude:v.p.lon,source:`https://www.openstreetmap.org/way/${v.way.id}`,locality:'Haukivuori · Rantalantie'};
});
fs.writeFileSync(path.join(root,'mobile/assets/haukivuori-relics.json'),JSON.stringify(relics,null,2)+'\n');
fs.writeFileSync(path.join(root,'mobile/assets/haukivuori-relics-provenance.json'),JSON.stringify({license:'ODbL-1.0',attribution:'© OpenStreetMap contributors / Geofabrik',source:'https://download.geofabrik.de/europe/finland-latest.osm.pbf',sourceChecksum:fs.readFileSync(path.join(root,'.tools/finland-source/finland.osm.pbf.md5'),'utf8').trim(),road:{wayId:road.id,tags:road.tags,geometry:roadPoints},count:relics.length,maxDistance:Math.max(...chosen.map(v=>v.near)),records},null,2)+'\n');
console.log('Added',relics.length,'relics in distinct cells; max distance to Rantalantie:',Math.round(Math.max(...chosen.map(v=>v.near))),'m; roadside:',chosen.filter(v=>v.way.id===road.id).length);
