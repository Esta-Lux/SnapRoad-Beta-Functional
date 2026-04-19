import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';
type ThemeMode = 'manual' | 'auto';

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setMode: (mode: ThemeMode) => void;
  isDaytime: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Determine if it's daytime (6 AM - 6 PM)
function checkIsDaytime(): boolean {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18;
}

export function SnaproadThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mode, setModeState] = useState<ThemeMode>('manual');
  const [isDaytime, setIsDaytime] = useState(checkIsDaytime());

  // Load saved preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem('snaproad-theme') as Theme | null;
    const savedMode = localStorage.getItem('snaproad-theme-mode') as ThemeMode | null;
    
    if (savedMode) {
      setModeState(savedMode);
    }
    
    if (savedMode === 'auto') {
      // Auto mode: use time of day
      const daytime = checkIsDaytime();
      setIsDaytime(daytime);
      const autoTheme = daytime ? 'light' : 'dark';
      setThemeState(autoTheme);
      applyTheme(autoTheme);
    } else if (savedTheme) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  // Auto-update theme based on time (check every minute)
  useEffect(() => {
    if (mode !== 'auto') return;

    const interval = setInterval(() => {
      const daytime = checkIsDaytime();
      setIsDaytime(daytime);
      const autoTheme = daytime ? 'light' : 'dark';
      if (autoTheme !== theme) {
        setThemeState(autoTheme);
        applyTheme(autoTheme);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [mode, theme]);

  const applyTheme = (newTheme: Theme) => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('snaproad-theme', newTheme);
    applyTheme(newTheme);
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('snaproad-theme-mode', newMode);
    
    if (newMode === 'auto') {
      const daytime = checkIsDaytime();
      setIsDaytime(daytime);
      const autoTheme = daytime ? 'light' : 'dark';
      setThemeState(autoTheme);
      applyTheme(autoTheme);
    }
  };

  const toggleTheme = () => {
    if (mode === 'auto') {
      // Switch to manual mode when toggling
      setModeState('manual');
      localStorage.setItem('snaproad-theme-mode', 'manual');
    }
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme, setTheme, setMode, isDaytime }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useSnaproadTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useSnaproadTheme must be used within a SnaproadThemeProvider');
  }
  return context;
}

