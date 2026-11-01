import type {GameState} from './types';
type TrailPoint=GameState['path'][number];
/** Remove redundant points, never the beginning of an outing or a GPS gap. */
export function compactTrail(path:TrailPoint[],tolerance=1):TrailPoint[]{
  const kept:TrailPoint[]=[];
  function segment(points:TrailPoint[]){
    if(points.length<3){kept.push(...points);return;}
    const indices=new Set([0,points.length-1]),stack:[[number,number]]=[[0,points.length-1]];
    while(stack.length){const [a,b]=stack.pop()!,start=points[a],end=points[b],dx=end.x-start.x,dy=end.y-start.y,length=dx*dx+dy*dy;let far=-1,max=tolerance*tolerance;
      for(let i=a+1;i<b;i++){const p=points[i],t=length?Math.max(0,Math.min(1,((p.x-start.x)*dx+(p.y-start.y)*dy)/length)):0,d=(p.x-start.x-t*dx)**2+(p.y-start.y-t*dy)**2;if(d>max){max=d;far=i;}}
      if(far>=0){indices.add(far);stack.push([a,far],[far,b]);}
    }
    for(const i of [...indices].sort((a,b)=>a-b))kept.push(points[i]);
  }
  let start=0;
  for(let i=1;i<path.length;i++)if(path[i].breakBefore){segment(path.slice(start,i));start=i;}
  segment(path.slice(start));return kept;
}
export function appendTrail(state:GameState,point:TrailPoint){
  const last=state.path.at(-1);
  if(!last||point.breakBefore||point.x!==last.x||point.y!==last.y)state.path.push(point);
  // Compact the whole route instead of dropping its oldest samples. Genuine
  // turns and discontinuities survive; simplification never changes rewards.
  if(state.path.length>6000)state.path=compactTrail(state.path);
}
