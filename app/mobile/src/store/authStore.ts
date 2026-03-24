import { create } from 'zustand';
import { storage } from '../utils/storage';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'driver' | 'admin' | 'partner';
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    const raw = storage.getString('auth_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  })(),
  token: storage.getString('auth_token') ?? null,
  isAuthenticated: !!storage.getString('auth_token'),
  setAuth: (user, token) => {
    storage.set('auth_user', JSON.stringify(user));
    storage.set('auth_token', token);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    storage.delete('auth_user');
    storage.delete('auth_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
