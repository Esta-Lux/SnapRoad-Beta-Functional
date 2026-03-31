import { createContext, useContext } from 'react'

export interface User {
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

/** API login/signup response user shape (id, email, name or full_name) */
export interface ApiUser {
  id?: string
  email?: string
  name?: string
  full_name?: string
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  authError: string | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  /** Set user from API login/signup response so post-login pages have auth state */
  setUserFromApi: (apiUser: ApiUser | null) => void
}

/**
 * Stable context instance — lives in this file only so Vite Fast Refresh does not
 * recreate the context when editing AuthProvider (fixes "useAuth must be used within an AuthProvider").
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
