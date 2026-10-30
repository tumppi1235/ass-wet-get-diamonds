// Source: OSM relation 569407/full, saved as .tools/jyvaskyla-boundary.osm.
const fs=require('node:fs');
const {DOMParser}=require('../.tools/map-build/node_modules/@xmldom/xmldom');
const G=require('../public/engine.js');
const doc=new DOMParser().parseFromString(fs.readFileSync('.tools/jyvaskyla-boundary.osm','utf8'),'text/xml');
const nodes=new Map([...doc.getElementsByTagName('node')].map(n=>[n.getAttribute('id'),G.xy(Number(n.getAttribute('lat')),Number(n.getAttribute('lon')))]));
const ways=new Map([...doc.getElementsByTagName('way')].map(w=>[w.getAttribute('id'),[...w.childNodes].filter(c=>c.nodeName==='nd').map(n=>n.getAttribute('ref'))]));
const relation=[...doc.getElementsByTagName('relation')].find(r=>r.getAttribute('id')==='569407');
if(!relation)throw Error('Jyväskylä boundary relation missing');
function rings(role){const parts=[...relation.childNodes].filter(m=>m.nodeName==='member'&&m.getAttribute('type')==='way'&&m.getAttribute('role')===role).map(m=>ways.get(m.getAttribute('ref'))?.slice());if(parts.some(p=>!p))throw Error('Incomplete boundary');const output=[];while(parts.length){let ring=parts.pop();while(ring[0]!==ring.at(-1)){const index=parts.findIndex(p=>p[0]===ring.at(-1)||p.at(-1)===ring.at(-1));if(index<0)throw Error('Boundary cannot be closed');let next=parts.splice(index,1)[0];if(next[0]!==ring.at(-1))next=next.reverse();ring.push(...next.slice(1));}output.push(ring.map(id=>{const p=nodes.get(id);if(!p)throw Error('Missing boundary node');return [Math.round(p.x*10)/10,Math.round(p.y*10)/10];}));}return output;}
const outers=rings('outer'),holes=rings('inner');
function inside(p,ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
const polygons=outers.map(outer=>({outer,holes:holes.filter(h=>inside(h[0],outer))}));
const all=outers.flat(),bounds=[Math.min(...all.map(p=>p[0])),Math.min(...all.map(p=>p[1])),Math.max(...all.map(p=>p[0])),Math.max(...all.map(p=>p[1]))];
const geographicBounds=[G.geo(bounds[0],bounds[1]),G.geo(bounds[2],bounds[3])];
const data={name:'Jyväskylä',relation:569407,source:'https://www.openstreetmap.org/relation/569407',date:'2026-10-30',attribution:'© OpenStreetMap contributors · ODbL',bounds,geographicBounds,polygons};
fs.writeFileSync('mobile/assets/jyvaskyla-boundary.json',JSON.stringify(data)+'\n');
console.log({polygons:polygons.length,points:all.length,geographicBounds,bytes:fs.statSync('mobile/assets/jyvaskyla-boundary.json').size});
