import type { Point } from './region';
export type Viewport = { center: Point; scale: number };
export function zoomViewport(view: Viewport, factor: number, offset: Point, minimum: number, maximum = 1.2): Viewport {
  const scale = Math.min(maximum, Math.max(minimum, view.scale * factor));
  // Keep the same world point beneath the cursor or pinch midpoint.
  return { scale, center: { x: view.center.x + offset.x / view.scale - offset.x / scale, y: view.center.y - offset.y / view.scale + offset.y / scale } };
}
export function panViewport(view: Viewport, dx: number, dy: number): Viewport {
  return { scale: view.scale, center: { x: view.center.x - dx / view.scale, y: view.center.y + dy / view.scale } };
}
