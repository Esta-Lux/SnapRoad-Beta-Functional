import { API_BASE_URL } from '../api/client';

/** Ensure remote images load in RN (relative API paths need an origin). */
export function absolutizeMediaUrl(raw: string | undefined | null): string | undefined {
  if (raw == null || typeof raw !== 'string') return undefined;
  const u = raw.trim();
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  const base = API_BASE_URL.replace(/\/$/, '');
  return u.startsWith('/') ? `${base}${u}` : `${base}/${u}`;
}
