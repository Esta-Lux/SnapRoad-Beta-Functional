/**
 * Base URL for partner-facing links (referral signup QR, shared URLs).
 * Set VITE_PARTNER_PORTAL_URL in production when the app lives on a fixed host
 * (e.g. https://app.snaproad.app) so links stay correct even if opened from elsewhere.
 */
export function getPartnerPortalBaseUrl(): string {
  const env = (import.meta.env.VITE_PARTNER_PORTAL_URL as string | undefined)?.trim().replace(/\/$/, '')
  if (env) return env
  if (typeof globalThis !== 'undefined' && 'location' in globalThis && globalThis.location?.origin) {
    return globalThis.location.origin
  }
  return ''
}
