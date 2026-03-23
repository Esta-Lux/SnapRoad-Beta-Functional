import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

function readEnv(): { url: string; key: string } {
  const url = String(
    import.meta.env.VITE_SUPABASE_URL ||
      import.meta.env.VITE_PUBLIC_SUPABASE_URL ||
      ''
  ).trim()
  const key = String(
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY ||
      ''
  ).trim()

  if (import.meta.env.DEV && (!url || !key)) {
    // eslint-disable-next-line no-console
    console.warn('[SnapRoad] getSupabaseClient: missing URL or public key', {
      hasUrl: Boolean(url),
      hasKey: Boolean(key),
    })
  }
  return { url, key }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client
  const { url, key } = readEnv()
  if (!url || !key) return null
  try {
    client = createClient(url, key)
  } catch (e) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[SnapRoad] Supabase createClient failed:', e)
    }
    return null
  }
  return client
}
