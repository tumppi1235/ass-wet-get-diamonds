import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import G from '../src/game/engine';
import { LANDMARKS, captureTarget, relicPoint } from '../src/game/landmarks';
import { coordinates, overlayData, relicData, trailData } from '../src/map/vector-data';

test('retro style validates against MapLibre and uses the verified Shortbread schema',()=>{
  const style=JSON.parse(readFileSync(new URL('../public/maps/trail-retro-style.json',import.meta.url),'utf8'));
  assert.deepEqual(validateStyleMin(style).map(e=>e.message),[]);
  assert.equal(style.sources.osm.url,'https://vector.openstreetmap.org/shortbread_v1/tilejson.json');
  const ids=style.layers.map((l:{id:string})=>l.id);
  for(const id of ['forest-texture','grass-texture','rock-texture','water-texture']){
    assert.ok(ids.indexOf(id)<ids.indexOf('buildings'));
    assert.ok(ids.indexOf(id)<ids.indexOf('trails'));
  }
  const rocks=style.layers.find((l:{id:string})=>l.id==='rock-texture');
  assert.deepEqual(rocks.filter,['in',['get','kind'],['literal',['bare_rock','scree','shingle']]]);
  assert.equal(style.layers.find((l:{id:string})=>l.id==='lakes').paint['fill-color'],'#458DB5');
});
test('pixel atlas keeps every image inside the PNG at normal and retina sizes',()=>{
  for(const suffix of ['', '@2x']){
    const png=readFileSync(new URL(`../public/maps/trail-sprites${suffix}.png`,import.meta.url));
    const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
    const meta=JSON.parse(readFileSync(new URL(`../public/maps/trail-sprites${suffix}.json`,import.meta.url),'utf8'));
    for(const sprite of Object.values(meta) as {x:number;y:number;width:number;height:number}[]){assert.ok(sprite.x+sprite.width<=width);assert.ok(sprite.y+sprite.height<=height);}
  }
});
test('relic symbols preserve geographic points; readiness comes only from game eligibility',()=>{
  const game=G.initial(),relic=LANDMARKS[0],p=relicPoint(relic);
  const first=relicData(game,p,relic.id).features.find(f=>f.id===relic.id)!;
  assert.deepEqual(first.geometry,{type:'Point',coordinates:[relic.longitude,relic.latitude]});
  assert.equal(first.properties!.distance,0);assert.equal(first.properties!.collectable,false);
  const eligible=captureTarget(game,p)!;
  const ready=relicData(game,p,relic.id,eligible.id).features.find(f=>f.id===relic.id)!;
  assert.equal(ready.properties!.collectable,true);
  game.collection.push(relic);
  assert.equal(relicData(game,p).features.find(f=>f.id===relic.id)!.properties!.collected,true);
});
test('rendered route never connects across a GPS discontinuity',()=>{
  const game=G.initial();game.path=[{x:0,y:0},{x:15,y:10},{x:2000,y:2000,breakBefore:true},{x:2020,y:2010}];
  const trail=trailData(game);assert.equal(trail.features.length,2);
  assert.deepEqual(trail.features[0].geometry,{type:'LineString',coordinates:[coordinates(game.path[0]),coordinates(game.path[1])]});
  assert.deepEqual(trail.features[1].geometry,{type:'LineString',coordinates:[coordinates(game.path[2]),coordinates(game.path[3])]});
});
test('map cells keep the original 250m grid; regional zoom removes detailed grid work',()=>{
  const game=G.initial();game.visits={'0,0':1};
  const near=overlayData(game,{'0,0':1},{x:0,y:0},390,844,.5);
  assert.ok(near.grid.features.length>0 && near.grid.features.length<=400);
  assert.equal(near.visits.features[0].properties!.owner,'both');
  const polygon=near.grid.features[0].geometry;assert.equal(polygon.type,'Polygon');
  if(polygon.type==='Polygon'){const a=G.xy(polygon.coordinates[0][0][1],polygon.coordinates[0][0][0]),b=G.xy(polygon.coordinates[0][1][1],polygon.coordinates[0][1][0]);assert.ok(Math.abs(b.x-a.x-250)<.001);}
  const far=overlayData(game,{},game,390,844,.001);assert.equal(far.grid.features.length,0);
});
