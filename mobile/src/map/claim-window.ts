import G from '../game/engine';
export type MapBounds={south:number;north:number;west:number;east:number};
export type ClaimWindow=MapBounds&{minI:number;maxI:number;minJ:number;maxJ:number;step:number;key:string};
export type ClaimCluster={i:number;j:number;step:number;count:number;mine:number;others:number};
export type ClaimRecord={tile:string;owner:string;price:number;updated_at:number;display_name:string};
export type ClaimPage={claims:ClaimRecord[];clusters:ClaimCluster[];step:number;next:string|null;truncated:boolean;mode:'tile'|'tiles'|'clusters'|'legacy-latest'};
/** Quantize only the request window; compatible tile identities never change. */
export function claimWindow(input:MapBounds):ClaimWindow|null{
  if(!input||![input.south,input.north,input.west,input.east].every(Number.isFinite)||input.south>=input.north||input.west>=input.east)return null;
  const span=input.east-input.west,shift=360*Math.round(((input.west+input.east)/2-25.5)/360);
  const south=Math.max(59,input.south),north=Math.min(71,input.north),west=span>=360?19:Math.max(19,input.west-shift),east=span>=360?32:Math.min(32,input.east-shift);
  if(south>=north||west>=east)return null;
  const a=G.xy(south,west),b=G.xy(north,east),minI=Math.floor(a.x/250),maxI=Math.floor(b.x/250),minJ=Math.floor(a.y/250),maxJ=Math.floor(b.y/250);
  const groups=(step:number)=>(Math.floor(maxI/step)-Math.floor(minI/step)+1)*(Math.floor(maxJ/step)-Math.floor(minJ/step)+1);
  let step=1;if(groups(1)>400){step=2;while(groups(step)>160&&step<512)step*=2;}
  return{south,north,west,east,minI,maxI,minJ,maxJ,step,key:[minI,maxI,minJ,maxJ,step].join(':')};
}
