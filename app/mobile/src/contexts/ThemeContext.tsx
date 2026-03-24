import React, { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { useColorScheme, StatusBar } from 'react-native';

type Theme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  primary: string;
  primaryDark: string;
  gradientStart: string;
  gradientEnd: string;
  ctaGradientStart: string;
  ctaGradientEnd: string;
  success: string;
  warning: string;
  danger: string;
  card: string;
  tabBar: string;
  searchBar: string;
  rewardsGradientStart: string;
  rewardsGradientEnd: string;
  leaderboardGradientStart: string;
  leaderboardGradientEnd: string;
}

const DARK: ThemeColors = {
  background: '#0a0a0f',
  surface: '#1a1a24',
  surfaceSecondary: '#252530',
  text: '#ffffff',
  textSecondary: '#a0a0b0',
  textTertiary: '#606070',
  border: '#2a2a3a',
  primary: '#007AFF',
  primaryDark: '#0055CC',
  gradientStart: '#0066FF',
  gradientEnd: '#0044CC',
  ctaGradientStart: '#007AFF',
  ctaGradientEnd: '#0055CC',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  card: '#1a1a24',
  tabBar: '#0f0f18',
  searchBar: '#1a1a24',
  rewardsGradientStart: '#059669',
  rewardsGradientEnd: '#0d9488',
  leaderboardGradientStart: '#9333ea',
  leaderboardGradientEnd: '#ec4899',
};

const LIGHT: ThemeColors = {
  background: '#f5f5f7',
  surface: '#ffffff',
  surfaceSecondary: '#f0f0f2',
  text: '#1a1a1a',
  textSecondary: '#6a6a7a',
  textTertiary: '#9a9aaa',
  border: '#e0e0e5',
  primary: '#007AFF',
  primaryDark: '#0055CC',
  gradientStart: '#0066FF',
  gradientEnd: '#0044CC',
  ctaGradientStart: '#007AFF',
  ctaGradientEnd: '#0055CC',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  card: '#ffffff',
  tabBar: '#ffffff',
  searchBar: '#f0f0f2',
  rewardsGradientStart: '#059669',
  rewardsGradientEnd: '#0d9488',
  leaderboardGradientStart: '#9333ea',
  leaderboardGradientEnd: '#ec4899',
};

interface ThemeContextType {
  theme: Theme;
  isLight: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isLight: false,
  colors: DARK,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(systemScheme === 'light' ? 'light' : 'dark');
  const isLight = theme === 'light';
  const colors = useMemo(() => (isLight ? LIGHT : DARK), [isLight]);
  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, isLight, colors, toggleTheme }}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
