import React, { useEffect, useRef } from 'react';
import type { MapSurfaceProps } from './map-surface.types';
export function MapSurface({ children, onWidth, onPan, onZoom }: MapSurfaceProps) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = element.current; if (!node) return;
    const observer = new ResizeObserver(() => onWidth(node.clientWidth)); observer.observe(node); onWidth(node.clientWidth);
    const touches = new Map<number, { x: number; y: number }>();
    const midpoint = () => { const points = [...touches.values()]; return { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length }; };
    const distance = () => { const points = [...touches.values()]; return points.length < 2 ? 0 : Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y); };
    const offset = (x: number, y: number) => { const box = node.getBoundingClientRect(); return { x: x - box.left - box.width / 2, y: y - box.top - box.height / 2 }; };
    const wheel = (event: WheelEvent) => { event.preventDefault(); const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1); onZoom(Math.exp(-Math.max(-200, Math.min(200, pixels)) * .003), offset(event.clientX, event.clientY)); };
    const down = (event: PointerEvent) => { if (event.button !== 0) return; node.setPointerCapture(event.pointerId); touches.set(event.pointerId, { x: event.clientX, y: event.clientY }); };
    const move = (event: PointerEvent) => {
      if (!touches.has(event.pointerId)) return;
      const before = midpoint(), oldDistance = distance(); touches.set(event.pointerId, { x: event.clientX, y: event.clientY }); const after = midpoint(), newDistance = distance();
      onPan(after.x - before.x, after.y - before.y);
      if (oldDistance > 4 && newDistance > 4) onZoom(newDistance / oldDistance, offset(after.x, after.y));
    };
    const up = (event: PointerEvent) => { touches.delete(event.pointerId); };
    const doubleClick = (event: MouseEvent) => { event.preventDefault(); onZoom(event.shiftKey ? .5 : 2, offset(event.clientX, event.clientY)); };
    node.addEventListener('wheel', wheel, { passive: false }); node.addEventListener('pointerdown', down); node.addEventListener('pointermove', move); node.addEventListener('pointerup', up); node.addEventListener('pointercancel', up); node.addEventListener('lostpointercapture', up); node.addEventListener('dblclick', doubleClick);
    return () => { observer.disconnect(); node.removeEventListener('wheel', wheel); node.removeEventListener('pointerdown', down); node.removeEventListener('pointermove', move); node.removeEventListener('pointerup', up); node.removeEventListener('pointercancel', up); node.removeEventListener('lostpointercapture', up); node.removeEventListener('dblclick', doubleClick); };
  }, [onWidth, onPan, onZoom]);
  return <div ref={element} role="region" aria-label="Exploration map" style={{ position: 'absolute', inset: 0, touchAction: 'none', cursor: 'grab', userSelect: 'none' }}><div style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>{children}</div></div>;
}
