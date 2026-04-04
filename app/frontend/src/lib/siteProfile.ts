/**
 * When true, this deployment is the partner portal host (e.g. https://app.snaproad.app):
 * `/` opens the partner dashboard funnel; the Mapbox driver web app at `/driver` is retired here.
 *
 * Set `VITE_SITE_PROFILE=partner` on Vercel for app.snaproad.app, or rely on hostname detection.
 * For local full-stack dev, leave unset or use `VITE_SITE_PROFILE=full` so `/driver` still works.
 */
export function isPartnerPortalPrimarySite(): boolean {
  const env = String(
    import.meta.env.VITE_SITE_PROFILE || import.meta.env.VITE_PUBLIC_SITE_PROFILE || '',
  ).toLowerCase()
  if (env === 'partner' || env === 'partner_portal') return true
  if (env === 'full' || env === 'driver' || env === 'all') return false
  if (typeof window !== 'undefined') {
    const h = window.location.hostname
    if (h === 'app.snaproad.app') return true
  }
  return false
}
