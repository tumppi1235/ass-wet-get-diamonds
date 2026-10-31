import type {D1Database} from '@cloudflare/workers-types';
import {tilePoint} from '../../mobile/src/game/claims';
import {claimWindow,type ClaimCluster,type ClaimRecord,type ClaimPage} from '../../mobile/src/map/claim-window';
import {WorldError} from './world-error';
export type {ClaimRecord,ClaimPage} from '../../mobile/src/map/claim-window';
const parsedI="CAST(substr(tile,1,instr(tile,',')-1) AS INTEGER)",parsedJ="CAST(substr(tile,instr(tile,',')+1) AS INTEGER)",canonical=`CAST(${parsedI} AS TEXT)||','||CAST(${parsedJ} AS TEXT)=tile`;
/** Bounded derived-index backfill, outside schema migrations; gameplay values and revisions are untouched. */
export async function indexLegacyClaims(db:D1Database){
  const country=claimWindow({south:59,north:71,west:19,east:32})!;
  await db.prepare(`UPDATE trail_claims SET cell_i=${parsedI},cell_j=${parsedJ} WHERE tile IN (SELECT tile FROM trail_claims WHERE (cell_i IS NULL OR cell_j IS NULL) AND (${canonical}) AND ${parsedI}>=? AND ${parsedI}<=? AND ${parsedJ}>=? AND ${parsedJ}<=? LIMIT 500)`).bind(country.minI,country.maxI,country.minJ,country.maxJ).run();
}
export async function queryClaims(db:D1Database,owner:string,params:URLSearchParams):Promise<ClaimPage>{
  const empty={claims:[]as ClaimRecord[],clusters:[]as ClaimCluster[],step:1,next:null,truncated:false};
  if(params.has('tile')){const tile=params.get('tile')!;if(!tilePoint(tile))throw new WorldError(400,'Choose a valid Finland tile');const row=await db.prepare('SELECT c.tile,c.owner,c.price,c.updated_at,m.display_name FROM trail_claims c JOIN trail_members m ON m.id=c.owner WHERE c.tile=?').bind(tile).first<ClaimRecord>();return{...empty,claims:row?[row]:[],mode:'tile'};}
  const keys=['south','north','west','east']as const;
  if(!keys.some(k=>params.has(k))){
    if(params.has('after'))throw new WorldError(400,'Use a map area for claim pagination');
    // Retained only for old open clients. New clients use bounded map pages and exact tile prices.
    const rows=await db.prepare('SELECT c.tile,c.owner,c.price,c.updated_at,m.display_name FROM trail_claims c JOIN trail_members m ON m.id=c.owner ORDER BY c.updated_at DESC,c.tile LIMIT 1001').all<ClaimRecord>();return{...empty,claims:rows.results.slice(0,1000),truncated:rows.results.length>1000,mode:'legacy-latest'};
  }
  const values=keys.map(k=>params.has(k)?Number(params.get(k)):NaN),[south,north,west,east]=values;
  if(!values.every(Number.isFinite)||south<59||north>71||west<19||east>32||south>=north||west>=east)throw new WorldError(400,'Use a valid Finland map area');
  const window=claimWindow({south,north,west,east})!,limit=Number(params.get('limit')||100),after=params.get('after')||'';
  if(!Number.isInteger(limit)||limit<1||limit>100||after.length>80||(after&&!tilePoint(after)))throw new WorldError(400,'Invalid claim page');
  await indexLegacyClaims(db);
  const {minI,maxI,minJ,maxJ,step}=window,args=[minI,maxI,minJ,maxJ,minI,maxI,minJ,maxJ];
  // Existing claims remain visible while the bounded index backfill progresses.
  const located=`WITH located AS (SELECT tile,owner,price,updated_at,cell_i AS i,cell_j AS j FROM trail_claims WHERE cell_i>=? AND cell_i<=? AND cell_j>=? AND cell_j<=? UNION ALL SELECT tile,owner,price,updated_at,${parsedI} AS i,${parsedJ} AS j FROM trail_claims WHERE (cell_i IS NULL OR cell_j IS NULL) AND (${canonical}) AND ${parsedI}>=? AND ${parsedI}<=? AND ${parsedJ}>=? AND ${parsedJ}<=?)`;
  if(step===1){const rows=await db.prepare(`${located} SELECT l.tile,l.owner,l.price,l.updated_at,m.display_name FROM located l JOIN trail_members m ON m.id=l.owner WHERE l.tile>? ORDER BY l.tile LIMIT ?`).bind(...args,after,limit+1).all<ClaimRecord>(),page=rows.results.slice(0,limit);return{...empty,claims:page,next:rows.results.length>limit?page.at(-1)!.tile:null,mode:'tiles'};}
  if(after)throw new WorldError(400,'Grouped claims use one bounded map page');
  const rows=await db.prepare(`${located},buckets AS (SELECT owner,CAST((i-CASE WHEN i<0 THEN ? ELSE 0 END)/? AS INTEGER)*? AS i,CAST((j-CASE WHEN j<0 THEN ? ELSE 0 END)/? AS INTEGER)*? AS j FROM located) SELECT i,j,? AS step,COUNT(*) AS count,SUM(owner=?) AS mine,SUM(owner<>?) AS others FROM buckets GROUP BY i,j ORDER BY i,j LIMIT 401`).bind(...args,step-1,step,step,step-1,step,step,step,owner,owner).all<ClaimCluster>();
  return{...empty,clusters:rows.results.slice(0,400),step,truncated:rows.results.length>400,mode:'clusters'};
}
