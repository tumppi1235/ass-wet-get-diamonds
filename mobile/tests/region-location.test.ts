import { test } from 'node:test';
import assert from 'node:assert/strict';
import G from '../src/game/engine';
import { fitJyvaskyla, isInJyvaskyla, JYVASKYLA, visibleGameTiles } from '../src/map/region';
import { tilesForView, MAP_PROVIDERS } from '../src/map/tiles';
import { PositionTracker, type LocationFix } from '../src/location/tracker';
import { watchPlayerLocation } from '../src/location/client.web';

test('the playable boundary covers Jyväskylä municipality, including outer districts', () => {
  for (const [name, lat, lon] of [['Centre', 62.2415, 25.7472], ['Palokka', 62.285, 25.742], ['Tikkakoski', 62.4, 25.635], ['Vaajakoski', 62.244, 25.89], ['Säynätsalo', 62.14, 25.77], ['Korpilahti', 62.016, 25.563]] as const) assert.ok(isInJyvaskyla(G.xy(lat, lon)), name);
  assert.equal(isInJyvaskyla(G.xy(60.17, 24.94)), false);
  assert.ok(JYVASKYLA.geographicBounds[0].lat < 61.9 && JYVASKYLA.geographicBounds[1].lat > 62.4);
  const fit = fitJyvaskyla(900, 560), [west, south, east, north] = JYVASKYLA.bounds;
  assert.ok((east - west) * fit.scale <= 900 && (north - south) * fit.scale <= 560);
  assert.deepEqual(visibleGameTiles(fit.center, 900, 560, fit.scale), [], 'overview never creates a huge game-state grid');
  for (const p of [G.xy(62.4, 25.635), G.xy(62.016, 25.563)]) {
    const tiles = visibleGameTiles(p, 900, 560, .31, p);
    const current = G.cell(p.x, p.y); assert.ok(tiles.some(([i, j]) => i === current.i && j === current.j)); assert.ok(tiles.length <= 400);
  }
});

test('on-demand outdoor tiles cover the viewport and align with the game coordinate system', () => {
  assert.match(MAP_PROVIDERS.outdoor.attribution, /OpenTopoMap/);
  for (const point of [G.xy(62.2415, 25.7472), G.xy(62.4, 25.635), G.xy(62.016, 25.563)]) for (const scale of [.006, .05, .31, 1.2]) {
    const tiles = tilesForView(point, 1000, 560, scale, 'outdoor');
    assert.ok(tiles.length > 0 && tiles.length < 70, 'only visible tiles are requested');
    assert.equal(new Set(tiles.map(t => t.key)).size, tiles.length);
    assert.ok(tiles.every(t => t.width > 0 && t.height > 0 && t.url.startsWith('https://')));
    for (const [x, y] of [[point.x - 500 / scale, point.y - 280 / scale], [point.x + 500 / scale, point.y + 280 / scale]]) assert.ok(tiles.some(t => x >= t.west && x <= t.west + t.width && y <= t.north && y >= t.north - t.height), 'viewport corner is covered');
  }
});

test('approximate fixes locate the player without rewarding distance or enabling collection', () => {
  let now = 1_000_000;
  const fix = (lat: number, lon: number, accuracy = 5, speed = 1): LocationFix => ({ latitude: lat, longitude: lon, accuracy, timestamp: now, speed });
  const tracker = new PositionTracker(), approximate = tracker.accept(fix(62.4, 25.635, 800), now)!;
  assert.equal(approximate.reason, 'approximate'); assert.equal(approximate.eligible, false); assert.equal(approximate.position.inside, true); assert.equal(approximate.position.latitude, 62.4);
  now += 1000; const precise = tracker.accept(fix(62.4, 25.635), now)!;
  assert.equal(precise.eligible, true); assert.equal(precise.startSegment, true); assert.equal(precise.distance, 0, 'no distance for the initial fix or improved accuracy');
  const p = G.xy(62.4, 25.635), moved = G.geo(p.x + 10, p.y);
  now += 2000; assert.ok(tracker.accept(fix(moved.lat, moved.lon), now)!.distance > 9.9);
  now += 1000; const outside = tracker.accept(fix(59.3293,18.0686),now)!; assert.equal(outside.reason, 'outside'); assert.equal(outside.distance, 0); assert.equal(outside.eligible, false); assert.equal(outside.position.latitude, 59.3293);
  now += 1000; assert.equal(tracker.accept(fix(62.4, 25.635, 5, 30), now)!.eligible, false);
  now += 1000; const resumed = tracker.accept(fix(62.4, 25.635), now)!; assert.equal(resumed.distance, 0);
  assert.equal(tracker.accept(fix(62.4, 25.635), now), null, 'duplicate timestamps ignored');
  now += 1000; const jump = G.geo(p.x + 1000, p.y); assert.equal(tracker.accept(fix(jump.lat, jump.lon), now)!.reason, 'jump');
  assert.equal(new PositionTracker().accept({ ...fix(62.4, 25.635), timestamp: now - 20000 }, now), null);
  assert.equal(new PositionTracker().accept(fix(NaN, 25.635), now), null);
});

test('the browser location adapter requests high accuracy and returns actionable permission errors', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let callback: PositionCallback | undefined, failure: PositionErrorCallback | undefined, options: PositionOptions | undefined, removed = 0;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: { watchPosition(success: PositionCallback, error: PositionErrorCallback, opts: PositionOptions) { callback = success; failure = error; options = opts; return 42; }, clearWatch(id: number) { removed = id; } } } });
  try {
    const fixes: LocationFix[] = [], errors: { message: string; denied: boolean }[] = [];
    const sub = await watchPlayerLocation(f => fixes.push(f), e => errors.push(e));
    assert.equal(options?.enableHighAccuracy, true); assert.equal(options?.maximumAge, 0); assert.equal(options?.timeout, 20000);
    callback!({ coords: { latitude: 62.4, longitude: 25.635, accuracy: 900, altitude: null, altitudeAccuracy: null, heading: null, speed: null }, timestamp: 1234 } as GeolocationPosition);
    assert.equal(fixes[0].accuracy, 900, 'browser adapter keeps coarse fixes for locating the player');
    failure!({ code: 1 } as GeolocationPositionError); assert.equal(errors[0].denied, true); assert.match(errors[0].message, /Allow location/);
    failure!({ code: 3 } as GeolocationPositionError); assert.match(errors[1].message, /longer than expected/);
    sub.remove(); assert.equal(removed, 42);
  } finally { if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor); else Reflect.deleteProperty(globalThis, 'navigator'); }
});
