import places from '../../assets/landmarks.json';
import type { Engine, GameState, Relic } from './types';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Shared prototype engine is a CommonJS module.
const rules: Engine = require('../../../public/engine.js');
export const LANDMARKS = places as Relic[];
export const relicPoint = (r: Relic) => r.latitude != null && r.longitude != null ? rules.xy(r.latitude, r.longitude) : { x: (r.i + .5) * 250, y: (r.j + .5) * 250 };
export function seedLandmarks(s: GameState) { for (const r of LANDMARKS) if (!s.collection.some(a => a.id === r.id)) s.revealed[r.id] = { ...r }; return s; }
export function availableRelics(s: GameState, p: { x: number; y: number }) {
  return Object.values(s.revealed).filter((r): r is Relic => !!r && !s.searched[r.id] && !s.collection.some(a => a.id === r.id)).sort((a, b) => Math.hypot(relicPoint(a).x - p.x, relicPoint(a).y - p.y) - Math.hypot(relicPoint(b).x - p.x, relicPoint(b).y - p.y));
}
export function captureTarget(s: GameState, p: { x: number; y: number }) {
  const c=rules.cell(p.x,p.y);
  return availableRelics(s, p).find(r => r.i===c.i&&r.j===c.j);
}
export function captureAt(s: GameState, p: { x: number; y: number }, eligible: boolean, rng = Math.random) {
  const target = eligible && captureTarget(s, p); if (!target) return { status: 'unavailable' };
  const previous = s.lastCell; s.lastCell = target.id;
  try { return rules.search(s, rng); } finally { s.lastCell = previous; }
}
export function beginQuest(s: GameState) { if (s.questStartedAt) s.outing++; s.questStartedAt = Date.now(); s.meters = 0; s.energy = 0; s.elapsed = 0; s.searched = {}; }
