import type { GameState } from '../game/types';
import type { PlayerPosition } from '../location/tracker';
export type CityMapProps = {
  game: GameState; communityVisits: Record<string, number>;
  onDiscover(ids: [number, number][]): void;
  player: PlayerPosition | null; focusKey: string; demo: boolean;
  locating: boolean; onLocate(): void; fullScreen?: boolean;
  selectedRelicId?: string; capturableId?: string; onSelectRelic?(id: string): void;
};
