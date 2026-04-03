import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrlRaw = String(extra.supabaseUrl ?? '').trim();
const supabaseAnonKeyRaw = String(extra.supabaseAnonKey ?? '').trim();

/** True when real project URL/key are set (EAS env / local .env). */
export const supabaseConfigured = Boolean(supabaseUrlRaw && supabaseAnonKeyRaw);

// @supabase/supabase-js throws if url is empty ("supabaseUrl is required"); use placeholders so the bundle never crashes at import.
const PLACEHOLDER_URL = 'https://env-not-configured.supabase.co';
const PLACEHOLDER_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjAwMDAwMDAwfQ.placeholder';

const supabaseUrl = supabaseUrlRaw || PLACEHOLDER_URL;
const supabaseAnonKey = supabaseAnonKeyRaw || PLACEHOLDER_ANON;

if (!supabaseConfigured) {
  console.warn('[Supabase] Missing supabaseUrl/supabaseAnonKey in app.json extra — auth/storage disabled until configured');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

