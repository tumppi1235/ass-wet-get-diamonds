import {test} from 'node:test';
import assert from 'node:assert/strict';
import cluster from '../assets/haukivuori-relics.json';
import proof from '../assets/haukivuori-relics-provenance.json';
import {RELEASE_FEATURES} from '../src/config/features';
import {storageKeys} from '../src/config/environment';
import {LANDMARKS,captureAt,seedLandmarks} from '../src/game/landmarks';
import G from '../src/game/engine';
import {restoreDevelopmentState} from '../src/game/development-state';
import {restoreResources} from '../src/game/resources';
import {groundDistance} from '../src/map/geodesy';
import {isPlayablePoint} from '../src/map/region';

test('Rantalantie cluster has 28 distinct nearby mapped outdoor locations, with all seven types',()=>{
  assert.equal(cluster.length,28);assert.equal(proof.road.wayId,1156889836);assert.equal(proof.road.tags.name,'Rantalantie');
  const counts=new Map<string,number>();
  for(const r of cluster){
    assert.match(r.landmark,/Haukivuori.*Rantalantie/);counts.set(r.name,(counts.get(r.name)||0)+1);
    const p=proof.records[r.id as keyof typeof proof.records];assert.equal(p.latitude,r.latitude);assert.equal(p.longitude,r.longitude);assert.ok(p.nodeId>0);
    assert.equal(r.source,`https://www.openstreetmap.org/way/${p.wayId}`);
    const near=Math.min(...proof.road.geometry.map(q=>groundDistance({latitude:r.latitude,longitude:r.longitude},{latitude:q.lat,longitude:q.lon})));
    assert.ok(near<=900,r.landmark);assert.ok(Math.abs(near-p.distanceToRantalantie)<.001);
    const tags=p.tags as Record<string,string>;assert.ok(['footway','path','pedestrian','steps','cycleway','residential','living_street','unclassified','track','service'].includes(tags.highway));
    assert.ok(!['no','private','customers','permit','destination','delivery','agricultural','forestry'].includes(tags.access));assert.ok(!['no','private'].includes(tags.foot));assert.notEqual(tags.service,'driveway');assert.notEqual(tags.motorroad,'yes');assert.ok(!tags.indoor||tags.indoor==='no');assert.ok(!tags.tunnel||tags.tunnel==='no');
    assert.ok(isPlayablePoint(G.xy(r.latitude,r.longitude)));
  }
  assert.equal(counts.size,7);for(const count of counts.values())assert.equal(count,4);
  assert.equal(new Set(LANDMARKS.map(r=>r.id)).size,501);assert.equal(LANDMARKS.length,501);
});
test('every Rantalantie relic can be attempted in its tile and stays collected after reload',()=>{
  for(const r of cluster){const s=G.initial(),p=G.xy(r.latitude,r.longitude);s.x=p.x;s.y=p.y;G.enter(s);
    assert.equal(captureAt(s,p,true,()=>0).status,'success',r.landmark);
    const loaded=seedLandmarks(JSON.parse(JSON.stringify(s)));assert.equal(captureAt(loaded,p,true,()=>0).status,'unavailable');assert.equal(loaded.collection[0].id,r.id);
  }
});
test('production promotion retains legacy save keys and progress without copying development profiles',()=>{
  assert.equal(RELEASE_FEATURES.nationalExploration,true);assert.equal(RELEASE_FEATURES.lifetimeJournal,true);
  assert.deepEqual(storageKeys('production'),{database:'trail-relics.profiles.v1',session:'trail-relics.session.v1'});assert.notEqual(storageKeys('development').database,storageKeys('production').database);
  const old=G.initial();old.gold=37;old.goldMetres=123;old.claimGoldSpent=12;old.visits={'0,0':4};old.collection=[{...LANDMARKS[0]}];old.searched={[LANDMARKS[0].id]:true};old.adventure={id:'old-adventure',source:'gps',status:'active',startedAt:1000};old.lastGpsTimestamp=1234;
  const snapshot=JSON.parse(JSON.stringify(old));const migrated=restoreDevelopmentState(seedLandmarks(restoreResources(old)),2000);
  for(const key of ['gold','goldMetres','claimGoldSpent','visits','collection','searched','adventure','lastGpsTimestamp'] as const)assert.deepEqual(migrated[key],snapshot[key],key);
  assert.equal(migrated.lifetime!.meters,0);assert.equal(migrated.lifetime!.finds[LANDMARKS[0].id].source,'legacy');assert.deepEqual(Object.values(migrated.progression!.xp),[0,0,0,0,0,0]);
});
