const DEFAULT_PROD_PARTNER_ORIGIN = 'https://app.snaproad.app'

/**
 * Base URL for partner-facing links (referral signup QR, shared URLs).
 * Prefer VITE_PARTNER_PORTAL_URL on Vercel (e.g. https://app.snaproad.app).
 * In production builds without env, fall back to the live partner host.
 */
export function getPartnerPortalBaseUrl(): string {
  const env = (import.meta.env.VITE_PARTNER_PORTAL_URL as string | undefined)?.trim().replace(/\/$/, '')
  if (env) return env
  if (typeof globalThis !== 'undefined' && 'location' in globalThis && globalThis.location?.origin) {
    return globalThis.location.origin
  }
  if (import.meta.env.PROD) return DEFAULT_PROD_PARTNER_ORIGIN
  return ''
}
