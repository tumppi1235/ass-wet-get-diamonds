import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider } from '../accounts/session';
import { GameProvider } from '../game/state';
import { useFonts } from 'expo-font';
import { Loading } from '../components/ui';
export default function Layout() {
  const [loaded, error] = useFonts({ Pixelify: require('../../assets/fonts/PixelifySans.ttf') });
  if (!loaded && !error) return <Loading message="Loading your adventure…" />;
  return <SessionProvider><GameProvider><StatusBar style="light" /><Stack screenOptions={{ title: 'Trail Relics', headerShown: false, contentStyle: { backgroundColor: '#102726' } }} /></GameProvider></SessionProvider>;
}
