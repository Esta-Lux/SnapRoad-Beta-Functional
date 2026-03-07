// SnapRoad Mobile - Theme Context
// Supports dark/light mode with system preference detection

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

// Light theme colors
const lightColors = {
  primary: '#2563EB',
  primaryLight: '#60A5FA',
  primaryDark: '#1D4ED8',
  primaryGlow: '#3B82F6',
  neonBlue: '#2563EB',
  electricBlue: '#38BDF8',
  secondary: '#06D6A0',
  secondaryLight: '#34D399',
  secondaryDark: '#059669',
  accent: '#A855F7',
  accentLight: '#C084FC',
  accentDark: '#9333EA',
  background: '#F8FAFC',
  backgroundLight: '#F1F5F9',
  backgroundLighter: '#E2E8F0',
  surface: '#FFFFFF',
  surfaceLight: '#F8FAFC',
  surfaceLighter: '#F1F5F9',
  glass: 'rgba(255,255,255,0.95)',
  glassLight: 'rgba(248,250,252,0.9)',
  glassBorder: 'rgba(0,0,0,0.08)',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textDim: '#94A3B8',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#38BDF8',
  gem: '#A855F7',
  gold: '#FBBF24',
  silver: '#9CA3AF',
  bronze: '#F97316',
  cardBg: '#FFFFFF',
  inputBg: '#F1F5F9',
  borderColor: '#E2E8F0',
  gradientPrimary: ['#2563EB', '#38BDF8'] as string[],
  gradientNeon: ['#2563EB', '#06D6A0'] as string[],
  gradientAccent: ['#A855F7', '#EC4899'] as string[],
  gradientGold: ['#FBBF24', '#F59E0B'] as string[],
  gradientDark: ['#F8FAFC', '#E2E8F0'] as string[],
  gradientSuccess: ['#10B981', '#06D6A0'] as string[],
  gradientGlass: ['rgba(255,255,255,0.95)', 'rgba(248,250,252,0.9)'] as string[],
  gradientCard: ['#FFFFFF', '#F8FAFC'] as string[],
};

// Dark theme colors (original)
const darkColors = {
  primary: '#2563EB',
  primaryLight: '#60A5FA',
  primaryDark: '#1D4ED8',
  primaryGlow: '#3B82F6',
  neonBlue: '#2563EB',
  electricBlue: '#38BDF8',
  secondary: '#06D6A0',
  secondaryLight: '#34D399',
  secondaryDark: '#059669',
  accent: '#A855F7',
  accentLight: '#C084FC',
  accentDark: '#9333EA',
  background: '#070E1B',
  backgroundLight: '#0F1A2E',
  backgroundLighter: '#1A2744',
  surface: '#111D32',
  surfaceLight: '#1A2B47',
  surfaceLighter: '#243B5C',
  glass: 'rgba(17,29,50,0.85)',
  glassLight: 'rgba(26,43,71,0.75)',
  glassBorder: 'rgba(56,189,248,0.12)',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDim: '#475569',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#38BDF8',
  gem: '#A855F7',
  gold: '#FBBF24',
  silver: '#9CA3AF',
  bronze: '#F97316',
  cardBg: '#111D32',
  inputBg: '#1A2B47',
  borderColor: 'rgba(56,189,248,0.12)',
  gradientPrimary: ['#2563EB', '#38BDF8'] as string[],
  gradientNeon: ['#2563EB', '#06D6A0'] as string[],
  gradientAccent: ['#A855F7', '#EC4899'] as string[],
  gradientGold: ['#FBBF24', '#F59E0B'] as string[],
  gradientDark: ['#111D32', '#070E1B'] as string[],
  gradientSuccess: ['#10B981', '#06D6A0'] as string[],
  gradientGlass: ['rgba(17,29,50,0.9)', 'rgba(7,14,27,0.95)'] as string[],
  gradientCard: ['#111D32', '#0D1628'] as string[],
};

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  colors: typeof darkColors;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@snaproad_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && (saved === 'dark' || saved === 'light' || saved === 'system')) {
          setThemeState(saved as Theme);
        }
      } catch (e) {
        console.log('Failed to load theme preference');
      }
      setIsLoaded(true);
    };
    loadTheme();
  }, []);

  // Resolve actual theme based on preference
  const resolvedTheme: ResolvedTheme = 
    theme === 'system' 
      ? (systemColorScheme || 'dark') 
      : theme;

  const isDark = resolvedTheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.log('Failed to save theme preference');
    }
  };

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // Always render children so we never show a white screen (AsyncStorage load can be slow on web).
  // Use current resolved theme even while saved preference is still loading.
  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, colors, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { lightColors, darkColors };
