(function(root){
'use strict';
class Streets {
  constructor(data, xy) {
    this.nodes=new Map(); this.edges=[];
    for(const way of data.elements||[]) {
      if(!way.geometry||!way.nodes)continue;
      way.nodes.forEach((id,i)=>{if(!this.nodes.has(id))this.nodes.set(id,{id,...xy(way.geometry[i].lat,way.geometry[i].lon),links:[]});});
      for(let i=1;i<way.nodes.length;i++){
        const a=this.nodes.get(way.nodes[i-1]),b=this.nodes.get(way.nodes[i]);
        const length=Math.hypot(a.x-b.x,a.y-b.y);if(!length)continue;
        a.links.push({node:b,length});b.links.push({node:a,length});this.edges.push({a,b});
      }
    }
    // Keep the connected walking network containing the city centre.
    const seed=this.nearest({x:0,y:0}),seen=new Set(),pending=[seed];
    while(pending.length){const n=pending.pop();if(!n||seen.has(n.id))continue;seen.add(n.id);for(const e of n.links)pending.push(e.node);}
    this.nodes=new Map([...this.nodes].filter(([id])=>seen.has(id)));
    this.edges=this.edges.filter(e=>seen.has(e.a.id));
  }
  nearest(p){let best=null,d=Infinity;for(const n of this.nodes.values()){const v=Math.hypot(n.x-p.x,n.y-p.y);if(v<d){best=n;d=v;}}return best;}
  project(p){let best=null;for(const {a,b} of this.edges){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy))),x=a.x+t*dx,y=a.y+t*dy,d=Math.hypot(x-p.x,y-p.y);if(!best||d<best.d)best={x,y,a,b,d};}return best;}
  route(p,target){
    const start=this.project(p),end=this.nearest(target);if(!start||!end||Math.hypot(end.x-target.x,end.y-target.y)>180)return null;
    const distance=new Map(),previous=new Map(),open=new Set();
    for(const n of [start.a,start.b]){distance.set(n.id,Math.hypot(n.x-p.x,n.y-p.y));open.add(n);}
    while(open.size){let n=null;for(const v of open)if(!n||distance.get(v.id)<distance.get(n.id))n=v;open.delete(n);if(n===end)break;
      for(const e of n.links){const next=distance.get(n.id)+e.length;if(next<(distance.get(e.node.id)??Infinity)){distance.set(e.node.id,next);previous.set(e.node.id,n);open.add(e.node);}}
    }
    if(!distance.has(end.id))return null;const points=[];let n=end;while(n){points.unshift({x:n.x,y:n.y});n=previous.get(n.id);}return points;
  }
  step(p,dx,dy){const start=this.project(p);if(!start)return null;const n=this.nearest(p);let choices;
    if(Math.hypot(n.x-p.x,n.y-p.y)<.5)choices=n.links.map(e=>e.node);else choices=[start.a,start.b];
    let best=null,score=.15;for(const q of choices){const len=Math.hypot(q.x-p.x,q.y-p.y);if(len<.1)continue;const v=((q.x-p.x)*dx+(q.y-p.y)*dy)/len/Math.hypot(dx,dy);if(v>score){score=v;best=q;}}return best;
  }
}
if(typeof module!=='undefined')module.exports=Streets;root.Streets=Streets;
})(typeof window!=='undefined'?window:globalThis);
