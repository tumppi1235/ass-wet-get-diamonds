import { test } from 'node:test';
import assert from 'node:assert/strict';
import G from '../src/game/engine';
import { creditWalkingGold, restoreResources } from '../src/game/resources';
import { panViewport, zoomViewport } from '../src/map/camera';
import { gridForView } from '../src/map/grid';
import { PositionTracker } from '../src/location/tracker';
import { mapDetail, visitAreas } from '../src/map/visits';

test('gold carries partial walking distance across saves without retroactive rewards', () => {
  let state = restoreResources({ ...G.initial(), meters: 12000 });
  assert.equal(state.gold, 0); assert.equal(state.goldMetres, 0);
  creditWalkingGold(state, 69.5);
  state = restoreResources(JSON.parse(JSON.stringify(state)));
  creditWalkingGold(state, 30.5); assert.equal(state.gold, 1); assert.equal(state.goldMetres, 0);
  creditWalkingGold(state, 251); assert.equal(state.gold, 3); assert.equal(state.goldMetres, 51);
  for (const invalid of [0, -4, NaN, Infinity]) creditWalkingGold(state, invalid);
  assert.equal(state.gold, 3); assert.equal(state.goldMetres, 51);
  state = restoreResources(JSON.parse(JSON.stringify(state)));
  for (let i = 0; i < 490; i++) creditWalkingGold(state, .1);
  assert.equal(state.gold, 4); assert.ok(state.goldMetres < 1e-7);
  assert.equal(restoreResources(G.initial()).gold, 0, 'a different profile starts with its own balance');
});

test('GPS gold uses accepted walking distance, excluding coarse fixes and teleports', () => {
  const state = restoreResources(G.initial()), tracker = new PositionTracker(); let time = 1_000_000;
  const accept = (x: number, accuracy: number) => { const p = G.geo(x, 0); const result = tracker.accept({ latitude: p.lat, longitude: p.lon, accuracy, timestamp: time, speed: 1 }, time); if (result?.eligible) creditWalkingGold(state, result.distance); time += 10000; };
  accept(0, 800); accept(200, 800); assert.equal(state.goldMetres, 0);
  accept(0, 5); accept(50, 5); accept(100, 5); assert.equal(state.gold, 1);
  accept(2000, 5); assert.equal(state.gold, 1); assert.ok(state.goldMetres < 1e-7);
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
