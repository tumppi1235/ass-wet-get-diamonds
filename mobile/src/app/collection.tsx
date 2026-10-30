import React from 'react';
import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { useSession } from '../accounts/session';
import { useGame } from '../game/state';
import { Frame } from '../components/frame';
import { PixelIcon } from '../components/pixel-icon';
import { colors, Loading, styles } from '../components/ui';
export default function Collection() {
  const { session, loading } = useSession(), { game } = useGame();
  if (loading) return <Loading />; if (!session) return <Redirect href="/login" />; if (!game) return <Loading />;
  return <Frame><Text style={styles.eyebrow}>SOUVENIRS FROM THE UNKNOWN</Text><View style={styles.spread}><Text style={styles.title}>Your field collection.</Text><Text style={styles.badge}>{game.collection.length} ARTEFACTS</Text></View><Text style={styles.body}>The discoveries saved to {session.user.displayName}&apos;s field journal.</Text>{!game.collection.length ? <View style={[styles.panel, { padding: 45, alignItems: 'center' }]}><Text style={{ color: colors.gold, fontSize: 45 }}>◇</Text><Text style={styles.heading}>Your first story is still out there.</Text><Text style={styles.body}>Enter an artefact tile and tap Collect once.</Text></View> : <View style={[styles.row, { alignItems: 'stretch', gap: 16 }]}>{game.collection.slice().reverse().map(r => <View key={r.id} style={[styles.panel, { minWidth: 195, flexGrow: 1, maxWidth: 280, alignItems: 'center', justifyContent: 'center', backgroundColor: r.rarity === 'Legendary' ? '#433B28' : r.rarity === 'Rare' ? '#22474A' : colors.white, borderColor: r.rarity === 'Legendary' ? '#C49E44' : colors.line }]}><PixelIcon name={r.name === 'Crown' ? 'crown' : r.name === 'Key' ? 'key' : r.name === 'Compass' ? 'compass' : 'gem'} size={r.rarity === 'Legendary' ? 112 : r.rarity === 'Rare' ? 88 : 64} tone={r.rarity === 'Rare' ? 'blue' : 'gold'} /><Text style={[styles.heading, { fontSize: 17 }]}>{r.form} {r.name}</Text><Text style={styles.eyebrow}>{r.rarity.toUpperCase()}</Text><Text style={styles.small}>TILE {r.id}</Text></View>)}</View>}</Frame>;
}
