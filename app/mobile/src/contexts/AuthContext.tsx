import React, { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { api } from '../api/client';
import type { User, ApiUser } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setUserFromApi: (apiUser: ApiUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapApiUserToContext(apiUser: Record<string, unknown>): User {
  const name = String(apiUser.name ?? apiUser.email ?? 'Driver');
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
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
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const restoreSession = async () => {
    const token = await api.getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.getProfile();
      const payload = (res.data as { data?: Record<string, unknown> })?.data ?? res.data;
      const apiUser = payload as Record<string, unknown> | undefined;
      if (res.success && apiUser) {
        const role = apiUser.role as string | undefined;
        if (role === 'admin' || role === 'super_admin' || role === 'partner') {
          await api.setToken(null);
          setUser(null);
        } else {
          setUser(mapApiUserToContext(apiUser));
        }
      } else {
        await api.setToken(null);
        setUser(null);
      }
    } catch {
      await api.setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    restoreSession();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    const result = await api.login({ email: email.trim(), password: password.trim() });
    if (!result.success || !result.data) {
      setAuthError(result.error || 'Invalid email or password');
      return false;
    }
    const apiUser = (result.data as unknown as { user?: Record<string, unknown> }).user;
    if (!apiUser) {
      setAuthError(result.error || 'Login failed');
      return false;
    }
    const role = (apiUser as { role?: string }).role;
    if (role === 'admin' || role === 'super_admin' || role === 'partner') {
      setAuthError('This account cannot access the driver app');
      return false;
    }
    setUser(mapApiUserToContext(apiUser));
    return true;
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    const result = await api.signup({ name: name.trim(), email: email.trim(), password: password.trim() });
    if (!result.success || !result.data) {
      setAuthError(result.error || 'Signup failed');
      return false;
    }
    const apiUser = (result.data as unknown as { user?: Record<string, unknown> }).user;
    if (!apiUser) {
      setAuthError(result.error || 'Signup failed');
      return false;
    }
    setUser(mapApiUserToContext(apiUser));
    return true;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) setUser({ ...user, ...updates });
  };

  const setUserFromApi = (apiUser: ApiUser | null) => {
    if (!apiUser) {
      setUser(null);
      return;
    }
    const record = { ...apiUser, name: apiUser.name ?? apiUser.full_name } as Record<string, unknown>;
    setUser(mapApiUserToContext(record));
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, authError, login, signup, logout, updateUser, setUserFromApi }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
