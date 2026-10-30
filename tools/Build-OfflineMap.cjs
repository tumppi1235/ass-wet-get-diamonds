// Requires @xmldom/xmldom in .tools/map-build and .tools/map-{0..4}.osm.
// Parts 0..3 are regional extracts; part 4 is full lake relation 1302994.
const fs=require('node:fs');
const {DOMParser}=require('../.tools/map-build/node_modules/@xmldom/xmldom');
const G=require('../public/engine.js');
const nodes=new Map(),ways=new Map(),relations=new Map(),labels=[];
function tags(e){const t={};for(const child of e.childNodes)if(child.nodeName==='tag')t[child.getAttribute('k')]=child.getAttribute('v');return t;}
function children(e,name){return [...e.childNodes].filter(c=>c.nodeName===name);}
for(let part=0;part<5;part++){
 const doc=new DOMParser().parseFromString(fs.readFileSync(`.tools/map-${part}.osm`,'utf8'),'text/xml');
 for(const n of doc.getElementsByTagName('node')){const p=G.xy(Number(n.getAttribute('lat')),Number(n.getAttribute('lon'))),t=tags(n);nodes.set(n.getAttribute('id'),[Math.round(p.x*10)/10,Math.round(p.y*10)/10]);if(t.place&&t.name)labels.push({p:nodes.get(n.getAttribute('id')),name:t.name,type:t.place});}
 for(const w of doc.getElementsByTagName('way'))ways.set(w.getAttribute('id'),{ids:children(w,'nd').map(n=>n.getAttribute('ref')),t:tags(w)});
 for(const r of doc.getElementsByTagName('relation'))relations.set(r.getAttribute('id'),{members:children(r,'member').map(m=>({id:m.getAttribute('ref'),role:m.getAttribute('role'),type:m.getAttribute('type')})),t:tags(r)});
}
function kind(t){if(t.natural==='water'||t.waterway==='riverbank'||t.landuse==='reservoir')return 'water';if(t.building&&t.building!=='no')return 'building';if(t.natural==='wood'||t.landuse==='forest')return 'forest';if(['park','garden','recreation_ground','pitch'].includes(t.leisure)||['grass','meadow','village_green','recreation_ground'].includes(t.landuse)||['grassland','scrub'].includes(t.natural))return 'park';if(t.highway&&t.area!=='yes'&&!['proposed','construction'].includes(t.highway))return 'road';if(t.railway==='rail')return 'rail';return null;}
function feature(k,ids,t,holes=[]){const points=ids.map(id=>nodes.get(id));if(points.length<2||points.some(p=>!p))return null;const x=points.map(p=>p[0]),y=points.map(p=>p[1]);return {k,p:points,b:[Math.min(...x),Math.min(...y),Math.max(...x),Math.max(...y)],...(t.name?{n:t.name}:{}),...(k==='road'?{t:t.highway}:{}),...(holes.length?{holes}:{}),closed:ids[0]===ids.at(-1)};}
function rings(members){const segments=members.map(m=>ways.get(m.id)?.ids.slice()).filter(Boolean),result=[];while(segments.length){let ring=segments.pop(),changed=true;while(ring[0]!==ring.at(-1)&&changed){changed=false;for(let i=0;i<segments.length;i++){let s=segments[i];if(s[0]===ring.at(-1)||s.at(-1)===ring.at(-1)){if(s[0]!==ring.at(-1))s=s.slice().reverse();ring.push(...s.slice(1));segments.splice(i,1);changed=true;break;}}}if(ring[0]===ring.at(-1))result.push(ring);}return result;}
const features=[];
for(const w of ways.values()){const k=kind(w.t);if(k){const f=feature(k,w.ids,w.t);if(f&&(k==='road'||k==='rail'||f.closed))features.push(f);}}
for(const r of relations.values()){const k=kind(r.t);if(k&&!['road','rail','building'].includes(k)&&r.t.type==='multipolygon'){const outer=rings(r.members.filter(m=>m.type==='way'&&m.role!=='inner')),inner=rings(r.members.filter(m=>m.type==='way'&&m.role==='inner')).map(ids=>ids.map(id=>nodes.get(id))).filter(points=>points.every(Boolean));for(const ring of outer){const f=feature(k,ring,r.t,inner);if(f)features.push(f);}}}
const min=G.xy(62.229,25.720),max=G.xy(62.253,25.768);
const data={bounds:[min.x,min.y,max.x,max.y],attribution:'© OpenStreetMap contributors · ODbL',date:'2026-10-30',features,labels:[...new Map(labels.map(l=>[l.name,l])).values()]};
fs.writeFileSync('android/assets/city-map-data.js','window.TrailCityMap='+JSON.stringify(data)+';\n');
if(fs.existsSync('mobile/assets'))fs.writeFileSync('mobile/assets/city-map.json',JSON.stringify(data)+'\n');
console.log('Offline map:',features.length,'features,',data.labels.length,'place labels,',fs.statSync('android/assets/city-map-data.js').size,'bytes');console.log(Object.fromEntries([...new Set(features.map(f=>f.k))].map(k=>[k,features.filter(f=>f.k===k).length])));
