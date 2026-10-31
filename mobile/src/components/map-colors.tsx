import React from 'react';
import { View } from 'react-native';
export function MapColors({ children }: { children: React.ReactNode; terrain: boolean }) { return <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>{children}</View>; }
