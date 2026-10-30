import React, { useEffect, useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';
import type { MapSurfaceProps } from './map-surface.types';
export function MapSurface({ children, onWidth, onPan, onZoom }: MapSurfaceProps) {
  const handlers = useRef({ onPan, onZoom }), previous = useRef({ dx: 0, dy: 0, distance: 0 }), size = useRef({ width: 750, height: 560 });
  useEffect(() => { handlers.current = { onPan, onZoom }; }, [onPan, onZoom]);
  // eslint-disable-next-line react-hooks/refs -- These refs are accessed by later touch callbacks only.
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { previous.current = { dx: 0, dy: 0, distance: 0 }; },
    onPanResponderMove: (event, gesture) => {
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {
        const [a, b] = touches, distance = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
        if (previous.current.distance > 4 && distance > 4) handlers.current.onZoom(distance / previous.current.distance, { x: (a.locationX + b.locationX) / 2 - size.current.width / 2, y: (a.locationY + b.locationY) / 2 - size.current.height / 2 });
        previous.current = { dx: gesture.dx, dy: gesture.dy, distance };
      } else {
        if (!previous.current.distance) handlers.current.onPan(gesture.dx - previous.current.dx, gesture.dy - previous.current.dy);
        previous.current = { dx: gesture.dx, dy: gesture.dy, distance: 0 };
      }
    },
  }), []);
  return <View style={{ position: 'absolute', inset: 0 }} onLayout={event => { size.current = event.nativeEvent.layout; onWidth(event.nativeEvent.layout.width); }} {...responder.panHandlers}><View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>{children}</View></View>;
}
