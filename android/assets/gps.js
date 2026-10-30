(function(root){
class GpsFilter{
  constructor(){this.reset();}
  reset(){this.anchor=null;this.last=null;this.fresh=0;}
  accept(fix,now=Date.now()){
    if(!Number.isFinite(fix.lat)||!Number.isFinite(fix.lon)||Math.abs(fix.lat)>90||Math.abs(fix.lon)>180||!Number.isFinite(fix.time)||!Number.isFinite(fix.accuracy)||fix.accuracy<0||fix.accuracy>25||Math.abs(now-fix.time)>10000)return null;
    if(this.last&&fix.time<=this.last.time)return null;
    const p=Game.xy(fix.lat,fix.lon);let distance=0;
    if(this.last){const elapsed=(fix.time-this.last.time)/1000,d=Math.hypot(p.x-this.last.x,p.y-this.last.y);if(elapsed>30||fix.speed>7||d>Math.max(35,elapsed*7)){this.anchor=p;this.last={...p,time:fix.time};this.fresh=0;return null;}}
    if(this.anchor){const d=Math.hypot(p.x-this.anchor.x,p.y-this.anchor.y);if(d>=8){distance=d;this.anchor=p;}}else this.anchor=p;
    this.last={...p,time:fix.time};this.fresh=now;return {...p,distance};
  }
}
if(typeof module!=='undefined')module.exports=GpsFilter;root.GpsFilter=GpsFilter;
})(typeof window!=='undefined'?window:globalThis);
