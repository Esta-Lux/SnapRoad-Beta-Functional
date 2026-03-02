import { useState, createContext, useContext, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  avatar: string
  isPremium: boolean
  isFamilyPlan: boolean
  gems: number
  level: number
  safetyScore: number
  streak: number
  totalMiles: number
  totalTrips: number
  badges: number
  rank: number
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const mockUser: User = {
  id: '1',
  name: 'Sarah Johnson',
  email: 'sarah@example.com',
  avatar: 'SJ',
  isPremium: true,
  isFamilyPlan: true,
  gems: 12400,
  level: 42,
  safetyScore: 87,
  streak: 14,
  totalMiles: 2847,
  totalTrips: 156,
  badges: 11,
  rank: 42
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    if (email && password) {
      setUser(mockUser)
      return true
    }
    return false
  }

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    if (name && email && password) {
      setUser({ ...mockUser, name, email })
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
  }

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates })
    }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
