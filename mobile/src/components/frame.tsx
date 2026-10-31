import React from 'react';
import { Link, usePathname, router } from 'expo-router';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSession } from '../accounts/session';
import { useGame } from '../game/state';
import { Button, colors, pixelFont, styles } from './ui';
import { FeltBackground } from './felt-background';
import { PixelIcon } from './pixel-icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {GAME_REGION} from '../map/region';
export function Frame({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  const insets = useSafeAreaInsets(), compact = useWindowDimensions().width < 700;
  const { session, logout } = useSession(), { game, flush, error } = useGame(), path = usePathname();
  const links = [{ href: '/' as const, title: 'Explore' }, { href: '/relics' as const, title: 'Relics' }, { href: '/collection' as const, title: 'Collection' }, { href: '/garmin' as const, title: 'Garmin' }, { href: '/profile' as const, title: 'Profile' }, ...(session?.user.role === 'admin' ? [{ href: '/admin' as const, title: 'Admin' }] : [])];
  return <View style={styles.page}><FeltBackground /><ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: footer ? 112 : 0 }}>
    <View style={{ borderBottomColor: '#B89451', borderBottomWidth: 3, paddingHorizontal: compact ? 12 : 24, paddingVertical: compact ? 8 : 16, backgroundColor: '#142A2B' }}>
      <View style={[styles.spread, { maxWidth: 1392, width: '100%', alignSelf: 'center', gap: 18 }]}>
        <View style={[styles.row, { gap: 10 }]}><View style={{ borderColor: '#9F834E', borderWidth: 2, padding: 3, backgroundColor: '#273E34' }}><PixelIcon name="compass" size={compact ? 28 : 40} /></View><View><Text style={{ color: colors.ink, fontFamily: pixelFont, fontSize: compact ? 22 : 27, letterSpacing: 1 }}>TRAIL RELICS</Text>{!compact && <Text style={{ color: colors.gold, fontFamily: pixelFont, fontSize: 11, letterSpacing: 2 }}>WALK. DISCOVER. COLLECT.</Text>}</View></View>
        <View style={[styles.row, { gap: compact ? 2 : 5, width: compact ? '100%' : undefined }]}>{links.map(l => <Link key={l.href} href={l.href} onPress={() => { void flush().catch(() => {}); }} style={{ color: path === l.href ? '#FFF1C7' : colors.muted, fontFamily: pixelFont, fontSize: compact ? 14 : 17, textTransform: 'uppercase', paddingHorizontal: compact ? 7 : 12, paddingVertical: compact ? 7 : 10, borderWidth: 1, borderColor: path === l.href ? '#B69B60' : 'transparent', borderRadius: 2, backgroundColor: path === l.href ? '#66433B' : 'transparent' }}>{l.title}</Link>)}</View>
        <View style={[styles.row, { gap: 12, position: compact ? 'absolute' : 'relative', right: compact ? 0 : undefined, top: compact ? 0 : undefined }]}>{!compact && <><View accessibilityLabel={'Gold balance: ' + (game?.gold || 0)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderColor: '#8B7448', borderWidth: 2, backgroundColor: '#302F28', paddingHorizontal: 12, paddingVertical: 6 }}><PixelIcon name="coin" size={28} /><Text style={{ color: '#F3D081', fontFamily: pixelFont, fontSize: 25 }}>{game?.gold || 0}</Text></View><View><Text style={{ color: colors.ink, fontFamily: pixelFont, fontSize: 17 }}>{session?.user.displayName}</Text><Text style={styles.small}>LOCAL PLAYER</Text></View></>}<Button title="Sign out" quiet onPress={() => { void flush().then(logout).then(() => router.replace('/login')); }} /></View>
      </View>
    </View>
    <View style={[styles.shell, compact && { padding: 12, gap: 12 }]}>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}{children}<View style={[styles.spread, { borderTopWidth: 1, borderTopColor: '#59644D', paddingTop: 20, marginTop: 12 }]}><Text style={[styles.small, { fontFamily: pixelFont, color: colors.gold }]}>YOUR NEXT ADVENTURE IS A WALK AWAY.</Text><Text style={styles.small}>{GAME_REGION} · Saved locally · {session?.user.username}</Text></View></View>
  </ScrollView>{footer && <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#142A2B', borderTopColor: colors.gold, borderTopWidth: 2, paddingTop: 10, paddingHorizontal: 14, paddingBottom: Math.max(10, insets.bottom) }}>{footer}</View>}</View>;
}
