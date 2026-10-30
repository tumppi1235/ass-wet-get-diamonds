import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { accounts } from '../accounts/service';
import { useSession } from '../accounts/session';
import G from './engine';
import { restoreResources } from './resources';
import type { GameState } from './types';
type Value = { game: GameState | null; communityVisits: Record<string, number>; error: string; change(fn: (state: GameState) => void): void; flush(): Promise<void> };
const Context = createContext<Value | null>(null);
export function GameProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  return <ScopedGameProvider key={session?.token || 'signed-out'} session={session}>{children}</ScopedGameProvider>;
}
function ScopedGameProvider({ session, children }: { session: ReturnType<typeof useSession>['session']; children: React.ReactNode }) {
  const [game, setGame] = useState<GameState | null>(null), [communityVisits, setCommunityVisits] = useState<Record<string, number>>({}), [error, setError] = useState('');
  const current = useRef<GameState | null>(null), owner = useRef(session), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(async () => { if (timer.current) clearTimeout(timer.current); const active = owner.current, state = current.current; if (!active || !state) return; try { await accounts.saveProgress(active.token, active.user.id, state); setError(''); } catch (e) { setError((e as Error).message); throw e; } }, []);
  useEffect(() => { let cancelled = false; if (session) Promise.all([accounts.progress<GameState>(session.token, session.user.id), accounts.communityVisits(session.token)]).then(([saved, visits]) => { if (cancelled) return; const state = restoreResources(saved || G.initial()); current.current = state; setGame(state); setCommunityVisits(visits); }).catch(e => { if (!cancelled) setError(e.message); }); return () => { cancelled = true; if (timer.current) clearTimeout(timer.current); }; }, [session]);
  useEffect(() => { const interval = setInterval(() => { void flush().catch(() => {}); }, 3000); return () => clearInterval(interval); }, [flush]);
  const change = useCallback((fn: (state: GameState) => void) => { if (!current.current) return; const next: GameState = JSON.parse(JSON.stringify(current.current)); fn(next); current.current = next; setGame(next); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => { void flush().catch(() => {}); }, 350); }, [flush]);
  return <Context.Provider value={{ game, communityVisits, error, change, flush }}>{children}</Context.Provider>;
}
export function useGame() { const value = useContext(Context); if (!value) throw new Error('Game provider is missing.'); return value; }
