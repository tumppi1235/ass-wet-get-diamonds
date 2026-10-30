import React, { useCallback, useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { useSession } from '../accounts/session';
import { accounts } from '../accounts/service';
import { Frame } from '../components/frame';
import { Button, Field, Loading, styles } from '../components/ui';
type Row = Awaited<ReturnType<typeof accounts.listUsers>>[number];
export default function Admin() {
  const { session, loading } = useSession(), [rows, setRows] = useState<Row[]>([]), [username, setUsername] = useState(''), [name, setName] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const refresh = useCallback(async () => { if (session?.user.role === 'admin') setRows(await accounts.listUsers(session.token)); }, [session]);
  useEffect(() => { if (session?.user.role === 'admin') accounts.listUsers(session.token).then(setRows).catch(e => setError(e.message)); }, [session]);
  async function create() { setError(''); setNotice(''); setBusy(true); try { await accounts.createProfile(username, name, password); await refresh(); setUsername(''); setName(''); setPassword(''); setNotice('Player created. Their saved game starts separately from yours.'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (session.user.role !== 'admin') return <Frame><Text style={styles.title}>Explorer access</Text><Text style={styles.body}>User management is available to the administrator. Your game and collection are available in Explore.</Text></Frame>;
  return <Frame><Text style={styles.eyebrow}>LOCAL ADMINISTRATION</Text><View style={styles.spread}><View><Text style={styles.title}>A place for every explorer.</Text><Text style={styles.body}>Manage the player profiles saved on this device.</Text></View><Text style={styles.badge}>{rows.length} PROFILES</Text></View>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}<View style={styles.panel}><Text style={styles.heading}>Player profiles</Text>{rows.map(user => <View key={user.id} style={[styles.spread, { borderTopWidth: 1, borderTopColor: '#6F7654', paddingTop: 18, paddingBottom: 6 }]}><View style={{ flex: 1, minWidth: 180, gap: 4 }}><Text style={{ color: '#F4E9CD', fontSize: 16, fontWeight: '600' }}>{user.displayName}</Text><Text style={styles.small}>@{user.username}</Text></View><Text style={styles.badge}>{user.role === 'admin' ? 'ADMINISTRATOR' : 'EXPLORER'}</Text><Text style={styles.body}>{user.finds} finds · {(user.distance / 1000).toFixed(2)} km</Text></View>)}</View><View style={[styles.panel, { maxWidth: 560 }]}><Text style={styles.heading}>Create a test player</Text><Text style={styles.body}>New profiles receive explorer access and a separate, empty field journal.</Text><Field label="New display name" value={name} onChangeText={setName} maxLength={40} /><Field label="New username" value={username} onChangeText={setUsername} maxLength={24} /><Field label="New password" value={password} onChangeText={setPassword} secureTextEntry maxLength={128} />{notice ? <Text accessibilityRole="text" style={styles.body}>{notice}</Text> : null}<Button title="Create player" onPress={() => { void create(); }} busy={busy} disabled={!name || !username || !password} /></View></Frame>;
}
