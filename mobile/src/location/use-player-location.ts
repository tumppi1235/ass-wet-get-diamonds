import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { watchPlayerLocation, type LocationSubscription } from './client';
import { PositionTracker, type PlayerPosition, type TrackedFix } from './tracker';
export function usePlayerLocation(onGameFix: (fix: TrackedFix) => void) {
  const [position, setPosition] = useState<PlayerPosition | null>(null), [tracking, setTracking] = useState(false), [locating, setLocating] = useState(false), [message, setMessage] = useState('Find your location to centre the map on you.'), [fresh, setFresh] = useState(0), [focusRequest, setFocusRequest] = useState(0);
  const subscription = useRef<LocationSubscription | null>(null), generation = useRef(0);
  const stop = useCallback(() => { generation.current++; subscription.current?.remove(); subscription.current = null; setTracking(false); setLocating(false); setFresh(0); setMessage('Location paused. Tap Me to locate yourself again.'); }, []);
  const start = useCallback(async () => {
    stop(); const request = ++generation.current, tracker = new PositionTracker(); let focused = false;
    setPosition(null); setLocating(true); setTracking(true); setMessage('Allow location in your browser or device prompt. Finding your position…');
    try {
      const watcher = await watchPlayerLocation(fix => {
        if (request !== generation.current) return;
        const result = tracker.accept(fix); if (!result) return;
        setPosition(result.position); setLocating(false);
        if (!focused) { setFocusRequest(v => v + 1); focused = true; }
        const accuracy = Math.round(result.position.accuracy);
        if (result.eligible) { setFresh(result.position.timestamp); onGameFix(result); setMessage(`Location detected · accuracy ±${accuracy} m · following you`); }
        else {
          setFresh(0);
          setMessage(result.reason === 'outside' ? `Location detected · ±${accuracy} m · outside Jyväskylä. Your position is shown; exploration starts inside the city boundary.` : result.reason === 'approximate' ? `Approximate location · ±${accuracy} m. Your position is shown; an accuracy of 25 m or better enables collection and distance.` : result.reason === 'speed' ? 'Your position is shown. Walking-speed fixes are needed for game progress.' : 'Your position is shown. Waiting for a steady location after a GPS jump.');
        }
      }, error => {
        if (request !== generation.current) return;
        setLocating(false); setFresh(0); if (error.denied) stop(); setMessage(error.message);
      });
      if (request !== generation.current) watcher.remove(); else subscription.current = watcher;
    } catch (e) { if (request === generation.current) { stop(); setMessage((e as Error).message); } }
  }, [onGameFix, stop]);
  useEffect(() => {
    const requestGeneration = generation, locationSubscription = subscription;
    const listener = AppState.addEventListener('change', value => { if (value === 'background') stop(); });
    return () => { listener.remove(); requestGeneration.current++; locationSubscription.current?.remove(); };
  }, [stop]);
  return { position, tracking, locating, message, fresh, focusRequest, start, stop };
}
