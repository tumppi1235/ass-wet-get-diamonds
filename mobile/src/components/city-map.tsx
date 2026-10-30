import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, PanResponder, Platform, Text, View } from 'react-native';
import Svg, { Circle, G as Group, Path, Rect, Text as SvgText } from 'react-native-svg';
import G from '../game/engine';
import type { GameState } from '../game/types';
import type { PlayerPosition } from '../location/tracker';
import { fitJyvaskyla, JYVASKYLA, visibleGameTiles, type Point } from '../map/region';
import { MAP_PROVIDERS, tilesForView, type MapStyle } from '../map/tiles';
import { Button, colors, styles } from './ui';

type Feature = { k: string; p: number[][]; b: number[]; n?: string; t?: string; holes?: number[][][] };
const data = require('../../assets/city-map.json') as { features: Feature[]; labels: { p: number[]; name: string; type: string }[] };
const line = (points: number[][]) => points.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${-p[1]}`).join('');
const features = data.features.map(f => ({ ...f, d: line(f.p) + (f.k !== 'road' && f.k !== 'rail' ? 'Z' : '') + (f.holes || []).map(h => line(h) + 'Z').join('') }));
const boundaryPath = JYVASKYLA.polygons.map(p => line(p.outer) + 'Z' + p.holes.map(h => line(h) + 'Z').join('')).join('');
const identify = 'TrailRelics/0.4 (+https://github.com/tumppi1235/ass-wet-get-diamonds)';

type Props = { game: GameState; onDiscover(ids: [number, number][]): void; player: PlayerPosition | null; focusKey: string; demo: boolean; locating: boolean; onLocate(): void };
export function CityMap({ game, onDiscover, player, focusKey, demo, locating, onLocate }: Props) {
  const [width, setWidth] = useState(750), [mapStyle, setMapStyle] = useState<MapStyle>('outdoor'), [failed, setFailed] = useState<Record<string, boolean>>({});
  const height = 560, area = useMemo(() => fitJyvaskyla(width, height), [width]);
  const [camera, setCamera] = useState({ mode: 'area' as 'area' | 'player' | 'pan', center: { x: 0, y: 0 }, scale: .31, focusKey });
  const target = player || (demo && game.lastCell ? { x: game.x, y: game.y } : null);
  const requested = !!target && !!focusKey && focusKey !== camera.focusKey;
  const mode = requested ? 'player' : camera.mode;
  const center = mode === 'area' ? area.center : mode === 'player' && target ? target : camera.center;
  const scale = mode === 'area' ? area.scale : requested ? .31 : camera.scale;
  const halfW = width / scale / 2, halfH = height / scale / 2;
  const effective = mapStyle === 'outdoor' && failed.outdoor ? 'street' : mapStyle;
  const online = effective !== 'offline' && !failed[effective] ? effective : null;
  const raster = useMemo(() => online ? tilesForView(center, width, height, scale, online) : [], [online, center, width, scale]);
  const visible = useMemo(() => features.filter(f => f.b[0] < center.x + halfW && f.b[2] > center.x - halfW && f.b[1] < center.y + halfH && f.b[3] > center.y - halfH), [center, halfW, halfH]);
  const layers = useMemo(() => Object.fromEntries(['park', 'forest', 'water', 'building', 'rail', 'major', 'street', 'path'].map(k => [k, visible.filter(f => f.k === k || (f.k === 'road' && (['primary', 'secondary', 'tertiary', 'motorway', 'trunk'].includes(f.t || '') ? 'major' : ['footway', 'path', 'steps', 'cycleway'].includes(f.t || '') ? 'path' : 'street') === k)).map(f => f.d).join('')])), [visible]);
  const gameTiles = useMemo(() => visibleGameTiles(center, width, height, scale, game), [center, width, scale, game]);
  useEffect(() => { if (game.lastCell && gameTiles.length) onDiscover(gameTiles); }, [gameTiles, game.lastCell, onDiscover]);
  const dragStart = useRef<Point>({ x: 0, y: 0 });
  // eslint-disable-next-line react-hooks/refs -- PanResponder only registers these later gesture callbacks.
  const responder = useMemo(() => PanResponder.create({ onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderGrant: () => { dragStart.current = center; setCamera({ mode: 'pan', center, scale, focusKey }); }, onPanResponderMove: (_, gesture) => setCamera({ mode: 'pan', center: { x: dragStart.current.x - gesture.dx / scale, y: dragStart.current.y + gesture.dy / scale }, scale, focusKey }) }), [center, scale, focusKey]);
  const zoom = (factor: number) => setCamera({ mode: mode === 'area' ? 'pan' : mode, center, scale: Math.min(1.2, Math.max(area.scale / 2, scale * factor)), focusKey });
  const found = new Set(game.collection.map(r => r.id)), current = G.cell(game.x, game.y);
  const box = `${center.x - halfW} ${-center.y - halfH} ${width / scale} ${height / scale}`;
  const trail = game.path.map((p, i) => `${!i || p.breakBefore ? 'M' : 'L'}${p.x},${-p.y}`).join('');
  const scaleMeters = scale < .025 ? 10000 : scale < .1 ? 1000 : 250;
  const provider = online && MAP_PROVIDERS[online];
  const hint = online === 'outdoor' ? 'Outdoor terrain · contours and trails' : online === 'street' && mapStyle === 'outdoor' ? 'Outdoor service unavailable · street fallback' : online === 'street' ? 'Street map' : 'Offline centre detail · internet needed for wider map';
  return <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.white }}>
    <View style={[styles.spread, { padding: 14 }]}><View><Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>Jyväskylä outdoors</Text><Text style={styles.small}>{hint}</Text></View><View style={styles.row}><Button title="Whole Jyväskylä" quiet onPress={() => setCamera({ mode: 'area', center: area.center, scale: area.scale, focusKey })} /><Button title={locating ? 'Locating…' : 'Find my location'} busy={locating} onPress={onLocate} /></View></View>
    <View style={[styles.spread, { paddingHorizontal: 14, paddingBottom: 12 }]}><View style={styles.row}>{(['outdoor', 'street', 'offline'] as const).map(style => <Button key={style} title={style === 'outdoor' ? '△ Outdoor' : style === 'street' ? 'Street' : 'Offline centre'} quiet={mapStyle !== style} onPress={() => { setMapStyle(style); setFailed({}); }} />)}</View><Text style={styles.small}>City boundary · Korpilahti to Tikkakoski</Text></View>
    <View style={{ height, backgroundColor: '#E6EDDD', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', inset: 0 }} onLayout={e => setWidth(e.nativeEvent.layout.width)} {...responder.panHandlers}>
        <Svg width="100%" height={height} viewBox={box}>
          <Rect x={center.x - halfW} y={-center.y - halfH} width={width / scale} height={height / scale} fill="#E8EEDC" />
          {(['park', 'forest', 'water', 'building'] as const).map(k => <Path key={k} d={layers[k]} fill={{ park: '#D3E2B7', forest: '#B6D19C', water: '#A8D1E5', building: '#CCCEBF' }[k]} fillRule="evenodd" />)}
          <Path d={layers.major} stroke="#E6C17B" strokeWidth={6 / scale} fill="none" /><Path d={layers.street} stroke="#FFFFF7" strokeWidth={3 / scale} fill="none" />
          <Path d={layers.path} stroke="#94764B" strokeWidth={1.2 / scale} strokeDasharray={`${4 / scale},${3 / scale}`} fill="none" />
          {data.labels.filter(l => l.p[0] >= center.x - halfW && l.p[0] <= center.x + halfW && l.p[1] >= center.y - halfH && l.p[1] <= center.y + halfH).map(l => <SvgText key={l.name} x={l.p[0]} y={-l.p[1]} fontSize={12 / scale} fill="#506348" textAnchor="middle">{l.name}</SvgText>)}
        </Svg>
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>{raster.map(tile => <Image key={tile.key} accessible={false} source={Platform.OS === 'web' ? { uri: tile.url } : { uri: tile.url, headers: { 'User-Agent': identify } }} resizeMode="stretch" onError={() => { if (online) setFailed(v => v[online] ? v : { ...v, [online]: true }); }} style={{ position: 'absolute', left: (tile.west - center.x) * scale + width / 2, top: (center.y - tile.north) * scale + height / 2, width: tile.width * scale + .5, height: tile.height * scale + .5 }} />)}</View>
        <Svg pointerEvents="none" width="100%" height={height} viewBox={box} style={{ position: 'absolute', inset: 0 }}>
          <Path d={boundaryPath} fill="#2D624A0A" stroke="#4E7354" strokeWidth={1.5 / scale} strokeDasharray={`${7 / scale},${5 / scale}`} fillRule="evenodd" />
          {trail && <><Path d={trail} stroke="#FFFFEE" strokeWidth={5 / scale} fill="none" /><Path d={trail} stroke="#B9703B" strokeWidth={2.5 / scale} fill="none" /></>}
          {game.lastCell && gameTiles.map(([i, j]) => {
            const id = G.key(i, j), relic = game.revealed[id], here = i === current.i && j === current.j, x = (i + .5) * 250, y = -(j + .5) * 250;
            const radius = (relic?.rarity === 'Legendary' ? 12 : relic?.rarity === 'Rare' ? 8 : 5) / scale, color = relic?.rarity === 'Legendary' ? '#A97C18' : relic?.rarity === 'Rare' ? '#377F8C' : '#B78A4F';
            return <Group key={id}><Rect x={i * 250} y={-(j + 1) * 250} width={250} height={250} fill={game.visits[id] ? '#769C4A22' : 'transparent'} stroke={here ? '#365E3D' : '#46643B40'} strokeWidth={(here ? 2 : .5) / scale} />{relic && (found.has(id) ? <SvgText x={x} y={y} fontSize={14 / scale} fill={colors.green} textAnchor="middle">✓</SvgText> : <Group>{relic.rarity !== 'Common' && <Circle cx={x} cy={y} r={radius + 4 / scale} fill="none" stroke={color} strokeWidth={1.5 / scale} />}<Path d={`M${x},${y - radius}L${x + radius},${y}L${x},${y + radius}L${x - radius},${y}Z`} fill={color} stroke="#FFFAE9" strokeWidth={2 / scale} /></Group>)}</Group>;
          })}
          {player && <Circle cx={player.x} cy={-player.y} r={player.accuracy} fill={player.precise ? '#3388DD20' : '#D89E3820'} stroke={player.precise ? '#3388DD88' : '#BE8D4588'} strokeWidth={1 / scale} />}
          {target && <Group><Circle cx={target.x} cy={-target.y} r={12 / scale} fill={player ? '#3D8DD32A' : '#3D6D442A'} /><Circle cx={target.x} cy={-target.y} r={6 / scale} fill={player ? player.precise ? '#277DC2' : '#BF8F37' : colors.green} stroke="white" strokeWidth={3 / scale} /></Group>}
          <Path d={`M${center.x - halfW + 16 / scale},${-center.y + halfH - 24 / scale}h${scaleMeters}`} stroke="#374D35" strokeWidth={2 / scale} /><SvgText x={center.x - halfW + 16 / scale} y={-center.y + halfH - 32 / scale} fontSize={10 / scale} fill="#374D35">{scaleMeters >= 1000 ? `${scaleMeters / 1000} km` : `${scaleMeters} m`}</SvgText>
        </Svg>
      </View>
      <View style={{ position: 'absolute', right: 12, top: 12, gap: 6 }}><Button title="+" quiet onPress={() => zoom(1.6)} /><Button title="−" quiet onPress={() => zoom(1 / 1.6)} />{target && <Button title="◎ Me" quiet onPress={() => setCamera({ mode: 'player', center: target, scale: Math.max(.25, scale), focusKey })} />}</View>
      <View pointerEvents="none" style={{ position: 'absolute', left: 12, top: 12, backgroundColor: '#FFFFF0EA', padding: 8, borderRadius: 5 }}><Text style={{ fontSize: 10, letterSpacing: 1, color: '#41593D' }}>NORTH ↑  /  {mode === 'area' ? 'WHOLE CITY' : 'TRAIL VIEW'}</Text></View>
      {!gameTiles.length && <View pointerEvents="none" style={{ position: 'absolute', alignSelf: 'center', bottom: 18, backgroundColor: '#FFFFF0EA', padding: 10, borderRadius: 6 }}><Text style={styles.small}>Zoom in for 250 m game tiles</Text></View>}
    </View>
    <View style={[styles.spread, { padding: 10 }]}><Text style={styles.small}>Drag to pan · woodland, water & trails · dashed city boundary</Text><Text accessibilityRole="link" onPress={() => { void Linking.openURL(provider ? provider.copyright : 'https://www.openstreetmap.org/copyright'); }} style={{ color: colors.muted, fontSize: 9 }}>{provider ? provider.attribution : '© OpenStreetMap contributors · ODbL'}</Text></View>
  </View>;
}
