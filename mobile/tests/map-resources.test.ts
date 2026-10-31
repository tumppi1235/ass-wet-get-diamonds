import { test } from 'node:test';
import assert from 'node:assert/strict';
import G from '../src/game/engine';
import { creditWalkingGold, restoreResources } from '../src/game/resources';
import { panViewport, zoomViewport } from '../src/map/camera';
import { gridForView } from '../src/map/grid';
import { PositionTracker } from '../src/location/tracker';
import { mapDetail, visitAreas } from '../src/map/visits';
import { beginQuest } from '../src/game/landmarks';
import {RELEASE_FEATURES} from '../src/config/features';
import {groundDistance} from '../src/map/geodesy';

test('gold carries partial walking distance across saves without retroactive rewards', () => {
  let state = restoreResources({ ...G.initial(), meters: 12000 });
  assert.equal(state.gold, 0); assert.equal(state.goldMetres, 0);
  creditWalkingGold(state, 69.5);
  state = restoreResources(JSON.parse(JSON.stringify(state)));
  creditWalkingGold(state, 180.5); assert.equal(state.gold, 1); assert.equal(state.goldMetres, 0);
  creditWalkingGold(state, 551); assert.equal(state.gold, 3); assert.equal(state.goldMetres, 51);
  for (const invalid of [0, -4, NaN, Infinity]) creditWalkingGold(state, invalid);
  assert.equal(state.gold, 3); assert.equal(state.goldMetres, 51);
  state = restoreResources(JSON.parse(JSON.stringify(state)));
  for (let i = 0; i < 1990; i++) creditWalkingGold(state, .1);
  assert.equal(state.gold, 4); assert.ok(state.goldMetres < 1e-7);
  assert.equal(restoreResources(G.initial()).gold, 0, 'a different profile starts with its own balance');
});

test('GPS gold uses accepted walking distance, excluding coarse fixes and teleports', () => {
  const state = restoreResources(G.initial()), tracker = new PositionTracker(); let time = 1_000_000;
  const accept = (x: number, accuracy: number) => { const p = G.geo(x, 0); const result = tracker.accept({ latitude: p.lat, longitude: p.lon, accuracy, timestamp: time, speed: 1 }, time); if (result?.eligible) creditWalkingGold(state, result.distance); time += 10000; };
  accept(0, 800); accept(200, 800); assert.equal(state.goldMetres, 0);
  accept(0, 5); accept(50, 5); accept(100, 5); assert.equal(state.gold, 0);const start=G.geo(0,0),end=G.geo(100,0),expected=RELEASE_FEATURES.nationalExploration?groundDistance({latitude:start.lat,longitude:start.lon},{latitude:end.lat,longitude:end.lon}):100;assert.ok(Math.abs(state.goldMetres-expected)<.0001);
  accept(150,5);accept(200,5);accept(251,5);assert.equal(state.gold,1);
  const carry=state.goldMetres;accept(2000,5);assert.equal(state.gold,1);assert.equal(state.goldMetres,carry);
});
test('first tile exploration pays once; revisits still accumulate distance across quests',()=>{
  let state=G.initial();G.enter(state);assert.equal(state.gold,1,'first explored tile');
  G.enter(state);assert.equal(state.gold,1,'standing still does not farm gold');
  G.move(state,260,0);creditWalkingGold(state,260);
  assert.equal(state.gold,3,'one new tile plus one distance coin');assert.ok(Math.abs(state.goldMetres-10)<1e-7);
  G.move(state,-260,0);creditWalkingGold(state,260);
  assert.equal(state.gold,4,'returning to an old tile still pays distance');
  const before=state.gold,partial=state.goldMetres;
  state=restoreResources(JSON.parse(JSON.stringify(state)));beginQuest(state);
  assert.equal(state.gold,before);assert.equal(state.goldMetres,partial);
  G.enter(state);assert.equal(state.gold,before,'starting again does not repay an old tile');
  G.move(state,20,0);creditWalkingGold(state,20);assert.equal(state.gold,before);
  creditWalkingGold(state,210);assert.equal(state.gold,before+1,'partial progress crosses outings');
  const old=restoreResources({...G.initial(),gold:9,goldMetres:85,meters:5000,visits:{'0,0':3}});
  G.enter(old);assert.equal(old.gold,9,'old visits never earn retroactive bonuses');assert.equal(old.goldMetres,85);
});

test('zoom preserves the point under the pointer, respects limits and reverses cleanly', () => {
  const original = { center: { x: 500, y: -700 }, scale: .31 }, offset = { x: 180, y: -100 };
  const pointUnder = (v: typeof original) => ({ x: v.center.x + offset.x / v.scale, y: v.center.y - offset.y / v.scale });
  for (const factor of [1.6, .625, 1000, .00001]) {
    const zoomed = zoomViewport(original, factor, offset, .004);
    assert.ok(zoomed.scale >= .004 && zoomed.scale <= 1.2);
    assert.ok(Math.abs(pointUnder(zoomed).x - pointUnder(original).x) < 1e-6);
    assert.ok(Math.abs(pointUnder(zoomed).y - pointUnder(original).y) < 1e-6);
  }
  const back = zoomViewport(zoomViewport(original, 1.6, offset, .004), 1 / 1.6, offset, .004);
  assert.ok(Math.abs(back.scale - original.scale) < 1e-10); assert.ok(Math.hypot(back.center.x - 500, back.center.y + 700) < 1e-6);
  assert.deepEqual(panViewport(original, 31, -62), { center: { x: 400, y: -900 }, scale: .31 });
});

test('tile grid exists before the first walk and remains bounded when zooming out', () => {
  const grid = gridForView({ x: 0, y: 0 }, 900, 560, .31);
  assert.ok(grid.includes('M0,') && grid.includes('V') && grid.includes('H'));
  assert.ok(grid.split('M').length > 10);
  assert.ok(gridForView({ x: 0, y: 0 }, 900, 560, .05).split('M').length < 150);
  assert.equal(gridForView({ x: 0, y: 0 }, 900, 560, .008), '', 'overview offers Tile view instead of an unreadably dense grid');
});

test('visit overlays distinguish own, other and shared tiles and aggregate distant views', () => {
  const mine = { '0,0': 1, '1,0': 1, '-1,-1': 3, '500,500': 1 }, others = { '1,0': 2, '2,0': 1 };
  const close = visitAreas(mine, others, { x: 0, y: 0 }, 1000, 560, .31);
  assert.equal(close.size, 250); assert.equal(close.areas.length, 4);
  assert.ok(close.areas.some(a => a.x === 0 && a.mine && !a.others));
  assert.ok(close.areas.some(a => a.x === 250 && a.mine && a.others));
  assert.ok(close.areas.some(a => a.x === 500 && !a.mine && a.others));
  const far = visitAreas(mine, others, { x: 0, y: 0 }, 1000, 560, .008);
  assert.equal(far.size, 2000); assert.equal(far.areas.length, 2);
  assert.ok(far.areas.some(a => a.x === -2000 && a.y === -2000), 'negative world coordinates group correctly');
  assert.equal(mapDetail(.008), 'region'); assert.equal(mapDetail(.1), 'district'); assert.equal(mapDetail(.31), 'street');
});
