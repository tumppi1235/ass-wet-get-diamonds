import React from 'react';
import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { useSession } from '../accounts/session';
import { Frame } from '../components/frame';
import { colors, Loading, styles } from '../components/ui';
export default function Garmin() {
  const { session, loading } = useSession(); if (loading) return <Loading />; if (!session) return <Redirect href="/login" />;
  return <Frame><Text style={styles.eyebrow}>A COMPANION FOR THE TRAIL</Text><Text style={styles.title}>The game here. The next turn there.</Text><Text style={styles.body}>Your app holds the world, your player profile and your collection. Garmin is the compact collector and navigation device.</Text><View style={[styles.row, { alignItems: 'stretch', gap: 22 }]}><View style={[styles.panel, { flex: 1, minWidth: 260 }]}><Text style={{ color: colors.green, fontSize: 45 }}>✥</Text><Text style={styles.heading}>Main game app</Text><Text style={styles.body}>Full street map, player profiles, exploration history, artefact collection and outing progress.</Text><Text style={styles.badge}>ACTIVE ON THIS DEVICE</Text></View><View style={[styles.panel, { flex: 1, minWidth: 260 }]}><Text style={{ color: colors.green, fontSize: 45 }}>↑</Text><Text style={styles.heading}>Garmin Enduro 3</Text><Text style={styles.body}>Next-artefact direction, a small nearby grid, and one-action collection on your wrist.</Text><Text style={styles.badge}>COMPANION INTEGRATION PENDING</Text></View></View><View style={styles.panel}><Text style={styles.heading}>Phone pairing comes next.</Text><Text style={styles.body}>The current watch prototype still saves progress independently. Bluetooth messaging through Garmin Connect has not been connected to these new profiles yet. The app does not claim a watch is paired or sync captures until that integration is implemented and tested.</Text></View></Frame>;
}
