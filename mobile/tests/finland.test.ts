import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import national from '../assets/finland-relics.json';
import provenance from '../assets/finland-relics-provenance.json';
import original from '../assets/landmarks.json';
import G from '../src/game/engine';
import {APP_ENV} from '../src/config/environment';
import {isInFinland} from '../src/map/country';
import {isPlayablePoint,visibleGameTiles,isPlayableCell} from '../src/map/region';
import {groundDistance,groundBearing,groundDestination} from '../src/map/geodesy';
import {LANDMARKS,captureAt,seedLandmarks} from '../src/game/landmarks';
import {tilePoint,currentTile} from '../src/game/claims';
import {PositionTracker} from '../src/location/tracker';
import {requestAdventure,applyExplorationFix} from '../src/game/adventure';

test('Finland catalog has all seven types in 35 towns, plus countrywide rural trail finds',()=>{
  assert.equal(provenance.cities.length,35);assert.equal(national.length,provenance.count);assert.ok(national.length>=400);assert.ok(provenance.ruralCount>=150);
  assert.equal(national.length,35*7+provenance.ruralCount);
  const expected=['Compass','Rune','Stone','Shard','Crown','Key','Lantern'].sort();
  for(const city of provenance.cities)assert.deepEqual(national.filter(r=>r.locality===city).map(r=>r.name).sort(),expected,city);
  assert.equal(new Set([...original,...national].map(r=>r.id)).size,original.length+national.length);
  assert.equal(new Set(national.map(r=>r.landmarkId)).size,national.length);
  assert.equal(createHash('sha256').update(readFileSync(new URL('../assets/landmarks.json',import.meta.url))).digest('hex'),'59bf90465886e4cfc11b2508df2c528fe2d2d19b56ce9517aad3d3db842f46bc','original 23 finds are byte-for-byte unchanged');
});
test('every new relic is an eligible outdoor OSM way node in a valid Finland cell',()=>{
  const blocked=['no','private','customers','permit','destination','delivery','agricultural','forestry'];
  for(const r of national){
    const p=provenance.records[r.id as keyof typeof provenance.records];assert.ok(p,r.id);assert.equal(r.source,`https://www.openstreetmap.org/way/${p.wayId}`);
    assert.ok(p.nodeId>0);assert.equal(r.latitude,p.latitude);assert.equal(r.longitude,p.longitude);
    const tags=p.tags as Record<string,string>;assert.ok(['footway','path','pedestrian','steps','cycleway'].includes(tags.highway));
    assert.ok(!blocked.includes(tags.access));assert.ok(!blocked.includes(tags.foot));assert.ok(!tags.indoor||tags.indoor==='no');assert.ok(!tags.tunnel||tags.tunnel==='no');assert.notEqual(tags.covered,'yes');assert.notEqual(tags.area,'yes');
    assert.ok(isInFinland(r.latitude,r.longitude),r.landmark);const point=G.xy(r.latitude,r.longitude);assert.equal(currentTile(point),r.id);
    if(APP_ENV==='development'){assert.ok(isPlayableCell(r.i,r.j));assert.ok(tilePoint(r.id));}
  }
});
test('national eligibility includes Åland and Lapland and rejects neighbouring countries; production keeps its scope',()=>{
  for(const r of national.filter(r=>['Helsinki','Turku','Tampere','Oulu','Mariehamn','Inari','Utsjoki','Enontekiö'].includes(r.locality))){
    assert.ok(isInFinland(r.latitude,r.longitude));assert.equal(isPlayablePoint(G.xy(r.latitude,r.longitude)),APP_ENV==='development');
  }
  for(const [lat,lon]of [[59.3293,18.0686],[59.437,24.7536],[69.6492,18.9553],[59.9343,30.3351]])assert.equal(isInFinland(lat,lon),false);
  assert.equal(isInFinland(NaN,25),false);assert.equal(isInFinland(0,0),false);
  assert.equal(LANDMARKS.length,23+(APP_ENV==='development'?national.length:0));
});
test('country collection, visits and bounded tile overlays work while preserving IDs and collected saves',()=>{
  if(APP_ENV!=='development')return;
  for(const r of national){
    const s=G.initial(),point=G.xy(r.latitude,r.longitude);s.x=point.x;s.y=point.y;G.enter(s);
    assert.equal(currentTile(s),r.id);assert.equal(s.gold,1);assert.equal(captureAt(s,point,false,()=>0).status,'unavailable');
    assert.equal(captureAt(s,point,true,()=>0).status,'success',r.landmark);
    const loaded=seedLandmarks(JSON.parse(JSON.stringify(s)));assert.equal(captureAt(loaded,point,true,()=>0).status,'unavailable');assert.ok(loaded.collection.some(item=>item.id===r.id));
  }
  for(const city of ['Helsinki','Mariehamn','Utsjoki']){const r=national.find(r=>r.locality===city)!,point=G.xy(r.latitude,r.longitude),near=visibleGameTiles(point,390,844,.4,point);assert.ok(near.length>0&&near.length<=400);assert.ok(near.some(([i,j])=>G.key(i,j)===r.id));assert.deepEqual(visibleGameTiles(point,1000,844,.001),[]);}
});
test('ground distance, bearing and accuracy rings remain metric at southern and northern latitudes',()=>{
  for(const latitude of [60.17,62.24,67.42,69.9]){
    const origin={latitude,longitude:26};for(const angle of [0,90,180,270]){const end=groundDestination(origin,250,angle);assert.ok(Math.abs(groundDistance(origin,end)-250)<.0001);assert.ok(Math.abs(groundBearing(origin,end)-angle)<.00001);}
  }
});
test('GPS walking gold uses real ground metres nationwide, not the legacy tile projection',()=>{
  if(APP_ENV!=='development')return;
  for(const latitude of [60.1699,67.4167]){
    const start={latitude,longitude:latitude<62?24.9384:26.59},tracker=new PositionTracker(),s=G.initial();let at=1_000_000;requestAdventure(s,at);
    for(let index=0;index<=6;index++){
      const p=groundDestination(start,index*50,90),fix=tracker.accept({...p,accuracy:5,timestamp:at,speed:1},at)!;assert.ok(fix?.eligible);applyExplorationFix(s,fix);at+=10000;
    }
    assert.ok(Math.abs(s.meters-300)<.001);assert.ok(s.gold>=1);assert.ok(Math.abs(s.goldMetres-50)<.001);
  }
});
