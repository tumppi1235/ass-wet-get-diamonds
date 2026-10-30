import React from 'react';
import Svg, { Defs, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
export function FeltBackground() {
  return <Svg pointerEvents="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
    <Defs><RadialGradient id="felt-glow" cx="55%" cy="10%" rx="85%" ry="100%"><Stop offset="0" stopColor="#254B40" /><Stop offset="1" stopColor="#0B1C21" /></RadialGradient><Pattern id="felt-stitch" width={28} height={28} patternUnits="userSpaceOnUse"><Path d="M13 3h2v2h-2zM3 13h2v2H3zM23 13h2v2h-2zM13 23h2v2h-2z" fill="#C3BA79" opacity={.07} /><Path d="M0 0l28 28M28 0L0 28" stroke="#A2AD83" strokeWidth={.35} opacity={.05} /></Pattern></Defs>
    <Rect width="100%" height="100%" fill="url(#felt-glow)" /><Rect width="100%" height="100%" fill="url(#felt-stitch)" />
  </Svg>;
}
