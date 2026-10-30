import React, { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { Text, View } from 'react-native';
import { accounts } from '../accounts/service';
import { useSession } from '../accounts/session';
import { useGame } from '../game/state';
import { Frame } from '../components/frame';
import { Button, Field, Loading, styles } from '../components/ui';
export default function Profile() {
  const { session, loading, refresh } = useSession(), { flush } = useGame(), [name, setName] = useState<string | null>(null), [current, setCurrent] = useState(''), [next, setNext] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  async function saveName() { if (!session) return; setBusy(true); setError(''); try { await flush(); await accounts.updateName(session.token, name ?? session.user.displayName); await refresh(); setNotice('Your display name is saved.'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function password() { if (!session) return; setBusy(true); setError(''); try { await flush(); await accounts.changePassword(session.token, current, next); await refresh(); router.replace('/login'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  if (loading) return <Loading />; if (!session) return <Redirect href="/login" />;
  return <Frame><Text style={styles.eyebrow}>YOUR LOCAL PROFILE</Text><View style={styles.spread}><Text style={styles.title}>A journal of your own.</Text><Text style={styles.badge}>{session.user.role === 'admin' ? 'ADMINISTRATOR' : 'EXPLORER'}</Text></View><Text style={styles.body}>@{session.user.username} · Progress is saved only on this device.</Text>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}<View style={[styles.panel, { maxWidth: 540 }]}><Text style={styles.heading}>Profile details</Text><Field label="Display name" value={name ?? session.user.displayName} onChangeText={setName} maxLength={40} /><Button title="Save profile" onPress={() => { void saveName(); }} busy={busy} />{notice ? <Text style={styles.body}>{notice}</Text> : null}</View><View style={[styles.panel, { maxWidth: 540 }]}><Text style={styles.heading}>Change password</Text><Text style={styles.body}>Changing your password signs you out. Your collection stays saved.</Text><Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" maxLength={128} /><Field label="New password" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" maxLength={128} /><Button title="Update password" onPress={() => { void password(); }} disabled={!current || next.length < 8} busy={busy} /></View></Frame>;
}
