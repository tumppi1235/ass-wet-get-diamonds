import country from '../../assets/finland-boundary.json';
export const FINLAND=country;
type Polygon={bounds:number[];outer:number[][];holes:number[][][]};
export function inRing(x:number,y:number,ring:number[][]){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j],cross=(x-a[0])*(b[1]-a[1])-(y-a[1])*(b[0]-a[0]);
    if(Math.abs(cross)<1e-12&&x>=Math.min(a[0],b[0])&&x<=Math.max(a[0],b[0])&&y>=Math.min(a[1],b[1])&&y<=Math.max(a[1],b[1]))return true;
    if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
const inPolygon=(lon:number,lat:number,p:Polygon)=>inRing(lon,lat,p.outer)&&!p.holes.some(h=>inRing(lon,lat,h));
export function isInFinland(latitude:number,longitude:number){
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return false;
  return FINLAND.polygons.some(p=>longitude>=p.bounds[0]&&longitude<=p.bounds[2]&&latitude>=p.bounds[1]&&latitude<=p.bounds[3]&&inPolygon(longitude,latitude,p));
}
export function intersectsFinland(west:number,south:number,east:number,north:number){
  for(const p of FINLAND.polygons){
    const b=p.bounds;if(east<b[0]||west>b[2]||north<b[1]||south>b[3])continue;
    if([[west,south],[east,south],[east,north],[west,north],[(west+east)/2,(south+north)/2]].some(([x,y])=>inPolygon(x,y,p)))return true;
    for(const ring of [p.outer,...p.holes])for(let i=1;i<ring.length;i++){
      const [x,y]=ring[i-1],[xx,yy]=ring[i];
      if(x>=west&&x<=east&&y>=south&&y<=north)return true;
      for(const edge of [west,east])if(xx!==x){const t=(edge-x)/(xx-x),v=y+t*(yy-y);if(t>=0&&t<=1&&v>=south&&v<=north)return true;}
      for(const edge of [south,north])if(yy!==y){const t=(edge-y)/(yy-y),v=x+t*(xx-x);if(t>=0&&t<=1&&v>=west&&v<=east)return true;}
    }
  }
  return false;
}
