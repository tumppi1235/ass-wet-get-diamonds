const assert=require('node:assert/strict');
const fs=require('node:fs');
const G=require('../public/engine.js');
const Streets=require('../public/streets.js');
const data=JSON.parse(fs.readFileSync(require.resolve('../public/streets-osm.json'),'utf8').replace(/^\uFEFF/,''));
const roads=new Streets(data,G.xy);
assert.ok(roads.nodes.size>1000);
let current=roads.project({x:0,y:0}),distance=0;
for(const [lat,lon] of [[62.2427,25.7442],[62.2448,25.7408],[62.2444,25.7334],[62.2419,25.7302],[62.2384,25.7328],[62.2358,25.7417],[62.237,25.7507],[62.2406,25.7488],[62.2415,25.7472]]){
  const route=roads.route(current,G.xy(lat,lon));assert.ok(route?.length);
  for(const next of route){
    // The midpoint of every movement segment must be on a mapped street.
    assert.ok(roads.project({x:(current.x+next.x)/2,y:(current.y+next.y)/2}).d<.01);
    distance+=Math.hypot(next.x-current.x,next.y-current.y);current=next;
  }
}
assert.ok(distance>2000);
assert.equal(roads.route(current,{x:100000,y:100000}),null);
for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const next=roads.step(current,dx,dy);if(next)assert.ok(roads.project({x:(current.x+next.x)/2,y:(current.y+next.y)/2}).d<.01);}
const s=G.initial();G.enter(s);assert.equal(Object.keys(s.revealed).length,9);
const original=JSON.stringify(s.revealed);G.vision(s);assert.equal(JSON.stringify(s.revealed),original);
G.move(s,251,0);assert.ok(G.vision(s).every(r=>Math.abs(r.i-1)<=1&&Math.abs(r.j)<=1));
console.log('Passed: real city demo follows street edges, manual movement stays on streets, outside-area routes rejected, adjacent vision and stable discoveries.');
