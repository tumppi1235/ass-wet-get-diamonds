import {test} from 'node:test';
import assert from 'node:assert/strict';
import {diagnosticOperation,unexpectedApiFailure} from '../../dev-server/trail/observability';
import {trailApi} from '../../dev-server/trail/api';

test('TR-117 dev service failures return a support reference and log only bounded allowlisted metadata, never private request/exception contents',async()=>{
  const secret='synthetic-private-canary',request=new Request('https://dev.invalid/api/trail/admin/player?lat=62.241500&password='+secret,{method:'POST',headers:{authorization:'Bearer '+secret,'oai-authenticated-user-id':secret},body:JSON.stringify({route:[[62.2415,25.7472]],password:secret})}),logs:string[]=[];
  const response=unexpectedApiFailure(request,new TypeError('SQL statement and '+secret),message=>logs.push(message)),data=await response.json(),record=JSON.parse(logs[0]);
  assert.equal(response.status,500);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('X-Trail-Reference'),data.reference);assert.match(data.reference,/^[0-9a-f-]{36}$/);assert.equal(record.reference,data.reference);assert.equal(record.operation,'admin');assert.equal(record.errorKind,'type');assert.deepEqual(Object.keys(record).sort(),['errorKind','event','method','operation','reference','service','status']);
  assert.ok(!JSON.stringify({data,record}).includes(secret));assert.ok(!JSON.stringify(record).includes('62.2415'));assert.ok(!JSON.stringify(record).includes('player?'));assert.equal(diagnosticOperation(new Request('https://dev.invalid/api/trail/private-'+secret)),'other');
  const safe=unexpectedApiFailure(request,new Error(secret),()=>{throw new Error('logging unavailable');});assert.equal(safe.status,500);assert.notEqual((await safe.json()).reference,data.reference);
});

test('TR-117 actual API unexpected errors are correlated while expected authorization/validation failures keep their existing status',async()=>{
  const captured:string[]=[],original=console.error;console.error=(message:unknown)=>{captured.push(String(message));};
  try{const DB={prepare(){throw new Error('synthetic secret SQL route');}} as never,env={DB,TRAIL_ENV:'development'},headers={'oai-authenticated-user-id':'synthetic-owner'},response=await trailApi(new Request('https://dev.invalid/api/trail/world',{headers}),env),data=await response.json();
    assert.equal(response.status,500);assert.equal(captured.length,1);assert.equal(JSON.parse(captured[0]).reference,data.reference);assert.equal(JSON.parse(captured[0]).operation,'world');assert.ok(!captured[0].includes('synthetic'));
    assert.equal((await trailApi(new Request('https://dev.invalid/api/trail/world'),env)).status,401);assert.equal(captured.length,1,'expected user errors are not logged as server incidents');
  }finally{console.error=original;}
});
