import type { GameState } from './types';
export const METRES_PER_GOLD = 250;
export const GOLD_PER_NEW_TILE = 1;
export function restoreResources(state: GameState): GameState {
  // Old saves start at zero; opening an old outing never grants retroactive gold.
  return { ...state, gold: Number.isSafeInteger(state.gold) && state.gold >= 0 ? state.gold : 0, goldMetres: Number.isFinite(state.goldMetres) && state.goldMetres >= 0 && state.goldMetres < METRES_PER_GOLD ? state.goldMetres : 0 };
}
export function creditWalkingGold(state: GameState, metres: number) {
  if (!Number.isFinite(metres) || metres <= 0) return;
  const progress = state.goldMetres + metres, earned = Math.floor((progress + 1e-8) / METRES_PER_GOLD);
  state.gold += earned; state.goldMetres = Math.max(0, progress - earned * METRES_PER_GOLD);
}
