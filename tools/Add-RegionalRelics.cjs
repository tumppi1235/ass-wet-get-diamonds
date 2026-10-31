// Add missing artefact kinds at actual public-path nodes from two local OSM extracts.
// Usage: node tools/Add-RegionalRelics.cjs <haukkala.osm> <sippulanniemi.osm>
// Uses the XML reader from the existing map tooling. Never downloads or overwrites a find.
const fs=require('node:fs'),path=require('node:path');
const {DOMParser}=require('../.tools/map-build/node_modules/@xmldom/xmldom');
const G=require('../public/engine');
const output=path.join(__dirname,'../mobile/assets/landmarks.json');
const relics=JSON.parse(fs.readFileSync(output,'utf8')),used=new Set(relics.map(r=>r.id));
const kinds=['Compass','Rune','Stone','Shard','Crown','Key','Lantern'];
const areas=[
 {name:'Haukkala',prefix:'haukkala',file:process.argv[2],bounds:[62.269,25.693,62.275,25.705]},
 {name:'Sippulanniemi',prefix:'sippula',file:process.argv[3],bounds:[62.200,25.734,62.219,25.759]},
];
for(const area of areas){
 if(!area.file)throw Error('Provide both OSM extract paths.');
 const xml=new DOMParser().parseFromString(fs.readFileSync(area.file,'utf8'),'text/xml');
 const nodes=new Map([...xml.getElementsByTagName('node')].map(n=>[n.getAttribute('id'),{lat:+n.getAttribute('lat'),lon:+n.getAttribute('lon')} ]));
 const candidates=[];
 for(const way of xml.getElementsByTagName('way')){
   const tags=Object.fromEntries([...way.getElementsByTagName('tag')].map(t=>[t.getAttribute('k'),t.getAttribute('v')]));
   if(!['path','footway','pedestrian','cycleway','track','steps'].includes(tags.highway)||['no','private'].includes(tags.access)||['no','private'].includes(tags.foot))continue;
   for(const nd of way.getElementsByTagName('nd')){
     const p=nodes.get(nd.getAttribute('ref'));
     if(!p||p.lat<area.bounds[0]||p.lat>area.bounds[2]||p.lon<area.bounds[1]||p.lon>area.bounds[3])continue;
     const xy=G.xy(p.lat,p.lon),cell=G.cell(xy.x,xy.y);
     candidates.push({...p,...xy,...cell,id:G.key(cell.i,cell.j),source:'https://www.openstreetmap.org/way/'+way.getAttribute('id')});
   }
 }
 const regional=relics.filter(r=>r.landmark.startsWith(area.name));
 for(const name of kinds){
   if(regional.some(r=>r.name===name))continue;
   const nearest=p=>Math.min(...regional.map(r=>{const v=G.xy(r.latitude,r.longitude);return Math.hypot(p.x-v.x,p.y-v.y);}));
   const p=candidates.filter(p=>!used.has(p.id)).sort((a,b)=>nearest(b)-nearest(a)||a.lat-b.lat||a.lon-b.lon)[0];
   if(!p||nearest(p)<140)throw Error(area.name+': no sufficiently separated path location for '+name);
   const relic={id:p.id,i:p.i,j:p.j,landmarkId:area.prefix+'-'+name.toLowerCase(),landmark:area.name+' · '+name+' trail find',name,
     rarity:name==='Crown'?'Legendary':['Stone','Shard'].includes(name)?'Common':'Rare',novelty:1,
     latitude:p.lat,longitude:p.lon,source:p.source,captureRadius:70};
   relics.push(relic);regional.push(relic);used.add(p.id);
   console.log(area.name,name,p.id,p.lat,p.lon);
 }
}
fs.writeFileSync(output,JSON.stringify(relics,null,2)+'\n');
