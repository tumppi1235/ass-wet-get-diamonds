import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { accounts } from './service';
import type { User } from './local-accounts';
type Session = { user: User; token: string; expiresAt: number };
type Value = { session: Session | null; loading: boolean; error: string; login(username: string, password: string): Promise<void>; logout(): Promise<void>; refresh(): Promise<void> };
const Context = createContext<Value | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const refresh = useCallback(async () => { setSession(await accounts.current()); }, []);
  useEffect(() => { accounts.bootstrap().then(refresh).catch(e => setError(e.message)).finally(() => setLoading(false)); }, [refresh]);
  // An open game must return to sign-in when its local session expires too.
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => { void refresh().catch(e => { setError(e.message); setSession(null); }); }, Math.max(0, session.expiresAt - Date.now() + 20));
    return () => clearTimeout(timer);
  }, [session, refresh]);
  return <Context.Provider value={{ session, loading, error, refresh, login: async (u, p) => { setSession(await accounts.login(u, p)); }, logout: async () => { await accounts.logout(); setSession(null); } }}>{children}</Context.Provider>;
}
export function useSession() { const value = useContext(Context); if (!value) throw new Error('Session provider is missing.'); return value; }
