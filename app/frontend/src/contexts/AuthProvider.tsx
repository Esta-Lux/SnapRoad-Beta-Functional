import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from '@/services/api'
import { AuthContext, type User, type ApiUser } from './authContextInstance'

const DRIVER_APP_STAFF_BLOCK_MESSAGE =
  'This email is an admin or partner account, not a driver. Use /login for the admin dashboard. To use the driver app with this email, set role to "driver" in Supabase (Table Editor → profiles). Or sign up with a different email for driver-only testing.'

function isStaffRole(role: string | undefined): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'partner'
}

/**
 * Opt-in: VITE_ALLOW_STAFF_IN_DRIVER_APP=true so admin/partner can use /driver on local dev,
 * hosted preview, or staging. Blocked when MODE is production and VITE_APP_ENV is not preview/staging/development.
 */
function allowStaffInDriverApp(): boolean {
  if (String(import.meta.env.VITE_ALLOW_STAFF_IN_DRIVER_APP || '').toLowerCase() !== 'true') {
    return false
  }
  if (import.meta.env.DEV) {
    return true
  }
  const appEnv = String(import.meta.env.VITE_APP_ENV || '').toLowerCase()
  if (['preview', 'staging', 'development'].includes(appEnv)) {
    return true
  }
  return false
}

function mapApiUserToContext(apiUser: Record<string, unknown>): User {
  const name = String(apiUser.name ?? apiUser.email ?? 'Driver')
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const planStr = typeof apiUser.plan === 'string' ? apiUser.plan : ''
  let isPremium = Boolean(apiUser.is_premium)
  let isFamilyPlan = false
  if (planStr) {
    isFamilyPlan = planStr === 'family'
    isPremium = planStr === 'premium' || planStr === 'family'
  }
  return {
    id: String(apiUser.id ?? ''),
    name,
    email: String(apiUser.email ?? ''),
    avatar: initials,
    isPremium,
    isFamilyPlan,
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
  const [authError, setAuthError] = useState<string | null>(null)

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
        if (isStaffRole(role) && !allowStaffInDriverApp()) {
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
    setAuthError(null)
    const result = await api.login({ email: email.trim(), password: password.trim() })
    if (!result.success || !result.data) {
      setAuthError(result.error || 'Invalid email or password')
      return false
    }
    const apiUser = (result.data as unknown as { user?: Record<string, unknown> }).user
    if (!apiUser) {
      setAuthError(result.error || 'Login failed')
      return false
    }
    const role = (apiUser as { role?: string }).role
    if (isStaffRole(role) && !allowStaffInDriverApp()) {
      setAuthError(DRIVER_APP_STAFF_BLOCK_MESSAGE)
      return false
    }
    setUser(mapApiUserToContext(apiUser))
    return true
  }

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    setAuthError(null)
    const result = await api.signup({ name: name.trim(), email: email.trim(), password: password.trim() })
    if (!result.success || !result.data) {
      setAuthError(result.error || 'Signup failed')
      return false
    }
    const apiUser = (result.data as unknown as { user?: Record<string, unknown> }).user
    if (!apiUser) {
      setAuthError(result.error || 'Signup failed')
      return false
    }
    setUser(mapApiUserToContext(apiUser))
    return true
  }

  const logout = () => {
    api.logout()
    setUser(null)
  }

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null
      const next: Partial<User> = {}
      ;(Object.keys(updates) as (keyof User)[]).forEach((k) => {
        const v = updates[k]
        if (v !== undefined) (next as Record<string, unknown>)[k as string] = v
      })
      return { ...prev, ...next }
    })
  }, [])

  const setUserFromApi = (apiUser: ApiUser | null) => {
    if (!apiUser) {
      setUser(null)
      return
    }
    const record = { ...apiUser, name: apiUser.name ?? apiUser.full_name } as Record<string, unknown>
    setUser(mapApiUserToContext(record))
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, authError, login, signup, logout, updateUser, setUserFromApi }}>
      {children}
    </AuthContext.Provider>
  )
}
