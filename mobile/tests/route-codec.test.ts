import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {decodeRouteEdge} from '../src/game/route-codec';
import {planMappedRoute,type MappedEdge} from '../src/game/mapped-route';
import {LANDMARKS} from '../src/game/landmarks';

test('compact geometry preserves large OSM IDs, negative deltas and direction flags',()=>{
  const edge=decodeRouteEdge(['way:0',42,3,1,[10000000001,621000000,270000000,-2,-10,20,7,15,-30]]);
  assert.deepEqual(edge.points,[[10000000001,621000000,270000000],[9999999999,620999990,270000020],[10000000006,621000005,269999990]]);
  assert.equal(edge.f,3);assert.equal(edge.b,1);assert.equal(edge.way,42);
});
test('compact geometry rejects unsafe integers, malformed records, flags and coordinate overflow',()=>{
  for(const value of [null,[],['x',1,0,0,[1,0,0,1,0,0]],['x',1,4,1,[1,0,0,1,0,0]],['x',1,1,1,[1,0,0]],['x',1,1,1,[1,0,0,NaN,0,0]],['x',1,1,1,[Number.MAX_SAFE_INTEGER,0,0,1,0,0]],['x',1,1,1,[1,900000001,0,1,0,0]],['x',1,1,1,[1,0,0,...Array(30000).fill(0)]]])assert.throws(()=>decodeRouteEdge(value));
});
test('real packed fixtures retain every source node and both Foot/Bicycle route results',()=>{
  const originals:MappedEdge[]=[],decoded:MappedEdge[]=[];
  for(const cell of ['1242_270','1242_271']){
    const source=JSON.parse(gunzipSync(readFileSync(new URL(`fixtures/route-network/${cell}.json.gz`,import.meta.url))).toString());
    const compact=JSON.parse(gunzipSync(readFileSync(new URL(`fixtures/route-runtime/${cell}.json.gz`,import.meta.url))).toString());
    assert.equal(compact.version,2);assert.equal(compact.encoding,'delta-e7-v1');assert.equal(compact.edges.length,source.edges.length);
    for(let i=0;i<source.edges.length;i++){
      const edge=decodeRouteEdge(compact.edges[i]),original=source.edges[i];
      assert.deepEqual(edge.points,original.points);assert.equal(edge.id,original.id);assert.equal(edge.way,original.way);assert.equal(edge.f,original.f);assert.equal(edge.b,original.b);
      originals.push(original);decoded.push(edge);
    }
  }
  const places=LANDMARKS.filter(p=>p.landmarkId?.startsWith('haukivuori-rantalantie-'));
  for(const movement of ['foot','bicycle']as const){
    const options={start:{latitude:places[0].latitude!,longitude:places[0].longitude!},end:{latitude:places[1].latitude!,longitude:places[1].longitude!},movement,maxMeters:5000,access:'known-paths' as const};
    const reference=planMappedRoute(originals,options);assert.equal(reference.status,'ready');assert.deepEqual(planMappedRoute(decoded,options),reference);
  }
});
