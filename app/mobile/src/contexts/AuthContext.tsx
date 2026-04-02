import React, { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import Constants from 'expo-constants';
import { api } from '../api/client';
import type { User, ApiUser } from '../types';
import { applySnapRoadFromProfilePayload } from '../utils/profileScore';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True while login/signup request is in flight (does not toggle the cold-start splash). */
  isAuthSubmitting: boolean;
  authError: string | null;
  /** Clears the last API auth message (e.g. after switching Sign In ↔ Create Account). */
  clearAuthError: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, dateOfBirth: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<{ ok: boolean; message: string }>;
  resendVerification: (email: string) => Promise<{ ok: boolean; message: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setUserFromApi: (apiUser: ApiUser | null) => void;
  completeOAuthSignIn: (accessToken: string, refreshToken: string) => Promise<{ ok: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DRIVER_APP_STAFF_BLOCK_MESSAGE =
  'This account cannot sign in to the driver app. Use a driver account, or ask your team to change your role to driver in the admin tools.';

function isStaffRole(role: string | undefined): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'partner';
}

/**
 * Allow admin/partner profiles in the driver app when explicitly opted in.
 * EAS preview/internal builds often set NODE_ENV=production, so we also key off EAS_BUILD_PROFILE
 * (injected into expo.extra at build time). Never true for the store `production` profile.
 */
function allowStaffInDriverApp(): boolean {
  if (String(process.env.EXPO_PUBLIC_ALLOW_STAFF_IN_DRIVER_APP || '').toLowerCase() !== 'true') {
    return false;
  }
  if (__DEV__) {
    return true;
  }
  const profile = String(
    (Constants.expoConfig?.extra as { easBuildProfile?: string } | undefined)?.easBuildProfile || '',
  ).toLowerCase();
  if (['preview', 'development', 'development-simulator'].includes(profile)) {
    return true;
  }
  return false;
}

function mapApiUserToContext(apiUser: Record<string, unknown>): User {
  const name = String(apiUser.name ?? apiUser.email ?? 'Driver');
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const planStr = typeof apiUser.plan === 'string' ? apiUser.plan : '';
  let isPremium = Boolean(apiUser.is_premium);
  let isFamilyPlan = false;
  if (planStr) {
    isFamilyPlan = planStr === 'family';
    isPremium = planStr === 'premium' || planStr === 'family';
  }

  const user: User = {
    id: String(apiUser.id ?? ''),
    name,
    email: String(apiUser.email ?? ''),
    avatar: initials,
    isPremium,
    isFamilyPlan,
    gems: Number(apiUser.gems ?? 0),
    level: Number(apiUser.level ?? 1),
    safetyScore: Number(apiUser.safety_score ?? 0),
    streak: Number(apiUser.streak ?? apiUser.safe_drive_streak ?? 0),
    totalMiles: Number(apiUser.total_miles ?? 0),
    totalTrips: Number(apiUser.total_trips ?? 0),
    badges: Number(apiUser.badges ?? 0),
    rank: 0,
    xp: apiUser.xp != null ? Number(apiUser.xp) : undefined,
    plan: planStr || undefined,
    gem_multiplier:
      apiUser.gem_multiplier != null ? Number(apiUser.gem_multiplier) : undefined,
  };
  applySnapRoadFromProfilePayload(user, apiUser);
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const clearAuthError = useCallback(() => setAuthError(null), []);

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
        if (isStaffRole(role) && !allowStaffInDriverApp()) {
          await api.setToken(null);
          setUser(null);
        } else {
          setUser(mapApiUserToContext(apiUser));
        }
      } else {
        const errMsg = (res as { error?: string }).error ?? '';
        const isAuthReject = errMsg.includes('expired') || errMsg.includes('401') || errMsg.includes('Session expired');
        if (isAuthReject) {
          await api.setToken(null);
          setUser(null);
        }
        // Network errors / 5xx: keep token so the user isn't logged out offline
      }
    } catch {
      // Network failure, timeout, backend down — keep the token for retry on next launch
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    restoreSession();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    setIsAuthSubmitting(true);
    try {
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
      if (isStaffRole(role) && !allowStaffInDriverApp()) {
        setAuthError(DRIVER_APP_STAFF_BLOCK_MESSAGE);
        return false;
      }
      setUser(mapApiUserToContext(apiUser));
      return true;
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const signup = async (name: string, email: string, password: string, dateOfBirth: string): Promise<boolean> => {
    setAuthError(null);
    setIsAuthSubmitting(true);
    try {
      const result = await api.signup({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        date_of_birth: dateOfBirth.trim(),
      });
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
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const forgotPassword = async (email: string): Promise<{ ok: boolean; message: string }> => {
    const result = await api.forgotPassword(email.trim());
    if (!result.success) {
      return { ok: false, message: result.error || 'Could not send reset email' };
    }
    const payload = (result.data as { data?: { message?: string }; message?: string })?.data ?? result.data;
    const message = payload?.message || 'If an account exists, a reset email has been sent.';
    return { ok: true, message };
  };

  const resendVerification = async (email: string): Promise<{ ok: boolean; message: string }> => {
    const result = await api.resendVerification(email.trim());
    if (!result.success) {
      return { ok: false, message: result.error || 'Could not send verification email' };
    }
    const payload = (result.data as { data?: { message?: string }; message?: string })?.data ?? result.data;
    const message = payload?.message || 'If an account exists, a verification email has been sent.';
    return { ok: true, message };
  };

  const completeOAuthSignIn = async (
    accessToken: string,
    refreshToken: string,
  ): Promise<{ ok: boolean; message?: string }> => {
    setAuthError(null);
    setIsAuthSubmitting(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) {
        const message = sessionError.message || 'Could not restore your Google session.';
        setAuthError(message);
        return { ok: false, message };
      }

      const result = await api.exchangeSupabaseAccessToken(accessToken);
      if (!result.success || !result.data) {
        const message = result.error || 'Could not finish Google sign-in.';
        setAuthError(message);
        return { ok: false, message };
      }

      const apiUser = (result.data as unknown as { user?: Record<string, unknown> }).user;
      if (!apiUser) {
        const message = 'Google sign-in completed but no user profile was returned.';
        setAuthError(message);
        return { ok: false, message };
      }

      const role = (apiUser as { role?: string }).role;
      if (isStaffRole(role) && !allowStaffInDriverApp()) {
        await api.setToken(null);
        setAuthError(DRIVER_APP_STAFF_BLOCK_MESSAGE);
        return { ok: false, message: DRIVER_APP_STAFF_BLOCK_MESSAGE };
      }

      setUser(mapApiUserToContext(apiUser));
      return { ok: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not finish Google sign-in.';
      setAuthError(message);
      return { ok: false, message };
    } finally {
      setIsAuthSubmitting(false);
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
    try {
      const { supabase } = await import('../lib/supabase');
      await supabase.auth.signOut();
    } catch { /* Supabase may not be configured */ }
    setUser(null);
    setAuthError(null);
  };

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next: Partial<User> = {};
      (Object.keys(updates) as (keyof User)[]).forEach((k) => {
        const v = updates[k];
        if (v !== undefined) (next as Record<string, unknown>)[k as string] = v;
      });
      return { ...prev, ...next };
    });
  }, []);

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
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAuthSubmitting,
        authError,
        clearAuthError,
        login,
        signup,
        forgotPassword,
        resendVerification,
        logout,
        updateUser,
        setUserFromApi,
        completeOAuthSignIn,
      }}
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
