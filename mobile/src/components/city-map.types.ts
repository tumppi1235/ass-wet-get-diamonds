import type { GameState } from '../game/types';
import type { PlayerPosition } from '../location/tracker';
import type { TileClaims } from '../game/claims';
import type {MapBounds,ClaimCluster} from '../map/claim-window';
export type CityMapProps = {
  game: GameState; communityVisits: Record<string, number>;
  onDiscover(ids: [number, number][]): void;
  player: PlayerPosition | null; focusKey: string; demo: boolean;
  locating: boolean; onLocate(): void; fullScreen?: boolean;
  selectedRelicId?: string; capturableId?: string; onSelectRelic?(id: string): void;
  claims?: TileClaims; ownerId?: string; activeTileId?:string; selectedTileId?: string; onSelectTile?(id:string):void;
  claimClusters?:ClaimCluster[];onViewBounds?(bounds:MapBounds):void;
};
