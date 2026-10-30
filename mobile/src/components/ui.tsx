import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
export const colors = { paper: '#102726', ink: '#F4E9CD', muted: '#BAC5AC', green: '#8DC8A0', line: '#6F7654', white: '#1A3431', gold: '#E9BE65', pale: '#29463E' };
export const pixelFont = 'Pixelify';
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper }, shell: { width: '100%', maxWidth: 1440, alignSelf: 'center', padding: 24, paddingBottom: 42, gap: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }, spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' },
  title: { color: colors.ink, fontFamily: pixelFont, fontSize: 39, letterSpacing: .5, textShadowColor: '#060E12', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 }, heading: { color: colors.ink, fontFamily: pixelFont, fontSize: 25, letterSpacing: .3 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 23 }, eyebrow: { color: colors.gold, fontFamily: pixelFont, fontSize: 13, letterSpacing: 1.8 },
  panel: { backgroundColor: colors.white, borderColor: colors.line, borderWidth: 2, borderBottomWidth: 5, borderRadius: 3, padding: 22, gap: 16 },
  label: { color: colors.ink, fontFamily: pixelFont, fontSize: 16, marginBottom: 8 }, input: { color: colors.ink, borderColor: '#778066', borderWidth: 2, borderRadius: 2, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#102522', fontSize: 15 },
  error: { color: '#FFE0CE', backgroundColor: '#592E32', borderWidth: 1, borderColor: '#AA6760', borderRadius: 2, padding: 12, fontSize: 13, lineHeight: 20 },
  badge: { fontFamily: pixelFont, fontSize: 12, letterSpacing: 1, color: colors.gold, backgroundColor: '#292F2D', borderWidth: 1, borderColor: '#716247', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 2 },
  divider: { height: 1, backgroundColor: colors.line }, small: { color: colors.muted, fontSize: 11, lineHeight: 18 },
});
export function Button({ title, onPress, quiet = false, disabled = false, busy = false, style }: { title: string; onPress(): void; quiet?: boolean; disabled?: boolean; busy?: boolean; style?: ViewStyle }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [{ paddingVertical: 10, paddingHorizontal: 15, borderRadius: 3, borderWidth: 2, borderTopColor: quiet ? '#75826A' : '#D3AE72', borderLeftColor: quiet ? '#75826A' : '#D3AE72', borderRightColor: '#101D1E', borderBottomColor: '#101D1E', borderBottomWidth: pressed ? 2 : 5, backgroundColor: quiet ? colors.pale : '#914B40', opacity: disabled || busy ? .5 : 1, transform: [{ translateY: pressed ? 2 : 0 }], alignItems: 'center', justifyContent: 'center', minHeight: 44, flexDirection: 'row', gap: 8 }, style]}>{busy && <ActivityIndicator size="small" color={colors.gold} />}<Text style={{ color: quiet ? colors.ink : '#FFF1CF', fontFamily: pixelFont, fontSize: 17, textAlign: 'center' }}>{title}</Text></Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) { return <View><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} autoCapitalize="none" autoCorrect={false} {...props} style={[styles.input, props.style]} /></View>; }
export function Loading({ message = 'Opening your field journal…' }: { message?: string }) { return <View style={{ flex: 1, minHeight: 280, justifyContent: 'center', alignItems: 'center', gap: 18, backgroundColor: colors.paper }}><ActivityIndicator color={colors.green} /><Text style={styles.body}>{message}</Text></View>; }
