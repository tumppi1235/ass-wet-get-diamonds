import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Redirect, router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { usePlayerLocation } from '../location/use-player-location';
import type { TrackedFix } from '../location/tracker';
import { useSession } from '../accounts/session';
import { useGame } from '../game/state';
import G from '../game/engine';
import { creditWalkingGold } from '../game/resources';
import { claimPrice, currentTile, tilePoint } from '../game/claims';
import { PixelIcon } from '../components/pixel-icon';
import { CityMap } from '../components/city-map';
import { Button, colors, Loading, pixelFont, styles } from '../components/ui';
import { availableRelics, beginQuest, captureAt, captureTarget, relicPoint } from '../game/landmarks';
import {adventureActive,applyExplorationFix,endAdventure,requestAdventure} from '../game/adventure';
import {APP_ENV} from '../config/environment';
import {recordArtifactEvidence} from '../game/achievements';
type Point = { x: number; y: number };
const Streets = require('../../../public/streets.js');
const streetData = require('../../../public/streets-osm.json');
export default function Explore() {
  const { session, loading } = useSession(), { game, communityVisits, claims, claiming, claimTile, change, flush } = useGame();
  const [mode, setMode] = useState<'stopped' | 'demo' | 'gps'>('stopped'), [message, setMessage] = useState('Discovery ready. Start a quest to earn walking rewards.'), [now, setNow] = useState(() => Date.now()), [source, setSource] = useState<'demo' | 'gps' | null>('gps'), [demoRun, setDemoRun] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [selectedTile,setSelectedTile]=useState<string>();
  const { target: selectedId } = useLocalSearchParams<{ target?: string }>();
  const route = useRef<Point[]>([]), modeRef = useRef(mode), state = useRef(game);
  useEffect(() => { state.current = game; modeRef.current = mode; }, [game, mode]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const onGameFix = useCallback((fix: TrackedFix) => {change(s=>{applyExplorationFix(s,fix);});},[change]);
  const { position, tracking, locating, message: locationMessage, fresh: gpsFresh, focusRequest, status:locationStatus,recoveries,rejected,latestFix,start: startLocation, stop: stopLocation } = usePlayerLocation(onGameFix);
  const playerId=session?.user.id,gameReady=!!game;
  useEffect(()=>{if(playerId&&gameReady)void startLocation();},[playerId,gameReady,startLocation]);
  const stop = useCallback(() => { change(s=>endAdventure(s));setMode('stopped'); modeRef.current = 'stopped'; stopLocation(); void flush().catch(() => {}); }, [change,flush, stopLocation]);
  useEffect(() => { const timer = setInterval(() => { if (modeRef.current !== 'demo' || !state.current) return; change(s => { const p = route.current[0]; if (!p) return; const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy), step = Math.min(d, 1000 / 360 * 20 * .1); if (d < .01) { route.current.shift(); return; } G.move(s, dx / d * step, dy / d * step); creditWalkingGold(s, step); }); if (!route.current.length) { stop(); setMessage('Demo complete. Explore a tile or start another walk.'); } }, 100); return () => clearInterval(timer); }, [change, stop]);
  function demo() { stop(); if (!state.current) return; const roads = new Streets(streetData, G.xy), p = roads.project(state.current); if (!p) return; change(s => { beginQuest(s);s.adventure={id:'demo:'+Date.now(),source:'demo',status:'active',startedAt:Date.now()}; s.x = p.x; s.y = p.y; s.path.push({ x: p.x, y: p.y, breakBefore: true }); G.enter(s); }); let current: Point = p; const points: Point[] = []; for (const [lat, lon] of [[62.2427, 25.7442], [62.2448, 25.7408], [62.2444, 25.7334], [62.2419, 25.7302], [62.2384, 25.7328], [62.2415, 25.7472]]) { const leg = roads.route(current, G.xy(lat, lon)); if (leg?.length) { points.push(...leg); current = leg[leg.length - 1]; } } route.current = points; setMode('demo');modeRef.current='demo'; setSource('demo'); setDemoRun(v => v + 1);setSelectedTile(undefined); setMessage('Demo walk · mapped streets · 20× speed · earns test gold'); }
  function gps() { change(s=>requestAdventure(s));setMode('gps');modeRef.current='gps';setSource('gps');setSelectedTile(undefined);setMessage('Adventure active. GPS interruptions will not end it.');void startLocation(); }
  function locate() { if(modeRef.current==='demo')stop();setSelectedTile(undefined);setSource('gps');if(!tracking||locationStatus!=='tracking'||!latestFix())void startLocation(); }
  const discover = useCallback((visibleIds: [number, number][]) => { if (!state.current) return; const here = G.cell(state.current.x, state.current.y), ids = visibleIds.filter(([i, j]) => Math.abs(i - here.i) <= 1 && Math.abs(j - here.j) <= 1); if (!state.current?.lastCell || ids.every(([i, j]) => Object.hasOwn(state.current!.revealed, G.key(i, j)))) return; change(s => { for (const [i, j] of ids) { const id = G.key(i, j); if (!Object.hasOwn(s.revealed, id)) s.revealed[id] = G.relic(i, j, s.visits); } }); }, [change]);
  if (loading) return <Loading />; if (!session) return <Redirect href="/login" />; if (!game) return <Loading />;
  const navigationPoint = source === 'gps' && position ? position : game;
  const active = mode === 'demo' || (adventureActive(game)&&game.adventure?.source==='gps');
  const eligible = mode === 'demo' || (source === 'gps' && tracking && gpsFresh > 0 && now>=gpsFresh && now - gpsFresh < 15000 && !game.adventure?.pendingStart);
  const available = availableRelics(game, navigationPoint),inTile=captureTarget(game,navigationPoint),capturable = eligible ? inTile : undefined;
  const next = capturable || available.find(r => r.id === selectedId) || available[0];
  const destination = next && relicPoint(next), dx = destination ? destination.x - navigationPoint.x : 0, dy = destination ? destination.y - navigationPoint.y : 1;
  const distance = Math.hypot(dx, dy), angle = Math.atan2(dx, dy) * 180 / Math.PI;
  const capture = () => {const live=modeRef.current==='demo'?state.current:latestFix()?.position;if(!live||state.current?.adventure?.pendingStart){setMessage('Waiting for a fresh, accurate GPS fix. Your adventure is still active.');return;}change(s => {const result=captureAt(s,live,true);if(APP_ENV==='development'&&modeRef.current!=='demo'&&result.status==='success')recordArtifactEvidence(s,result.item!,Date.now());setMessage(result.status==='success'?'Collected! '+result.item!.name+' is saved in your collection.':result.status==='miss'?'Search unsuccessful. One attempt per artefact per adventure; try on your next outing.':'Enter the artefact’s tile with accurate GPS, or check whether it was already attempted.');});void flush().catch(()=>{});};
  const tile=selectedTile || currentTile(game),claim=claims[tile],price=claimPrice(claim),owned=claim?.ownerId===session.user.id;
  const visited=!!tilePoint(tile)&&game.visits[tile]>0;
  async function purchase(){try{await claimTile(tile,price);setMessage(`Tile ${tile} claimed for ${price} gold. Ownership saved.`);}catch(e){setMessage((e as Error).message);}}
  return <View style={{ flex: 1, backgroundColor: colors.paper }}>
    {APP_ENV==='development'&&<Text style={{position:'absolute',top:8,left:'40%',zIndex:10,color:colors.gold,backgroundColor:colors.paper,padding:6}}>DEV TEST</Text>}
    <CityMap fullScreen game={game} communityVisits={communityVisits} onDiscover={discover} player={source === 'gps' && position ? {...position,precise:eligible&&position.precise} : null} demo={source === 'demo'} focusKey={source === 'demo' ? 'demo:' + demoRun : source === 'gps' && position ? 'gps:' + focusRequest : ''} locating={locating} onLocate={locate} selectedRelicId={next?.id} capturableId={capturable?.id} onSelectRelic={id=>router.setParams({target:id})} claims={claims} ownerId={session.user.id} activeTileId={currentTile(game)} selectedTileId={selectedTile} onSelectTile={id=>{setSelectedTile(id);setDrawer(true);}} />
    <Pressable accessibilityRole="button" accessibilityLabel="Open quest details" onPress={() => setDrawer(true)} style={{ position: 'absolute', left: 10, top: 12, width: 108, minHeight: 110, padding: 10, alignItems: 'center', backgroundColor: '#152D2AF2', borderColor: colors.gold, borderWidth: 2, borderRadius: 3 }}>
      <Text style={{ fontFamily: pixelFont, color: colors.gold, fontSize: 11 }}>N ↑</Text><Text style={{ fontFamily: pixelFont, fontSize: 39, lineHeight: 44, color: colors.gold, transform: [{ rotate: angle + 'deg' }] }}>{next ? '↑' : '✥'}</Text><Text numberOfLines={2} style={{ color: colors.ink, fontSize: 10, textAlign: 'center' }}>{next?.landmark || next?.name || 'Explore'}</Text><Text style={{ color: colors.gold, fontFamily: pixelFont, fontSize: 14 }}>{next ? Math.round(distance) + ' m' : ''}</Text>
    </Pressable>
    {!drawer && <Pressable accessibilityRole="button" accessibilityLabel="Open quest controls" onPress={() => setDrawer(true)} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, minHeight: 50, padding: 12, backgroundColor: '#142A2BF5', borderTopColor: colors.gold, borderTopWidth: 2 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}><PixelIcon name="coin" size={24} /><Text style={{ color: colors.gold, fontFamily: pixelFont, fontSize: 17 }}>{game.gold}</Text><Text style={{ color: colors.gold, fontFamily: pixelFont, fontSize: 15, flexShrink: 1, textAlign: 'center' }}>{capturable ? 'RELIC READY · TAP TO COLLECT ▴' : active ? 'QUEST ACTIVE · CONTROLS ▴' : 'QUEST STOPPED · TAP TO START ▴'}</Text></View></Pressable>}
    {drawer && <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '58%', backgroundColor: '#142A2BF8', borderTopColor: colors.gold, borderTopWidth: 2 }}>
      <View style={[styles.spread, { padding: 12 }]}><Text style={styles.eyebrow}>QUEST / {session.user.displayName}</Text><Button title="Hide" quiet onPress={() => setDrawer(false)} /></View>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 28, gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}><Button title="Start quest" disabled={active} style={{ flex: 1 }} onPress={() => { gps(); setDrawer(false); }} /><Button title="Stop quest" disabled={!active && !tracking} style={{ flex: 1 }} quiet onPress={() => { stop(); setMessage('Quest stopped. Progress saved.'); setDrawer(false); }} /></View>
        {inTile && <Button title="Collect artefact" disabled={!eligible} onPress={capture} />}
        <Text accessibilityLiveRegion="polite" style={{color:colors.gold,fontSize:12}}>{eligible?'Active tile':'Last validated tile'} {currentTile(game)} · {source==='demo'?'Demo':position?`GPS ±${Math.round(position.accuracy)} m · ${Math.max(0,Math.floor((now-position.timestamp)/1000))}s ago`:'Waiting for GPS'}{selectedTile?` · selected purchase tile ${selectedTile}`:''}</Text>
        {source==='gps'&&<Text style={styles.small}>GPS: {locationStatus} · recoveries {recoveries} · rejected fixes {rejected}. {active?'Adventure saved and active.':'Discovery mode · collection is available without recording an adventure.'}</Text>}
        <Text accessibilityLiveRegion="polite" style={styles.body}>{source === 'gps' && (tracking || locating || !position) ? locationMessage : 'GPS is off. Tap Me to refresh your position, or start a quest.'}</Text><Text accessibilityLiveRegion="polite" style={{ color: colors.gold, fontSize: 12 }}>{message}</Text>
        <View style={styles.row}><PixelIcon name="coin" size={28} /><Text style={styles.body}>Gold {game.gold} · Walked {(game.meters / 1000).toFixed(2)} km · Collection {game.collection.length}</Text></View>
        <View style={{padding:12,borderWidth:1,borderColor:owned?colors.gold:colors.line,gap:8}}>
          <Text style={styles.eyebrow}>TILE {tile} · {owned?'YOURS':claim?`OWNED BY ${claim.ownerName}`:'UNCLAIMED'}</Text>
          <Text style={styles.small}>{owned?`Bought for ${claim.pricePaid} gold. The next buyer pays ${price} gold.`:visited?`${price} gold to ${claim?'take ownership of':'claim'} this tile. Each purchase raises this tile’s price by 1 gold.`:'Visit this tile first. Tap an explored tile on the map to choose it.'}</Text>
          <Button title={owned?'Tile claimed':`Claim tile · ${price} gold`} busy={claiming} disabled={owned||!visited||game.gold<price} onPress={()=>{void purchase();}}/>
          {!owned&&visited&&game.gold<price&&<Text style={styles.small}>Walk to earn {price-game.gold} more gold.</Text>}
          {selectedTile&&<Button title="Use my explored tile" quiet onPress={()=>setSelectedTile(undefined)}/>}
          <Text style={styles.small}>Claims are shared between profiles on this phone. Gold is spent, not paid to the previous owner.</Text>
        </View>
        {next && <Text style={styles.body}>{next.landmark || next.name}: {Math.round(distance)} m · {next.rarity}. Enter its tile to attempt collection. Use mapped paths; the compass shows a north-up bearing.</Text>}
        <View style={styles.row}>{[{ href: '/relics' as const, title: 'Relics' }, { href: '/collection' as const, title: 'Collection' }, { href: '/profile' as const, title: 'Profile' }].map(tab => <Link key={tab.href} href={tab.href} onPress={() => {void flush().catch(()=>{});}} style={{ fontFamily: pixelFont, color: colors.gold, fontSize: 22, padding: 8 }}>{tab.title}</Link>)}</View>
        <Text style={styles.small}>1 gold per 250 m + 1 per newly explored tile during adventures. Progress stays on this phone. The adventure survives screen lock; iPhone browser GPS can pause. Return to the app to reconnect. Missing GPS distance is not invented.</Text>
        <Button title="Try city demo" quiet onPress={() => { demo(); setDrawer(false); }} />
      </ScrollView>
    </View>}
  </View>;
}
