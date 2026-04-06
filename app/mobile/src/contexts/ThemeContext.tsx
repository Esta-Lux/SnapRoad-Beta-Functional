import React, { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { Platform, useColorScheme, StatusBar, type TextStyle, type ViewStyle } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type Theme = 'light' | 'dark';

// ─── Design Tokens ──────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 9999,
} as const;

export const typography: Record<string, TextStyle> = {
  h1: { fontSize: 28, fontWeight: '900', letterSpacing: -0.4 },
  h2: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '600' },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
};

export function shadow(elevation: number = 8): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: Math.round(elevation / 4) },
      shadowOpacity: Math.min(0.08 + elevation * 0.015, 0.5),
      shadowRadius: elevation,
    },
    android: { elevation: Math.round(elevation / 2) },
    default: {},
  }) as ViewStyle;
}

// ─── Color Palettes ─────────────────────────────────────────────────────────

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
  rewardsGradientStart: '#3730a3',
  rewardsGradientEnd: '#7c3aed',
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
  rewardsGradientStart: '#4338ca',
  rewardsGradientEnd: '#9333ea',
};

interface ThemeContextType {
  theme: Theme;
  isLight: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadow: typeof shadow;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isLight: false,
  colors: DARK,
  spacing,
  radius,
  typography,
  shadow,
  toggleTheme: () => {},
});

const THEME_KEY = 'snaproad_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(systemScheme === 'light' ? 'light' : 'dark');
  const isLight = theme === 'light';
  const colors = useMemo(() => (isLight ? LIGHT : DARK), [isLight]);
  React.useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(THEME_KEY);
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
      }
    })();
  }, []);
  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      SecureStore.setItemAsync(THEME_KEY, next).catch(() => {});
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, isLight, colors, spacing, radius, typography, shadow, toggleTheme }}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
