import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrl = String(extra.supabaseUrl ?? '').trim();
const supabaseAnonKey = String(extra.supabaseAnonKey ?? '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing supabaseUrl/supabaseAnonKey in app.json extra');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

