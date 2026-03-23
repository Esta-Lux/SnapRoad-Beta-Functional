// SnapRoad Mobile - Main App Entry Point
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navigation } from './src/navigation';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

// Error boundary so a crash shows a message instead of a blank screen
class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View style={[styles.root, styles.errorContainer]}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { isDark } = useTheme();
  return (
    <View style={styles.root}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Navigation />
    </View>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider style={styles.safeArea}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070E1B',
    ...(Platform.OS === 'web' && { minHeight: '100vh' as any }),
  },
  root: {
    flex: 1,
    backgroundColor: '#070E1B',
    ...(Platform.OS === 'web' && { minHeight: '100vh' as any }),
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
  },
});
