/**
 * Pure URL helpers for the public Terms of Service / Privacy Policy pages.
 *
 * Lives in its own module so unit tests can exercise the URL math without
 * importing `expo-constants` / `react-native` (which fail under Node's
 * built-in test runner).
 */

export type LegalDocSlug = 'terms-of-service' | 'privacy-policy';

export const DEFAULT_LEGAL_WEBSITE_BASE = 'https://snaproad.app';

/**
 * Convert a configured API URL into the public-website base URL.
 *
 *   `https://api.snaproad.app`         → `https://app.snaproad.app`
 *   `https://api.staging.snaproad.app` → `https://app.staging.snaproad.app`
 *   `http://localhost:8001`            → `http://localhost:8001` (dev)
 *   `garbage` / undefined / empty      → `https://snaproad.app` (fallback)
 *
 * The transform is intentionally narrow — only swap a leading `api.`
 * subdomain — so non-standard hosts (custom dev tunnels, IP addresses)
 * stay reachable from the device when the website is hosted on the same
 * origin as the API.
 */
export function transformApiUrlToWebsiteBase(apiUrl: string | undefined | null): string {
  const trimmed = (apiUrl ?? '').trim();
  if (!trimmed) return DEFAULT_LEGAL_WEBSITE_BASE;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.host.startsWith('api.')
      ? `app.${parsed.host.slice(4)}`
      : parsed.host;
    return `${parsed.protocol}//${host}`;
  } catch {
    return DEFAULT_LEGAL_WEBSITE_BASE;
  }
}

/** Slug → website path. */
export function legalDocumentPath(slug: LegalDocSlug): string {
  return slug === 'terms-of-service' ? '/terms' : '/privacy';
}
