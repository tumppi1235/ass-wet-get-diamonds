import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Platform, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G as Group, Path, Rect, Text as SvgText } from 'react-native-svg';
import G from '../game/engine';
import type { GameState } from '../game/types';
import type { PlayerPosition } from '../location/tracker';
import { fitJyvaskyla, JYVASKYLA, visibleGameTiles, type Point } from '../map/region';
import { MAP_PROVIDERS, tilesForView, type MapStyle } from '../map/tiles';
import { Button, colors, styles } from './ui';
import { MapColors } from './map-colors';
import { MapSurface } from './map-surface';
import { panViewport, zoomViewport } from '../map/camera';
import { LANDMARKS, relicPoint } from '../game/landmarks';
import { gridForView } from '../map/grid';
import { mapDetail, visitAreas } from '../map/visits';

type Feature = { k: string; p: number[][]; b: number[]; n?: string; t?: string; holes?: number[][][] };
const data = require('../../assets/city-map.json') as { features: Feature[]; labels: { p: number[]; name: string; type: string }[] };
const line = (points: number[][]) => points.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${-p[1]}`).join('');
const features = data.features.map(f => ({ ...f, d: line(f.p) + (f.k !== 'road' && f.k !== 'rail' ? 'Z' : '') + (f.holes || []).map(h => line(h) + 'Z').join('') }));
const boundaryPath = JYVASKYLA.polygons.map(p => line(p.outer) + 'Z' + p.holes.map(h => line(h) + 'Z').join('')).join('');
const identify = 'TrailRelics/0.4 (+https://github.com/tumppi1235/ass-wet-get-diamonds)';

type Props = { game: GameState; communityVisits: Record<string, number>; onDiscover(ids: [number, number][]): void; player: PlayerPosition | null; focusKey: string; demo: boolean; locating: boolean; onLocate(): void; fullScreen?: boolean };
export function CityMap({ game, communityVisits, onDiscover, player, focusKey, demo, locating, onLocate, fullScreen = false }: Props) {
  const [width, setWidth] = useState(750), [mapStyle, setMapStyle] = useState<MapStyle>('street'), [failed, setFailed] = useState<Record<string, boolean>>({});
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const height = fullScreen ? screenHeight : screenWidth < 700 ? Math.max(330, Math.min(480, screenHeight * .52)) : 560, area = useMemo(() => fitJyvaskyla(width, height), [width, height]);
  const [camera, setCamera] = useState({ mode: 'pan' as 'area' | 'player' | 'pan', center: { x: game.x, y: game.y }, scale: .31, focusKey });
  const target = player || (demo && game.lastCell ? { x: game.x, y: game.y } : null);
  const requested = !!target && !!focusKey && focusKey !== camera.focusKey;
  const mode = requested ? 'player' : camera.mode;
  const center = mode === 'area' ? area.center : mode === 'player' && target ? target : camera.center;
  const scale = mode === 'area' ? area.scale : requested ? .31 : camera.scale;
  const halfW = width / scale / 2, halfH = height / scale / 2;
  const effective = mapStyle === 'outdoor' && failed.outdoor ? 'street' : mapStyle;
  const online = effective !== 'offline' && !failed[effective] ? effective : null;
  const raster = useMemo(() => online ? tilesForView(center, width, height, scale, online) : [], [online, center, width, height, scale]);
  const detail = mapDetail(scale);
  const visible = useMemo(() => online ? [] : features.filter(f => f.b[0] < center.x + halfW && f.b[2] > center.x - halfW && f.b[1] < center.y + halfH && f.b[3] > center.y - halfH).filter(f => detail === 'street' || (detail === 'district' ? f.k !== 'building' && f.t !== 'steps' : ['water', 'forest'].includes(f.k) || ['primary', 'secondary', 'motorway', 'trunk'].includes(f.t || ''))), [online, center, halfW, halfH, detail]);
  const layers = useMemo(() => Object.fromEntries(['park', 'forest', 'water', 'building', 'rail', 'major', 'street', 'path'].map(k => [k, visible.filter(f => f.k === k || (f.k === 'road' && (['primary', 'secondary', 'tertiary', 'motorway', 'trunk'].includes(f.t || '') ? 'major' : ['footway', 'path', 'steps', 'cycleway'].includes(f.t || '') ? 'path' : 'street') === k)).map(f => f.d).join('')])), [visible]);
  const gameTiles = useMemo(() => visibleGameTiles(center, width, height, scale, game), [center, width, height, scale, game]);
  useEffect(() => { if (game.lastCell && gameTiles.length) onDiscover(gameTiles); }, [gameTiles, game.lastCell, onDiscover]);
  const liveView = useRef({ center, scale, mode, focusKey, minimum: area.scale / 2 });
  useEffect(() => { liveView.current = { center, scale, mode, focusKey, minimum: area.scale / 2 }; }, [center, scale, mode, focusKey, area.scale]);
  const onPan = useCallback((dx: number, dy: number) => {
    const current = liveView.current, next = { ...current, ...panViewport(current, dx, dy), mode: 'pan' as const };
    liveView.current = next; setCamera(next);
  }, [setCamera]);
  const onZoom = useCallback((factor: number, offset: Point) => {
    const current = liveView.current, next = { ...current, ...zoomViewport(current, factor, offset, current.minimum), mode: 'pan' as const };
    liveView.current = next; setCamera(next);
  }, [setCamera]);
  const zoom = (factor: number) => onZoom(factor, { x: 0, y: 0 });
  const explored = useMemo(() => visitAreas(game.visits, communityVisits, center, width, height, scale), [game.visits, communityVisits, center, width, height, scale]);
  const [showPlaces, setShowPlaces] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const grid = useMemo(() => showGrid ? gridForView(center, width, height, scale) : '', [showGrid, center, width, height, scale]);
  const tileView = () => setCamera({ mode: 'pan', center: target || { x: game.x, y: game.y }, scale: .31, focusKey });
  const found = new Set(game.collection.map(r => r.id)), current = G.cell(game.x, game.y);
  const box = `${center.x - halfW} ${-center.y - halfH} ${width / scale} ${height / scale}`;
  const trail = game.path.map((p, i) => `${!i || p.breakBefore ? 'M' : 'L'}${p.x},${-p.y}`).join('');
  const scaleMeters = scale < .025 ? 10000 : scale < .1 ? 1000 : 250;
  const provider = online && MAP_PROVIDERS[online];
  const hint = online === 'outdoor' ? 'Outdoor terrain · contours and trails' : online === 'street' && mapStyle === 'outdoor' ? 'Outdoor service unavailable · street fallback' : online === 'street' ? 'Street map' : 'Offline centre detail · internet needed for wider map';
  return <View style={{ borderWidth: fullScreen ? 0 : 1, borderColor: colors.line, borderRadius: fullScreen ? 0 : 3, overflow: 'hidden', backgroundColor: colors.white }}>
    {!fullScreen && <>
    <View style={[styles.spread, { padding: 14 }]}><View><Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>{screenWidth < 700 ? 'Jyväskylä' : 'Jyväskylä / quest map'}</Text><Text style={styles.small}>{hint}</Text></View><View style={[styles.row, { flexShrink: 1 }]}>{screenWidth >= 700 && <Button title="Nearby" quiet onPress={tileView} />}<Button title="City" quiet onPress={() => setCamera({ mode: 'area', center: area.center, scale: area.scale, focusKey })} /><Button title={locating ? 'Locating…' : '◎ Me'} busy={locating} quiet onPress={() => player ? setCamera({ mode: 'player', center: player, scale: Math.max(.25, scale), focusKey }) : onLocate()} /></View></View>
    <View style={[styles.spread, { paddingHorizontal: 14, paddingBottom: 12 }]}><View style={[styles.row, { width: '100%', gap: 8 }]}>{(screenWidth < 700 ? ['street', 'outdoor'] as const : ['street', 'outdoor', 'offline'] as const).map(style => <Button key={style} title={style === 'outdoor' ? 'Terrain' : style === 'street' ? 'Street' : 'Offline centre'} quiet={mapStyle !== style} onPress={() => { setMapStyle(style); setFailed({}); }} />)}{screenWidth < 700 && <Button title="Places" quiet onPress={() => setShowPlaces(v => !v)} />}</View>{screenWidth >= 700 && <Text style={styles.small}>Explore on streets and paths</Text>}</View>
    {(screenWidth >= 700 || showPlaces) && <View style={[styles.row, { paddingHorizontal: 14, paddingBottom: 10, gap: 8 }]}><Button title="Haukkala" style={{ paddingHorizontal: 8 }} quiet onPress={() => setCamera({ mode: 'pan', center: relicPoint(LANDMARKS[0]), scale: .24, focusKey })} /><Button title="Sippulanniemi" style={{ paddingHorizontal: 8 }} quiet onPress={() => setCamera({ mode: 'pan', center: relicPoint(LANDMARKS[2]), scale: .24, focusKey })} />{screenWidth >= 700 && <Button title={showGrid ? 'Grid on' : 'Grid off'} quiet onPress={() => setShowGrid(v => !v)} />}</View>}
    </>}
    <View style={{ height, backgroundColor: '#E6EDDD', overflow: 'hidden' }}>
      <MapSurface onWidth={setWidth} onPan={onPan} onZoom={onZoom}>
        <Svg width="100%" height={height} viewBox={box}>
          <Rect x={center.x - halfW} y={-center.y - halfH} width={width / scale} height={height / scale} fill="#E8EEDC" />
          {(['park', 'forest', 'water', 'building'] as const).map(k => <Path key={k} d={layers[k]} fill={{ park: '#D3E2B7', forest: '#B6D19C', water: '#A8D1E5', building: '#CCCEBF' }[k]} fillRule="evenodd" />)}
          <Path d={layers.major} stroke="#E6C17B" strokeWidth={6 / scale} fill="none" /><Path d={layers.street} stroke="#FFFFF7" strokeWidth={3 / scale} fill="none" />
          <Path d={layers.path} stroke="#94764B" strokeWidth={1.2 / scale} strokeDasharray={`${4 / scale},${3 / scale}`} fill="none" />
          {(online || detail === 'region' ? [] : data.labels).filter(l => l.p[0] >= center.x - halfW && l.p[0] <= center.x + halfW && l.p[1] >= center.y - halfH && l.p[1] <= center.y + halfH).map(l => <SvgText key={l.name} x={l.p[0]} y={-l.p[1]} fontSize={12 / scale} fill="#506348" textAnchor="middle">{l.name}</SvgText>)}
        </Svg>
        <MapColors terrain={online === 'outdoor'}><View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>{raster.map(tile => <Image key={tile.key} accessible={false} source={Platform.OS === 'web' ? { uri: tile.url } : { uri: tile.url, headers: { 'User-Agent': identify } }} resizeMode="stretch" onError={() => { if (online) setFailed(v => v[online] ? v : { ...v, [online]: true }); }} style={{ position: 'absolute', left: (tile.west - center.x) * scale + width / 2, top: (center.y - tile.north) * scale + height / 2, width: tile.width * scale + .5, height: tile.height * scale + .5 }} />)}</View></MapColors>
        <Svg pointerEvents="none" width="100%" height={height} viewBox={box} style={{ position: 'absolute', inset: 0 }}>
          <Defs><ClipPath id="municipal-grid"><Path d={boundaryPath} fillRule="evenodd" /></ClipPath></Defs>
          <Group clipPath="url(#municipal-grid)">{explored.areas.map(a => <Rect key={a.x + ',' + a.y} x={a.x} y={-a.y - a.size} width={a.size} height={a.size} fill={a.mine && a.others ? '#218A8750' : a.mine ? '#59843B50' : '#8662B550'} stroke={a.mine && a.others ? '#176D6A' : a.mine ? '#355E27' : '#69428D'} strokeWidth={1 / scale} />)}</Group>
          {grid && <Group clipPath="url(#municipal-grid)"><Path d={grid} stroke="#FFFFFF70" strokeWidth={1.8 / scale} fill="none" /><Path d={grid} stroke="#456C5B55" strokeWidth={.65 / scale} fill="none" /></Group>}
          <Path d={boundaryPath} fill="#2D624A0A" stroke="#4E7354" strokeWidth={1.5 / scale} strokeDasharray={`${7 / scale},${5 / scale}`} fillRule="evenodd" />
          {trail && <><Path d={trail} stroke="#FFFFEE" strokeWidth={5 / scale} fill="none" /><Path d={trail} stroke="#B9703B" strokeWidth={2.5 / scale} fill="none" /></>}
          {game.lastCell && gameTiles.map(([i, j]) => {
            const id = G.key(i, j), relic = game.revealed[id]?.landmarkId ? null : game.revealed[id], here = i === current.i && j === current.j, x = (i + .5) * 250, y = -(j + .5) * 250;
            const radius = (relic?.rarity === 'Legendary' ? 12 : relic?.rarity === 'Rare' ? 8 : 5) / scale, color = relic?.rarity === 'Legendary' ? '#A97C18' : relic?.rarity === 'Rare' ? '#377F8C' : '#B78A4F';
            return <Group key={id}><Rect x={i * 250} y={-(j + 1) * 250} width={250} height={250} fill="transparent" stroke={here ? '#244E36' : 'transparent'} strokeWidth={2.5 / scale} />{relic && (found.has(id) ? <SvgText x={x} y={y} fontSize={14 / scale} fill={colors.green} textAnchor="middle">✓</SvgText> : <Group>{relic.rarity !== 'Common' && <Circle cx={x} cy={y} r={radius + 4 / scale} fill="none" stroke={color} strokeWidth={1.5 / scale} />}<Path d={`M${x},${y - radius}L${x + radius},${y}L${x},${y + radius}L${x - radius},${y}Z`} fill={color} stroke="#FFFAE9" strokeWidth={2 / scale} /></Group>)}</Group>;
          })}
          {LANDMARKS.filter(r => { const p = relicPoint(r); return p.x >= center.x - halfW && p.x <= center.x + halfW && p.y >= center.y - halfH && p.y <= center.y + halfH; }).map(r => { const p = relicPoint(r), radius = (r.rarity === 'Legendary' ? 11 : 8) / scale, claimed = found.has(r.id); return <Group key={r.id}><Circle cx={p.x} cy={-p.y} r={radius + 3 / scale} fill="#FFFCF2" stroke={claimed ? '#3B7962' : '#A7731B'} strokeWidth={2 / scale} /><Path d={`M${p.x},${-p.y-radius}l${radius},${radius}l${-radius},${radius}l${-radius},${-radius}Z`} fill={claimed ? '#3B7962' : r.rarity === 'Legendary' ? '#DEA533' : '#58AABA'} />{scale >= .16 && <SvgText x={p.x} y={-p.y + 26 / scale} fontSize={10 / scale} fill="#183D35" stroke="#FFFFF8" strokeWidth={.4 / scale} textAnchor="middle">{r.landmark}</SvgText>}</Group>; })}
          {player && <Circle cx={player.x} cy={-player.y} r={player.accuracy} fill={player.precise ? '#3388DD20' : '#D89E3820'} stroke={player.precise ? '#3388DD88' : '#BE8D4588'} strokeWidth={1 / scale} />}
          {target && <Group><Circle cx={target.x} cy={-target.y} r={12 / scale} fill={player ? '#3D8DD32A' : '#3D6D442A'} /><Circle cx={target.x} cy={-target.y} r={6 / scale} fill={player ? player.precise ? '#277DC2' : '#BF8F37' : colors.green} stroke="white" strokeWidth={3 / scale} /></Group>}
          <Path d={`M${center.x - halfW + 16 / scale},${-center.y + halfH - 24 / scale}h${scaleMeters}`} stroke="#374D35" strokeWidth={2 / scale} /><SvgText x={center.x - halfW + 16 / scale} y={-center.y + halfH - 32 / scale} fontSize={10 / scale} fill="#374D35">{scaleMeters >= 1000 ? `${scaleMeters / 1000} km` : `${scaleMeters} m`}</SvgText>
        </Svg>
      </MapSurface>
      {fullScreen ? <View style={{ position: 'absolute', right: 10, top: 12, gap: 6 }}><Button title="Street" quiet={mapStyle !== 'street'} onPress={() => { setMapStyle('street'); setFailed({}); }} /><Button title="Terrain" quiet={mapStyle !== 'outdoor'} onPress={() => { setMapStyle('outdoor'); setFailed({}); }} /><Button title="Me" quiet onPress={() => player ? setCamera({ mode: 'player', center: player, scale: Math.max(.25, scale), focusKey }) : onLocate()} /></View> : <>      <View style={{ position: 'absolute', right: 12, top: 12, gap: 6 }}><Button title="+" quiet onPress={() => zoom(1.6)} /><Button title="−" quiet onPress={() => zoom(1 / 1.6)} />{target && <Button title="◎ Me" quiet onPress={() => setCamera({ mode: 'player', center: target, scale: Math.max(.25, scale), focusKey })} />}</View>
</>}
      {!fullScreen && <View pointerEvents="none" style={{ position: 'absolute', left: 12, top: 12, backgroundColor: '#FFFFF0EA', padding: 8, borderRadius: 5 }}><Text style={{ fontSize: 10, letterSpacing: 1, color: '#41593D' }}>NORTH ↑  /  {mode === 'area' ? 'WHOLE CITY' : 'TRAIL VIEW'}</Text></View>}
    </View>
    {!fullScreen && <>
    <View style={[styles.row, { paddingHorizontal: 10, paddingTop: 10 }]}><Text style={{ color: '#A3D688', fontSize: 11 }}>■ Your visits</Text><Text style={{ color: '#C2A1ED', fontSize: 11 }}>■ Other local players</Text><Text style={{ color: '#7CDDD3', fontSize: 11 }}>■ Both</Text><Text style={styles.small}>{explored.size === 250 ? '250 m tiles' : (explored.size / 1000) + ' km visit areas'} · {detail === 'region' ? 'Regional overview' : detail === 'district' ? 'District detail' : 'Street & trail detail'}</Text></View>
    <View style={[styles.spread, { padding: 10 }]}><Text style={styles.small}>250 m grid · drag to pan · scroll / pinch to zoom</Text><Text accessibilityRole="link" onPress={() => { void Linking.openURL(provider ? provider.copyright : 'https://www.openstreetmap.org/copyright'); }} style={{ color: colors.muted, fontSize: 9 }}>{provider ? provider.attribution : '© OpenStreetMap contributors · ODbL'}</Text></View>
    </>}
    {fullScreen && <Text accessibilityRole="link" onPress={() => { void Linking.openURL(provider ? provider.copyright : 'https://www.openstreetmap.org/copyright'); }} style={{ position: 'absolute', bottom: 54, right: 4, color: '#23423C', backgroundColor: '#FFFFF5E8', fontSize: 9, padding: 3 }}>{provider ? provider.attribution : '© OpenStreetMap contributors'}</Text>}
  </View>;
}
