import type { ReactNode } from 'react';
import type { Point } from '../map/region';
export type MapSurfaceProps = { children: ReactNode; onWidth(width: number): void; onPan(dx: number, dy: number): void; onZoom(factor: number, offset: Point): void };
