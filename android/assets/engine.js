(function(root){
'use strict';
const ORIGIN={lat:62.2415,lon:25.7472};
const M=111320, COS=Math.cos(ORIGIN.lat*Math.PI/180), TILE=250;
function xy(lat,lon){return {x:(lon-ORIGIN.lon)*M*COS,y:(lat-ORIGIN.lat)*M};}
function geo(x,y){return {lat:ORIGIN.lat+y/M,lon:ORIGIN.lon+x/(M*COS)};}
function cell(x,y){return {i:Math.floor(x/TILE),j:Math.floor(y/TILE)};}
function key(i,j){return i+','+j;}
function hash(i,j,salt=0){let n=Math.imul(i+7919,374761393)^Math.imul(j+104729,668265263)^Math.imul(salt+31,1274126177);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
const weather={clear:{label:'Clear',bonus:0,icon:'☀',form:'Sun'},rain:{label:'Rain',bonus:.08,icon:'☂',form:'Rain'},snow:{label:'Snow',bonus:.10,icon:'❄',form:'Frost'},cold:{label:'Cold',bonus:.05,icon:'◈',form:'Ice'}};
function energyChance(m){return m<1000?.2:m<3000?.35:m<5000?.5:m<8000?.65:.75;}
function novelty(visits,i,j){let total=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)total+=Math.min(3,visits[key(i+a,j+b)]||0);return 1-Math.min(1,total/18);}
function relic(i,j,visits){if(hash(i,j,1)>.64)return null;const n=novelty(visits,i,j),r=hash(i,j,2);const rarity=r<.025+n*.075?'Legendary':r<.12+n*.18?'Rare':'Common';const names=['Compass','Rune','Lantern','Crown','Shard','Key'];return {id:key(i,j),i,j,rarity,name:names[Math.floor(hash(i,j,3)*names.length)],novelty:n};}
function chance(m,weatherId,rarity,total){const modifier=rarity==='Legendary'?0:rarity==='Rare'?.1:.25;return Math.min(.9,energyChance(m)+modifier+weather[weatherId].bonus+Math.min(.05,total/100000));}
function initial(){return {version:1,x:0,y:0,meters:0,energy:0,elapsed:0,outing:1,visits:{},revealed:{},collection:[],searched:{},path:[],weather:'clear',log:[]};}
function vision(s){const c=cell(s.x,s.y),found=[];for(let i=c.i-1;i<=c.i+1;i++)for(let j=c.j-1;j<=c.j+1;j++){const id=key(i,j);if(!Object.hasOwn(s.revealed,id))s.revealed[id]=relic(i,j,s.visits);if(s.revealed[id])found.push(s.revealed[id]);}return found;}
function enter(s){const c=cell(s.x,s.y),id=key(c.i,c.j);if(s.lastCell===id){vision(s);return false;}s.lastCell=id;vision(s);s.visits[id]=(s.visits[id]||0)+1;return true;}
function move(s,dx,dy){const d=Math.hypot(dx,dy);s.x+=dx;s.y+=dy;s.meters+=d;s.energy+=d;s.elapsed+=d/(1000/360);if(!s.path.length||Math.hypot(s.x-s.path[s.path.length-1].x,s.y-s.path[s.path.length-1].y)>12)s.path.push({x:s.x,y:s.y});if(s.path.length>6000)s.path.shift();return enter(s);}
function search(s,rng=Math.random){const id=s.lastCell,r=s.revealed[id];if(!r||s.searched[id]||s.collection.some(a=>a.id===id))return {status:'unavailable'};s.searched[id]=true;const p=chance(s.energy,s.weather,r.rarity,s.meters),success=rng()<p;if(success){const item={...r,form:weather[s.weather].form,date:new Date().toISOString(),outing:s.outing};s.collection.push(item);s.energy=Math.max(0,s.energy-2000);return {status:'success',item,p};}return {status:'miss',p};}
const api={ORIGIN,TILE,xy,geo,cell,key,hash,weather,energyChance,novelty,relic,chance,initial,vision,enter,move,search};
if(typeof module!=='undefined')module.exports=api;root.Game=api;
})(typeof window!=='undefined'?window:globalThis);
