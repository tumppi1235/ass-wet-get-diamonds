import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider } from '../accounts/session';
import { GameProvider } from '../game/state';
export default function Layout() { return <SessionProvider><GameProvider><StatusBar style="dark" /><Stack screenOptions={{ title: 'Trail Relics', headerShown: false, contentStyle: { backgroundColor: '#F4F2EA' } }} /></GameProvider></SessionProvider>; }
