import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from './sqlite-world';
import {queryClaims,indexLegacyClaims} from '../../dev-server/trail/claim-store';
import {claimWindow,type ClaimWindow,type MapBounds} from '../src/map/claim-window';
import {claimsData} from '../src/map/vector-data';
import {trailApi} from '../../dev-server/trail/api';
import {SharedWorldClient} from '../src/accounts/shared-world';
import G from '../src/game/engine';
const geoBounds=(minI:number,maxI:number,minJ:number,maxJ:number):MapBounds=>{const a=G.geo(minI*250+1,minJ*250+1),b=G.geo((maxI+1)*250-1,(maxJ+1)*250-1);return{south:a.lat,north:b.lat,west:a.lon,east:b.lon};};
const params=(b:MapBounds,extra:Record<string,string>={})=>new URLSearchParams({...Object.fromEntries(Object.entries(b).map(([k,v])=>[k,String(v)])),...extra});
function fixture(){const f=database();for(const id of ['viewer','other'])f.sql.prepare('INSERT INTO trail_members(id,display_name,role,created_at) VALUES(?,?,?,?)').run(id,id,'player',0);const insert=f.sql.prepare('INSERT INTO trail_claims(tile,owner,price,revision,updated_at,cell_i,cell_j) VALUES(?,?,?,1,?,?,?)');return{...f,db:f.db as never,insert:(i:number,j:number,owner='other',price=1,at=10,indexed=false)=>insert.run(`${i},${j}`,owner,price,at,indexed?i:null,indexed?j:null)};}

test('TR-030 exact tile prices are independent of the old latest-1000 map cap and bounded legacy indexing preserves claims',async()=>{
  const f=fixture();f.insert(0,0,'other',37,1);for(let n=0;n<1005;n++)f.insert(50+n%40,50+Math.floor(n/40),'viewer',1,100+n);
  const legacy=await queryClaims(f.db,'viewer',new URLSearchParams());assert.equal(legacy.claims.length,1000);assert.equal(legacy.truncated,true);assert.equal(legacy.claims.some(c=>c.tile==='0,0'),false);
  const exact=await queryClaims(f.db,'viewer',new URLSearchParams({tile:'0,0'}));assert.equal(exact.mode,'tile');assert.equal(exact.claims[0].price,37);
  const before=f.sql.prepare('SELECT tile,owner,price,revision,updated_at FROM trail_claims ORDER BY tile').all();await indexLegacyClaims(f.db);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_claims WHERE cell_i IS NOT NULL').get()!.n,500);
  const page=await queryClaims(f.db,'viewer',params(geoBounds(0,0,0,0)));assert.equal(page.claims[0].price,37);assert.deepEqual(f.sql.prepare('SELECT tile,owner,price,revision,updated_at FROM trail_claims ORDER BY tile').all(),before);
  assert.equal((await queryClaims(f.db,'viewer',new URLSearchParams({tile:'1,0'}))).claims.length,0);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM trail_players').get()!.n,0,'querying ownership never creates or changes a wallet');
});

test('TR-030 detailed map pages and client pagination return every local tile exactly once; unfinished backfill cannot hide older claims',async()=>{
  const f=fixture();for(let i=-5;i<10;i++)for(let j=-5;j<10;j++)f.insert(i,j,(i+j)%2?'viewer':'other');
  const bounds=geoBounds(-5,9,-5,9),window=claimWindow(bounds)!;assert.equal(window.step,1);let after='',count=0;const seen=new Set<string>();
  do{const result=await queryClaims(f.db,'viewer',params(bounds,{after,limit:'31'}));for(const row of result.claims){assert.equal(seen.has(row.tile),false);seen.add(row.tile);count++;}after=result.next||'';}while(after);assert.equal(count,225);
  const calls:string[]=[],env={DB:f.db,TRAIL_ENV:'development'},request=(async(input:RequestInfo|URL,init?:RequestInit)=>{calls.push(String(input));return trailApi(new Request('https://dev.example'+String(input),{...init,headers:{...init?.headers,'oai-authenticated-user-id':'viewer'}}),env);})as typeof fetch,client=new SharedWorldClient({async getItem(){return null;},async setItem(){},async removeItem(){}},request);
  await client.profile();const all=await client.claimMap(window);assert.equal(all.claims.length,225);assert.equal(new Set(all.claims.map(c=>c.tile)).size,225);assert.equal(calls.filter(c=>c.includes('/claims?')).length,3);
  const many=fixture();for(let n=0;n<700;n++)many.insert(100+n,100);many.insert(99,99,'viewer',8);const older=await queryClaims(many.db,'viewer',params(geoBounds(98,100,98,100)));assert.equal(many.sql.prepare("SELECT cell_i FROM trail_claims WHERE tile='99,99'").get()!.cell_i,null);assert.equal(older.claims.some(c=>c.tile==='99,99'),true,'a legacy row outside the first 500 is still included via the fallback branch');
});

