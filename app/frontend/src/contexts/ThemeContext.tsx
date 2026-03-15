import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const lightTheme = {
  '--bg-primary': '#ffffff',
  '--bg-surface': '#f8fafc',
  '--bg-elevated': '#f1f5f9',
  '--bg-border': '#e2e8f0',
  '--text-primary': '#0f172a',
  '--text-secondary': '#64748b',
  '--accent': '#00DFA2',
  '--accent-blue': '#0084FF',
}

const darkTheme = {
  '--bg-primary': '#0a0a0f',
  '--bg-surface': '#12121a',
  '--bg-elevated': '#1a1a24',
  '--bg-border': '#2a2a3a',
  '--text-primary': '#ffffff',
  '--text-secondary': '#9ca3af',
  '--accent': '#00DFA2',
  '--accent-blue': '#0084FF',
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  const applyTheme = (selectedTheme: Theme) => {
    const vars = selectedTheme === 'dark' ? darkTheme : lightTheme
    Object.entries(vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value)
    })
  }

  useEffect(() => {
    const saved = localStorage.getItem('snaproad-theme') as Theme | null
    const initialTheme = saved || 'light'
    setThemeState(initialTheme)
    applyTheme(initialTheme)
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('snaproad-theme', newTheme)
    applyTheme(newTheme)
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
