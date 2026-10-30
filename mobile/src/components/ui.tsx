import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
export const colors = { paper: '#F4F2EA', ink: '#263C31', muted: '#7B8275', green: '#2D5540', line: '#DADDCF', white: '#FCFCF6', gold: '#B88040', pale: '#E7EBD8' };
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper }, shell: { width: '100%', maxWidth: 1440, alignSelf: 'center', padding: 28, gap: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }, spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' },
  title: { color: colors.ink, fontSize: 36, fontWeight: '600', letterSpacing: -1.4 }, heading: { color: colors.ink, fontSize: 22, fontWeight: '600', letterSpacing: -.5 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 23 }, eyebrow: { color: colors.gold, fontSize: 10, fontWeight: '700', letterSpacing: 2.2 },
  panel: { backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1, borderRadius: 12, padding: 24, gap: 16 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '600', marginBottom: 8 }, input: { color: colors.ink, borderColor: '#C8CFBD', borderWidth: 1, borderRadius: 7, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#FFFFFF', fontSize: 15 },
  error: { color: '#A14835', backgroundColor: '#F8EAE2', borderRadius: 7, padding: 12, fontSize: 13, lineHeight: 20 },
  badge: { fontSize: 10, letterSpacing: 1, color: colors.green, backgroundColor: colors.pale, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 4 },
  divider: { height: 1, backgroundColor: colors.line }, small: { color: colors.muted, fontSize: 11, lineHeight: 18 },
});
export function Button({ title, onPress, quiet = false, disabled = false, busy = false, style }: { title: string; onPress(): void; quiet?: boolean; disabled?: boolean; busy?: boolean; style?: ViewStyle }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [{ paddingVertical: 12, paddingHorizontal: 17, borderRadius: 7, backgroundColor: quiet ? colors.pale : colors.green, opacity: disabled || busy ? .5 : pressed ? .8 : 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, flexDirection: 'row', gap: 8 }, style]}>{busy && <ActivityIndicator size="small" color={quiet ? colors.green : 'white'} />}<Text style={{ color: quiet ? colors.green : '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{title}</Text></Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) { return <View><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} autoCapitalize="none" autoCorrect={false} {...props} style={[styles.input, props.style]} /></View>; }
export function Loading({ message = 'Opening your field journal…' }: { message?: string }) { return <View style={{ flex: 1, minHeight: 280, justifyContent: 'center', alignItems: 'center', gap: 18, backgroundColor: colors.paper }}><ActivityIndicator color={colors.green} /><Text style={styles.body}>{message}</Text></View>; }
