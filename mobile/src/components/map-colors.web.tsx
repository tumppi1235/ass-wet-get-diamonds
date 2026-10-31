import React from 'react';
export function MapColors({ children, terrain }: { children: React.ReactNode; terrain: boolean }) {
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', filter: terrain ? 'saturate(0.65) sepia(0.12) contrast(0.96)' : 'saturate(0.48) sepia(0.2) contrast(0.96) brightness(0.98)' }}>{children}</div>;
}
