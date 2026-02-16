// SnapRoad Mobile - Main App Entry Point
// Complete Driver App matching web UI

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DriverAppMain from './src/screens/DriverApp';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <DriverAppMain />
    </SafeAreaProvider>
  );
}
