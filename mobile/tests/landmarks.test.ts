import { test } from 'node:test';
import assert from 'node:assert/strict';
import G from '../src/game/engine';
import { availableRelics, beginQuest, captureAt, LANDMARKS, relicPoint, seedLandmarks } from '../src/game/landmarks';
import { isInJyvaskyla } from '../src/map/region';
test('landmarks include reachable Haukkala and Sippulanniemi destinations with unique cells', () => {
  assert.equal(LANDMARKS.length, 23); assert.equal(new Set(LANDMARKS.map(r => r.id)).size, 23);
  for(const area of ['Haukkala','Sippulanniemi']){
    const finds=LANDMARKS.filter(r=>r.landmark!.startsWith(area));
    assert.equal(finds.length,7);
    assert.deepEqual(finds.map(r=>r.name).sort(),['Compass','Rune','Stone','Shard','Crown','Key','Lantern'].sort());
    for(const r of finds)assert.match(r.source!,/^https:\/\/www.openstreetmap.org\/way\/\d+$/);
  }
  for (const r of LANDMARKS) { const p = relicPoint(r); assert.ok(isInJyvaskyla(p)); const c = G.cell(p.x, p.y); assert.equal(r.id, G.key(c.i, c.j)); }
});
test('landmark collection requires proximity and an eligible fix and remains collected after reseeding', () => {
  const state = G.initial(), r = LANDMARKS[0], p = relicPoint(r); state.x = p.x; state.y = p.y; G.enter(state);
  assert.equal(captureAt(state, p, false, () => 0).status, 'unavailable'); assert.equal(state.collection.length, 0);
  const far = { x: p.x + 500, y: p.y + 500 }; assert.notEqual(availableRelics(state, far)[0]?.id, r.id);
  const previous = state.lastCell; assert.equal(captureAt(state, p, true, () => 0).status, 'success'); assert.equal(state.lastCell, previous);
  assert.ok(state.collection.some(item => item.id === r.id)); seedLandmarks(state); assert.ok(!availableRelics(state, p).some(item => item.id === r.id));
});
test('every regional artefact type can be collected at its real path coordinate',()=>{
  for(const relic of LANDMARKS.filter(r=>/^(Haukkala|Sippulanniemi)/.test(r.landmark!))){
    const state=G.initial(),p=relicPoint(relic);state.x=p.x;state.y=p.y;G.enter(state);
    assert.equal(captureAt(state,p,false,()=>0).status,'unavailable');
    const result=captureAt(state,p,true,()=>0);
    assert.equal(result.status,'success',relic.landmark);
    assert.equal(result.item!.name,relic.name);assert.equal(result.item!.id,relic.id);
  }
});
test('a new quest renews attempts and distance but keeps gold, visited tiles and collection', () => {
  const state = G.initial(); state.gold = 8; state.goldMetres = 22; state.visits['0,0'] = 2; state.meters = 1234; state.searched[LANDMARKS[0].id] = true;
  beginQuest(state); assert.equal(state.meters, 0); assert.equal(state.energy, 0); assert.deepEqual(state.searched, {}); assert.equal(state.gold, 8); assert.equal(state.goldMetres, 22); assert.equal(state.visits['0,0'], 2);
  const outing = state.outing; beginQuest(state); assert.equal(state.outing, outing + 1);
});
