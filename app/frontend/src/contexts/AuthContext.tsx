import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { api } from '@/services/api'

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
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  setUserFromApiResponse: (apiUser: Record<string, unknown>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function mapApiUserToContext(apiUser: Record<string, unknown>): User {
  const name = String(apiUser.name ?? apiUser.email ?? 'Driver')
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return {
    id: String(apiUser.id ?? ''),
    name,
    email: String(apiUser.email ?? ''),
    avatar: initials,
    isPremium: Boolean(apiUser.is_premium ?? apiUser.plan === 'premium'),
    isFamilyPlan: Boolean(apiUser.plan === 'family'),
    gems: Number(apiUser.gems ?? 0),
    level: Number(apiUser.level ?? 1),
    safetyScore: Number(apiUser.safety_score ?? 0),
    streak: Number(apiUser.streak ?? 0),
    totalMiles: Number(apiUser.total_miles ?? 0),
    totalTrips: Number(apiUser.total_trips ?? 0),
    badges: Number(apiUser.badges ?? 0),
    rank: 0,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const restoreSession = async () => {
    const token = api.getToken()
    if (!token) {
      setIsLoading(false)
      return
    }
    try {
      const res = await api.getProfile()
      const payload = (res.data as { data?: Record<string, unknown> })?.data ?? res.data
      const apiUser = payload as Record<string, unknown> | undefined
      if (res.success && apiUser) {
        const role = apiUser.role as string | undefined
        if (role === 'admin' || role === 'super_admin' || role === 'partner') {
          api.setToken(null)
          setUser(null)
        } else {
          setUser(mapApiUserToContext(apiUser))
        }
      } else {
        api.setToken(null)
        setUser(null)
      }
    } catch {
      api.setToken(null)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    restoreSession()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    const result = await api.login({ email, password })
    if (!result.success || !result.data) return false
    const apiUser = (result.data as { user?: Record<string, unknown> }).user
    if (!apiUser) return false
    const role = (apiUser as { role?: string }).role
    if (role === 'admin' || role === 'super_admin' || role === 'partner') return false
    setUser(mapApiUserToContext(apiUser))
    return true
  }

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    const result = await api.signup({ name, email, password })
    if (!result.success || !result.data) return false
    const apiUser = (result.data as { user?: Record<string, unknown> }).user
    if (!apiUser) return false
    setUser(mapApiUserToContext(apiUser))
    return true
  }

  const logout = () => {
    api.logout()
    setUser(null)
  }

  const updateUser = (updates: Partial<User>) => {
    if (user) setUser({ ...user, ...updates })
  }

  const setUserFromApiResponse = (apiUser: Record<string, unknown>) => {
    setUser(mapApiUserToContext(apiUser))
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout, updateUser, setUserFromApiResponse }}>
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
