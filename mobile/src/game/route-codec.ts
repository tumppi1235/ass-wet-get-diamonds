import type {MappedEdge,MappedNode} from './mapped-route';
/** Runtime-only representation; the audited canonical database retains full tags. */
export function decodeRouteEdge(value:unknown):MappedEdge{
  if(!Array.isArray(value)||value.length!==5)throw new Error('Invalid packed edge');
  const[id,way,f,b,flat]=value;
  if(typeof id!=='string'||id.length>50||!Number.isSafeInteger(way)||way<=0||!Number.isInteger(f)||!Number.isInteger(b)||f<0||f>3||b<0||b>3||!(f|b)||!Array.isArray(flat)||flat.length<6||flat.length>30000||flat.length%3)throw new Error('Invalid packed edge');
  const points:MappedNode[]=[];let prior:MappedNode=[0,0,0];
  for(let i=0;i<flat.length;i+=3){
    if(!flat.slice(i,i+3).every(Number.isSafeInteger))throw new Error('Invalid point delta');
    const point:MappedNode=[prior[0]+flat[i],prior[1]+flat[i+1],prior[2]+flat[i+2]];
    if(!point.every(Number.isSafeInteger)||point[0]<=0||Math.abs(point[1])>900000000||Math.abs(point[2])>1800000000)throw new Error('Invalid packed point');
    points.push(point);prior=point;
  }
  // Routing already uses mode/direction flags and recomputes length from the
  // unchanged geometry. Omitted tags never establish new access permissions.
  return{id,way,f,b,points,meters:0,tags:{}};
}