test('TR-030 zoomed-out ownership groups preserve totals and negative tile alignment without pretending the block is owned',async()=>{
  const f=fixture();for(let i=-20;i<20;i++)for(let j=-20;j<20;j++)f.insert(i,j,i%2?'viewer':'other',1,10,true);
  const bounds=geoBounds(-20,19,-20,19),result=await queryClaims(f.db,'viewer',params(bounds));assert.equal(result.mode,'clusters');assert.ok(result.step>1);assert.equal(result.claims.length,0);assert.ok(result.clusters.length<=160);assert.equal(result.clusters.reduce((n,c)=>n+c.count,0),1600);assert.equal(result.clusters.reduce((n,c)=>n+c.mine,0),800);assert.equal(result.clusters.reduce((n,c)=>n+c.others,0),800);
  assert.ok(result.clusters.every(c=>c.i%result.step===0&&c.j%result.step===0));assert.ok(result.clusters.some(c=>c.i===-result.step&&c.j===-result.step));
  const features=claimsData({},'viewer',undefined,result.clusters);assert.equal(features.features.length,result.clusters.length);assert.ok(features.features.every(f=>f.geometry.type==='Point'&&f.properties?.claimCluster),'group markers are points, not false polygons claiming an entire block');
});

test('TR-030 request windows cover Finland and wrapped map copies with bounded detail and stable sub-tile keys',()=>{
  const bounds=geoBounds(0,9,0,9),a=claimWindow(bounds)!;assert.equal(a.step,1);const b=claimWindow({...bounds,west:bounds.west+.000001,east:bounds.east-.000001})!;assert.equal(b.key,a.key);
  const national=claimWindow({south:40,north:89,west:-180,east:180})!;assert.ok(national.step>1);assert.ok((Math.floor(national.maxI/national.step)-Math.floor(national.minI/national.step)+1)*(Math.floor(national.maxJ/national.step)-Math.floor(national.minJ/national.step)+1)<=160);
  assert.equal(claimWindow({...bounds,west:bounds.west+360,east:bounds.east+360})!.key,a.key);assert.equal(claimWindow({south:0,north:1,west:0,east:1}),null);assert.equal(claimWindow({...bounds,north:NaN}),null);
});

test('TR-030 ownership API requires identity, validates map bounds/pages and keeps exact price and grouped response contracts separate',async()=>{
  const f=fixture(),env={DB:f.db,TRAIL_ENV:'development'};f.insert(0,0,'other',4);
  const call=(query:string,owner='viewer')=>trailApi(new Request('https://dev.example/api/trail/claims?'+query,{headers:{'oai-authenticated-user-id':owner}}),env);
  assert.equal((await call('tile=0,0','')).status,401);assert.equal((await call('tile=bad')).status,400);assert.equal((await call('south=62')).status,400);assert.equal((await call(params(geoBounds(0,1,0,1),{limit:'101'}).toString())).status,400);
  const price=await(await call('tile=0,0')).json();assert.equal(price.mode,'tile');assert.equal(price.claims[0].price,4);assert.equal(price.clusters.length,0);
  let abortObserved=false;const request=(async(_input:RequestInfo|URL,init?:RequestInit)=>new Promise<Response>((_,reject)=>{init!.signal!.addEventListener('abort',()=>{abortObserved=true;reject(new Error('aborted obsolete map read'));},{once:true});}))as typeof fetch,client=new SharedWorldClient({async getItem(){return null;},async setItem(){},async removeItem(){}},request),abort=new AbortController(),pending=client.claimMap(claimWindow(geoBounds(0,1,0,1))as ClaimWindow,abort.signal);abort.abort();await assert.rejects(()=>pending,/aborted/);assert.equal(abortObserved,true);
  const old=new SharedWorldClient({async getItem(){return null;},async setItem(){},async removeItem(){}},(async()=>Response.json({claims:[]}))as typeof fetch);await assert.rejects(()=>old.claimTile('0,0'),/service changed/);await assert.rejects(()=>old.claimMap(claimWindow(geoBounds(0,1,0,1))!),/service changed/);
});
