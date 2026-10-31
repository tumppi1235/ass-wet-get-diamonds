import React from 'react';
import { Link, Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { useSession } from '../accounts/session';
import { useGame } from '../game/state';
import { availableRelics, relicPoint } from '../game/landmarks';
import { Frame } from '../components/frame';
import { Loading, styles, colors, pixelFont } from '../components/ui';
import { PixelIcon } from '../components/pixel-icon';
export default function Relics() {
  const { session, loading } = useSession(), { game } = useGame();
  if (loading) return <Loading />; if (!session) return <Redirect href="/login" />; if (!game) return <Loading />;
  const relics = availableRelics(game, game).filter(r => r.landmarkId);
  return <Frame><Text style={styles.eyebrow}>LANDMARK RELICS</Text><Text style={styles.title}>Choose your next discovery.</Text><Text style={styles.body}>Distances use your last saved position. Landmark relics can be collected within 70 m on an active quest with accurate GPS.</Text><Link href="/" style={{ color: colors.gold, fontFamily: pixelFont, fontSize: 21 }}>← Back to map</Link>{relics.map(r => <View key={r.id} style={[styles.panel, styles.spread]}><PixelIcon name={r.name === 'Crown' ? 'crown' : r.name === 'Compass' ? 'compass' : 'gem'} size={r.rarity === 'Legendary' ? 64 : 48} tone={r.rarity === 'Rare' ? 'blue' : 'gold'} /><View style={{ flex: 1, minWidth: 150, gap: 6 }}><Text style={styles.heading}>{r.landmark}</Text><Text style={styles.body}>{r.rarity} {r.name} · {(Math.hypot(relicPoint(r).x - game.x, relicPoint(r).y - game.y) / 1000).toFixed(1)} km</Text><Link href={{ pathname: '/', params: { target: r.id } }} style={{ color: colors.gold, fontFamily: pixelFont, fontSize: 20 }}>Navigate to relic →</Link></View></View>)}{!relics.length && <Text style={styles.body}>All landmark relics for this quest have been collected or attempted. Start a new quest to renew attempts.</Text>}</Frame>;
}
