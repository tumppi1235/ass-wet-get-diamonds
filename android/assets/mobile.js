'use strict';
const $=id=>document.getElementById(id),G=Game,filter=new GpsFilter(),SAVE='trail-relics-android-v1';
let s,active=false,page=0;try{s=JSON.parse(localStorage.getItem(SAVE));if(s?.version!==1||!s.visits||!s.collection)s=null;}catch{}s=s||G.initial();
const phoneMap=window.PhoneMap?new window.PhoneMap($('phoneMap'),{zoomIn:$('mapZoomIn'),zoomOut:$('mapZoomOut'),follow:$('mapFollow')},()=>save()):null;
const glyphs={Compass:'✥',Rune:'ᚱ',Lantern:'♜',Crown:'♛',Shard:'♦',Key:'⚿'};
function icon(r){return '<span class="relic '+r.rarity+'" aria-label="'+r.rarity+' '+r.name+'">'+glyphs[r.name]+'</span>';}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(s));}catch{$('message').textContent='Storage full. Progress could not be saved.';}}
function ready(){return active&&Date.now()-filter.fresh<15000;}
window.gpsStatus=text=>{$('gpsStatus').textContent=text;};
window.pauseGps=()=>{filter.reset();render();save();};
window.onGps=fix=>{if(!active)return;const p=filter.accept(fix);if(!p){gpsStatus('Waiting for a steady walking GPS fix (accuracy 25 m or better).');render();return;}s.x=p.x;s.y=p.y;if(!s.path)s.path=[];if(p.distance>0||!s.path.length){s.path.push({x:p.x,y:p.y});if(s.path.length>2000)s.path.shift();}s.meters+=p.distance;s.energy+=p.distance;G.enter(s);gpsStatus('GPS ready · accuracy ±'+Math.round(fix.accuracy)+' m · tile '+s.lastCell);save();render();};
function render(){
 const c=G.cell(s.x,s.y),r=s.revealed[s.lastCell],collected=r&&s.collection.some(a=>a.id===r.id),can=ready()&&r&&!collected&&!s.searched[r.id];
 $('guide').hidden=page!==0;$('nearby').hidden=page!==1;$('guideTab').setAttribute('aria-pressed',page===0);$('mapTab').setAttribute('aria-pressed',page===1);
 if(!ready())$('signal').innerHTML='<p class="eyebrow">READY WHEN YOU ARE</p><div class="bearing">✥</div><div class="signal-name">Find your signal.</div><p class="sub">Start GPS and head outdoors.</p>';
 else if(can)$('signal').innerHTML='<p class="eyebrow">READY TO CAPTURE · '+r.rarity.toUpperCase()+'</p>'+icon(r)+'<div class="signal-name">'+G.weather[s.weather].form+' '+r.name+'</div><p class="sub">'+Math.round(G.chance(s.energy,s.weather,r.rarity,s.meters)*100)+'% collection chance</p>';
 else{const next=Object.values(s.revealed).filter(Boolean).filter(v=>!s.collection.some(a=>a.id===v.id)&&!s.searched[v.id]).sort((a,b)=>Math.hypot((a.i+.5)*250-s.x,(a.j+.5)*250-s.y)-Math.hypot((b.i+.5)*250-s.x,(b.j+.5)*250-s.y))[0];if(next){const dx=(next.i+.5)*250-s.x,dy=(next.j+.5)*250-s.y,degrees=Math.atan2(dx,dy)*180/Math.PI,direction=['N','NE','E','SE','S','SW','W','NW'][(Math.round(degrees/45)+8)%8];$('signal').innerHTML='<p class="eyebrow">NEXT ARTEFACT · '+direction+'</p><div class="bearing" id="bearing">↑</div><div class="signal-name">'+next.rarity+' '+next.name+'</div><p class="sub">'+Math.round(Math.hypot(dx,dy))+' m to tile centre · north up</p>';$('bearing').style.transform='rotate('+degrees+'deg)';}else $('signal').innerHTML='<div class="bearing">✥</div><div class="signal-name">Keep exploring.</div><p class="sub">No artefacts in your current vision.</p>';}
 if(phoneMap&&page===1)phoneMap.update(s,ready());
 $('collect').disabled=!can;$('collect').textContent=can?'Collect artefact · '+Math.round(G.chance(s.energy,s.weather,r.rarity,s.meters)*100)+'%':!ready()?'Waiting for GPS':collected?'Already collected':r&&s.searched[r.id]?'Searched this outing':'Follow the signal';
 $('distance').textContent=(s.meters/1000).toFixed(2)+' km';$('energy').textContent=(s.energy/1000).toFixed(2)+' km';$('count').textContent=s.collection.length;$('weather').value=s.weather;
 $('collection').innerHTML=s.collection.length?s.collection.slice().reverse().map(v=>'<article class="card '+v.rarity+'">'+icon(v)+'<strong>'+v.form+' '+v.name+'</strong><small>'+v.rarity.toUpperCase()+' · '+v.id+'</small></article>').join(''):'<p class="sub">Your first story is still out there.</p>';
}
function nativeGps(action){if(window.TrailNative){window.TrailNative[action==='start'?'startGps':'stopGps']();return true;}if(window.webkit?.messageHandlers?.trailRelics){window.webkit.messageHandlers.trailRelics.postMessage(action);return true;}return false;}
$('gpsStart').onclick=()=>{active=true;filter.reset();if(!nativeGps('start'))gpsStatus('GPS is available in the installed Android or iOS app.');render();};
$('gpsStop').onclick=()=>{active=false;filter.reset();nativeGps('stop');gpsStatus('GPS paused. Tap Start GPS to continue.');save();render();};
$('guideTab').onclick=()=>{page=0;render();};$('mapTab').onclick=()=>{page=1;render();};
$('collect').onclick=()=>{if(!ready())return;const result=G.search(s);$('message').textContent=result.status==='success'?'Collected! '+result.item.form+' '+result.item.name+' joins your collection.':result.status==='miss'?'It slipped away. Energy retained. One attempt per tile per outing.':'No artefact ready here.';save();render();};
$('weather').onchange=e=>{s.weather=e.target.value;save();render();};
$('newOuting').onclick=()=>{if(!confirm('Reset outing distance, energy and attempts? Your collection and discoveries are kept.'))return;s.meters=0;s.energy=0;s.path=[];s.searched={};s.outing++;filter.reset();save();render();};
window.addEventListener('pagehide',save);setInterval(render,1000);render();
