(function(root){
'use strict';
class PhoneMap{
 constructor(canvas,controls,onDiscover){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.data=root.TrailCityMap;this.scale=.33;this.center={x:0,y:0};this.follow=true;this.state=null;this.hasGPS=false;this.onDiscover=onDiscover;this.signature='';this.pending=false;this.pointer=null;
  this.resize=()=>{const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;this.w=r.width;this.h=r.height;this.dpr=Math.min(root.devicePixelRatio||1,2);canvas.width=this.w*this.dpr;canvas.height=this.h*this.dpr;this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.schedule();};
  new ResizeObserver(this.resize).observe(canvas);
  controls.zoomIn.onclick=()=>this.zoom(1.3);controls.zoomOut.onclick=()=>this.zoom(1/1.3);controls.follow.onclick=()=>{this.follow=true;if(this.state&&this.hasGPS)this.center={x:this.state.x,y:this.state.y};this.schedule();};
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY};});
  canvas.addEventListener('pointermove',e=>{if(!this.pointer||e.pointerId!==this.pointer.id)return;this.center.x-=(e.clientX-this.pointer.x)/this.scale;this.center.y+=(e.clientY-this.pointer.y)/this.scale;this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY};this.follow=false;this.schedule();});
  const end=()=>this.pointer=null;canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom(e.deltaY<0?1.2:1/1.2);},{passive:false});
 }
 zoom(factor){this.scale=Math.max(.10,Math.min(1.25,this.scale*factor));this.schedule();}
 update(s,hasGPS){this.state=s;this.hasGPS=hasGPS;if(this.follow&&hasGPS)this.center={x:s.x,y:s.y};const signature=[s.x,s.y,hasGPS,s.collection.length,s.outing,Object.keys(s.revealed).length].join(',');if(signature!==this.signature){this.signature=signature;this.schedule();}if(!this.w)this.resize();}
 schedule(){if(this.pending)return;this.pending=true;requestAnimationFrame(()=>{this.pending=false;this.draw();});}
 screen(p){return {x:(p[0]-this.center.x)*this.scale+this.w/2,y:(this.center.y-p[1])*this.scale+this.h/2};}
 trace(points){const ctx=this.ctx;points.forEach((p,i)=>{const q=this.screen(p);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});}
 draw(){
  if(!this.w||!this.h||!this.data)return;const ctx=this.ctx,s=this.state,scale=this.scale,box=[this.center.x-this.w/2/scale,this.center.y-this.h/2/scale,this.center.x+this.w/2/scale,this.center.y+this.h/2/scale];
  ctx.clearRect(0,0,this.w,this.h);ctx.fillStyle='#f1f0e9';ctx.fillRect(0,0,this.w,this.h);
  const visible=this.data.features.filter(f=>f.b[0]<box[2]&&f.b[2]>box[0]&&f.b[1]<box[3]&&f.b[3]>box[1]);
  for(const k of ['park','forest','water','building'])for(const f of visible){if(f.k!==k)continue;ctx.beginPath();this.trace(f.p);ctx.closePath();for(const hole of f.holes||[]){this.trace(hole);ctx.closePath();}ctx.fillStyle={park:'#dce7c8',forest:'#c8d9b5',water:'#abc9ef',building:'#d2d3cb'}[k];ctx.fill('evenodd');if(k==='building'&&scale>.2){ctx.strokeStyle='#bfc1b8';ctx.lineWidth=.5;ctx.stroke();}}
  const roads=visible.filter(f=>f.k==='road');
  for(const outline of [true,false])for(const f of roads){const major=['primary','secondary','tertiary','motorway','trunk'].includes(f.t),walking=['footway','path','steps','cycleway'].includes(f.t);ctx.beginPath();this.trace(f.p);ctx.strokeStyle=outline?(major?'#e3b74c':'#d4d2c7'):(major?'#ffe5a3':walking?'#f7f8f0':'#fffef9');ctx.lineWidth=Math.max(walking?1:2,scale*(major?15:walking?3:7))+(outline?2:0);ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();}
  for(const f of visible.filter(f=>f.k==='rail')){ctx.beginPath();this.trace(f.p);ctx.strokeStyle='#a6a6a0';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([]);}
  const names=new Set(),occupied=[];
  for(const f of roads){if(!f.n||names.has(f.n)||f.p.length<2)continue;const mid=Math.floor(f.p.length/2),a=this.screen(f.p[mid-1]),b=this.screen(f.p[mid]);if(b.x<20||b.x>this.w-20||b.y<20||b.y>this.h-20||occupied.some(p=>Math.hypot(p.x-b.x,p.y-b.y)<65))continue;names.add(f.n);occupied.push(b);let angle=Math.atan2(b.y-a.y,b.x-a.x);if(angle>Math.PI/2)angle-=Math.PI;if(angle<-Math.PI/2)angle+=Math.PI;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(angle);ctx.font='10px sans-serif';ctx.textAlign='center';ctx.strokeStyle='#f9f9f2';ctx.lineWidth=3;ctx.strokeText(f.n,0,-3);ctx.fillStyle='#77796d';ctx.fillText(f.n,0,-3);ctx.restore();}
  for(const label of this.data.labels){const p=this.screen(label.p);if(p.x<0||p.x>this.w||p.y<0||p.y>this.h)continue;ctx.font=(label.type==='city'?'bold 17px':'11px')+' sans-serif';ctx.textAlign='center';ctx.strokeStyle='#f3f4e8';ctx.lineWidth=3;ctx.strokeText(label.name,p.x,p.y);ctx.fillStyle='#55604d';ctx.fillText(label.name,p.x,p.y);}
  if(s&&this.hasGPS){
   if(s.path?.length>1){ctx.beginPath();this.trace(s.path.map(p=>[p.x,p.y]));ctx.strokeStyle='#fff9ed';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#c17d49';ctx.lineWidth=2.5;ctx.stroke();}
   const collected=new Set(s.collection.map(r=>r.id)),i0=Math.floor(box[0]/250),i1=Math.floor(box[2]/250),j0=Math.floor(box[1]/250),j1=Math.floor(box[3]/250),bounds=this.data.bounds,current=Game.cell(s.x,s.y);let discovered=false;
   for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){
    if((i+1)*250<bounds[0]||i*250>bounds[2]||(j+1)*250<bounds[1]||j*250>bounds[3])continue;
    const id=Game.key(i,j);if(!Object.hasOwn(s.revealed,id)){s.revealed[id]=Game.relic(i,j,s.visits);discovered=true;}
    const p=this.screen([i*250,(j+1)*250]),size=250*scale;ctx.fillStyle=s.visits[id]?'#72935624':'#f6f6e309';ctx.fillRect(p.x,p.y,size,size);ctx.strokeStyle='#54734355';ctx.lineWidth=.6;ctx.strokeRect(p.x,p.y,size,size);if(i===current.i&&j===current.j){ctx.strokeStyle='#3d6845';ctx.lineWidth=2;ctx.strokeRect(p.x+1,p.y+1,size-2,size-2);}
    const r=s.revealed[id];if(!r)continue;const x=p.x+size/2,y=p.y+size/2;
    if(collected.has(id)){ctx.fillStyle='#38624b';ctx.textAlign='center';ctx.font='bold 13px sans-serif';ctx.fillText('✓',x,y+4);continue;}
    const radius=r.rarity==='Legendary'?11:r.rarity==='Rare'?8:5,color=r.rarity==='Legendary'?'#b28417':r.rarity==='Rare'?'#337c8b':'#bd8844';ctx.save();ctx.translate(x,y);if(r.rarity!=='Common'){ctx.beginPath();ctx.arc(0,0,radius+4,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();if(r.rarity==='Legendary'){ctx.shadowColor='#d7ae3b';ctx.shadowBlur=10;}}ctx.rotate(Math.PI/4);ctx.fillStyle=color;ctx.strokeStyle='#fff8e6';ctx.lineWidth=2;ctx.fillRect(-radius/1.4,-radius/1.4,radius*1.4,radius*1.4);ctx.strokeRect(-radius/1.4,-radius/1.4,radius*1.4,radius*1.4);ctx.restore();
   }
   if(discovered&&this.onDiscover)this.onDiscover();
   const player=this.screen([s.x,s.y]);ctx.beginPath();ctx.arc(player.x,player.y,14,0,Math.PI*2);ctx.fillStyle='#355c4529';ctx.fill();ctx.beginPath();ctx.arc(player.x,player.y,6,0,Math.PI*2);ctx.fillStyle='#2f6046';ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=3;ctx.stroke();
  }
  ctx.strokeStyle='#53684c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(14,this.h-20);ctx.lineTo(14+250*scale,this.h-20);ctx.stroke();ctx.fillStyle='#43523b';ctx.font='10px monospace';ctx.textAlign='left';ctx.fillText('250 m',14,this.h-27);
 }
}
root.PhoneMap=PhoneMap;
})(typeof window!=='undefined'?window:globalThis);
