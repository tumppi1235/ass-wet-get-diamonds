import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Redirect, useLocalSearchParams } from 'expo-router';
import { AppState, Pressable, ScrollView, Text, View } from 'react-native';
import { usePlayerLocation } from '../location/use-player-location';
import type { TrackedFix } from '../location/tracker';
import { useSession } from '../accounts/session';
import { useGame } from '../game/state';
import G from '../game/engine';
import { creditWalkingGold } from '../game/resources';
import { PixelIcon } from '../components/pixel-icon';
import { CityMap } from '../components/city-map';
import { Button, colors, Loading, pixelFont, styles } from '../components/ui';
import { availableRelics, beginQuest, captureAt, captureTarget, relicPoint } from '../game/landmarks';
type Point = { x: number; y: number };
const Streets = require('../../../public/streets.js');
const streetData = require('../../../public/streets-osm.json');
export default function Explore() {
  const { session, loading } = useSession(), { game, communityVisits, change, flush } = useGame();
  const [mode, setMode] = useState<'stopped' | 'demo' | 'gps'>('stopped'), [message, setMessage] = useState('Find your location, or try a street-following demo.'), [now, setNow] = useState(() => Date.now()), [source, setSource] = useState<'demo' | 'gps' | null>(null), [demoRun, setDemoRun] = useState(0);
  const questPending = useRef(false), questRunning = useRef(false);
  const [drawer, setDrawer] = useState(false);
  const { target: selectedId } = useLocalSearchParams<{ target?: string }>();
  const route = useRef<Point[]>([]), modeRef = useRef(mode), state = useRef(game);
  useEffect(() => { state.current = game; modeRef.current = mode; }, [game, mode]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const onGameFix = useCallback((fix: TrackedFix) => { if (!questRunning.current) return; change(s => {
    if (questPending.current) { beginQuest(s); questPending.current = false; }
    s.x = fix.position.x; s.y = fix.position.y; s.meters += fix.distance; s.energy += fix.distance; creditWalkingGold(s, fix.distance); G.enter(s);
    if (fix.distance || fix.startSegment || !s.path.length) s.path.push({ x: s.x, y: s.y, breakBefore: fix.startSegment });
    if (s.path.length > 2000) s.path.shift();
  }); }, [change]);
  const { position, tracking, locating, message: locationMessage, fresh: gpsFresh, focusRequest, start: startLocation, stop: stopLocation } = usePlayerLocation(onGameFix);
  const stop = useCallback(() => { questRunning.current = false; setMode('stopped'); modeRef.current = 'stopped'; stopLocation(); void flush().catch(() => {}); }, [flush, stopLocation]);
  useEffect(() => { const sub = AppState.addEventListener('change', v => { if (v === 'background') stop(); }); return () => sub.remove(); }, [stop]);
  useEffect(() => { const timer = setInterval(() => { if (modeRef.current !== 'demo' || !state.current) return; change(s => { const p = route.current[0]; if (!p) return; const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy), step = Math.min(d, 1000 / 360 * 20 * .1); if (d < .01) { route.current.shift(); return; } G.move(s, dx / d * step, dy / d * step); creditWalkingGold(s, step); }); if (!route.current.length) { stop(); setMessage('Demo complete. Explore a tile or start another walk.'); } }, 100); return () => clearInterval(timer); }, [change, stop]);
  function demo() { stop(); if (!state.current) return; const roads = new Streets(streetData, G.xy), p = roads.project(state.current); if (!p) return; change(s => { beginQuest(s); s.x = p.x; s.y = p.y; s.path.push({ x: p.x, y: p.y, breakBefore: true }); G.enter(s); }); let current: Point = p; const points: Point[] = []; for (const [lat, lon] of [[62.2427, 25.7442], [62.2448, 25.7408], [62.2444, 25.7334], [62.2419, 25.7302], [62.2384, 25.7328], [62.2415, 25.7472]]) { const leg = roads.route(current, G.xy(lat, lon)); if (leg?.length) { points.push(...leg); current = leg[leg.length - 1]; } } route.current = points; setMode('demo'); setSource('demo'); setDemoRun(v => v + 1); setMessage('Demo walk · mapped streets · 20× speed · earns test gold'); }
  function gps() { stop(); questPending.current = true; questRunning.current = true; setMode('gps'); setSource('gps'); setMessage(''); void startLocation(); }
  function locate() { if (tracking) return; setSource('gps'); setMessage('Location only. Open Quest to start earning gold.'); void startLocation(); }
  const discover = useCallback((visibleIds: [number, number][]) => { if (!state.current) return; const here = G.cell(state.current.x, state.current.y), ids = visibleIds.filter(([i, j]) => Math.abs(i - here.i) <= 1 && Math.abs(j - here.j) <= 1); if (!state.current?.lastCell || ids.every(([i, j]) => Object.hasOwn(state.current!.revealed, G.key(i, j)))) return; change(s => { for (const [i, j] of ids) { const id = G.key(i, j); if (!Object.hasOwn(s.revealed, id)) s.revealed[id] = G.relic(i, j, s.visits); } }); }, [change]);
  if (loading) return <Loading />; if (!session) return <Redirect href="/login" />; if (!game) return <Loading />;
  const navigationPoint = source === 'gps' && position ? position : game;
  const active = mode === 'demo' || (mode === 'gps' && tracking);
  const eligible = mode === 'demo' || (mode === 'gps' && source === 'gps' && tracking && gpsFresh > 0 && now - gpsFresh < 15000);
  const available = availableRelics(game, navigationPoint), capturable = eligible ? captureTarget(game, navigationPoint) : undefined;
  const next = capturable || available.find(r => r.id === selectedId) || available[0];
  const destination = next && relicPoint(next), dx = destination ? destination.x - navigationPoint.x : 0, dy = destination ? destination.y - navigationPoint.y : 1;
  const distance = Math.hypot(dx, dy), angle = Math.atan2(dx, dy) * 180 / Math.PI;
  const capture = () => change(s => { const result = captureAt(s, navigationPoint, eligible); setMessage(result.status === 'success' ? 'Collected! ' + result.item!.name + ' is saved in your collection.' : result.status === 'miss' ? 'The relic slipped away. Try this place on your next quest.' : 'Move closer with an accurate location to collect.'); });
  return <View style={{ flex: 1, backgroundColor: colors.paper }}>
    <CityMap fullScreen game={game} communityVisits={communityVisits} onDiscover={discover} player={source === 'gps' ? position : null} demo={source === 'demo'} focusKey={source === 'demo' ? 'demo:' + demoRun : source === 'gps' && position ? 'gps:' + focusRequest : ''} locating={locating} onLocate={locate} />
    <Pressable accessibilityRole="button" accessibilityLabel="Open quest details" onPress={() => setDrawer(true)} style={{ position: 'absolute', left: 10, top: 12, width: 108, minHeight: 110, padding: 10, alignItems: 'center', backgroundColor: '#152D2AF2', borderColor: colors.gold, borderWidth: 2, borderRadius: 3 }}>
      <Text style={{ fontFamily: pixelFont, color: colors.gold, fontSize: 11 }}>N ↑</Text><Text style={{ fontFamily: pixelFont, fontSize: 39, lineHeight: 44, color: colors.gold, transform: [{ rotate: angle + 'deg' }] }}>{next ? '↑' : '✥'}</Text><Text numberOfLines={2} style={{ color: colors.ink, fontSize: 10, textAlign: 'center' }}>{next?.landmark || next?.name || 'Explore'}</Text><Text style={{ color: colors.gold, fontFamily: pixelFont, fontSize: 14 }}>{next ? Math.round(distance) + ' m' : ''}</Text>
    </Pressable>
    {!drawer && <Pressable accessibilityRole="button" accessibilityLabel="Open quest controls" onPress={() => setDrawer(true)} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, minHeight: 50, padding: 12, backgroundColor: '#142A2BF5', borderTopColor: colors.gold, borderTopWidth: 2 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}><PixelIcon name="coin" size={24} /><Text style={{ color: colors.gold, fontFamily: pixelFont, fontSize: 17 }}>{game.gold}</Text><Text style={{ color: colors.gold, fontFamily: pixelFont, fontSize: 15, flexShrink: 1, textAlign: 'center' }}>{capturable ? 'RELIC READY · TAP TO COLLECT ▴' : active ? 'QUEST ACTIVE · CONTROLS ▴' : 'QUEST STOPPED · TAP TO START ▴'}</Text></View></Pressable>}
    {drawer && <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '58%', backgroundColor: '#142A2BF8', borderTopColor: colors.gold, borderTopWidth: 2 }}>
      <View style={[styles.spread, { padding: 12 }]}><Text style={styles.eyebrow}>QUEST / {session.user.displayName}</Text><Button title="Hide" quiet onPress={() => setDrawer(false)} /></View>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 28, gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}><Button title="Start quest" disabled={active} style={{ flex: 1 }} onPress={() => { gps(); setDrawer(false); }} /><Button title="Stop quest" disabled={!active && !tracking} style={{ flex: 1 }} quiet onPress={() => { stop(); setMessage('Quest stopped. Progress saved.'); setDrawer(false); }} /></View>
        {capturable && <Button title="Collect artefact" onPress={capture} />}
        <Text accessibilityLiveRegion="polite" style={styles.body}>{tracking ? locationMessage : 'GPS is off. Start quest to explore and earn gold.'}</Text><Text accessibilityLiveRegion="polite" style={{ color: colors.gold, fontSize: 12 }}>{message}</Text>
        <View style={styles.row}><PixelIcon name="coin" size={28} /><Text style={styles.body}>Gold {game.gold} · Walked {(game.meters / 1000).toFixed(2)} km · Collection {game.collection.length}</Text></View>
        {next && <Text style={styles.body}>{next.landmark || next.name}: {Math.round(distance)} m · {next.rarity}. {next.landmarkId ? 'Get within 70 m to collect.' : 'Enter its tile to collect.'} Use mapped paths; the compass shows a north-up bearing.</Text>}
        <View style={styles.row}>{[{ href: '/relics' as const, title: 'Relics' }, { href: '/collection' as const, title: 'Collection' }, { href: '/profile' as const, title: 'Profile' }].map(tab => <Link key={tab.href} href={tab.href} onPress={() => { stop(); }} style={{ fontFamily: pixelFont, color: colors.gold, fontSize: 22, padding: 8 }}>{tab.title}</Link>)}</View>
        <Text style={styles.small}>1 gold per 100 m. Progress stays on this phone. Keep the app open; leaving the map pauses your quest.</Text>
        <Button title="Try city demo" quiet onPress={() => { demo(); setDrawer(false); }} />
      </ScrollView>
    </View>}
  </View>;
}
