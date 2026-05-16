/**
 * Pending referral code storage + URL parsing.
 *
 * A user can open `snaproad://referral/CODE` (or the HTTPS equivalent) before
 * they have signed in. We stash the code locally, then surface it during the
 * next signup so the backend (`/api/auth/signup` or `/api/auth/oauth/supabase`)
 * can apply + verify it and credit the referrer.
 */
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'snaproad.pending_referral_code';

const CODE_REGEX = /^[A-Z0-9-]{4,32}$/;

function normalizeCode(raw: string | null | undefined): string {
  if (!raw) return '';
  const cleaned = String(raw).trim().toUpperCase().replace(/\s+/g, '');
  if (!cleaned) return '';
  const stripped = cleaned.startsWith('SNAP-') ? cleaned.slice(5) : cleaned;
  return CODE_REGEX.test(stripped) ? stripped : '';
}

/**
 * Extract a referral code from a URL. Supports:
 *   snaproad://referral/{code}
 *   snaproad://invite/{code}
 *   https://snaproad.app/referral/{code}
 *   https://snaproad.app/invite/{code}
 * Also accepts `?code=...` / `?referral_code=...` query strings on the same paths.
 * Returns '' when the URL doesn't reference a referral path.
 */
export function extractReferralCodeFromUrl(url: string): string {
  if (!url) return '';
  const normalized = url.trim();
  if (!normalized) return '';

  let path = '';
  let queryString = '';
  try {
    // Strip scheme. Custom schemes (snaproad://) and HTTPS both supported.
    const schemeMatch = /^[a-z][a-z0-9+\-.]*:\/\/(.*)$/i.exec(normalized);
    const remainder = schemeMatch ? schemeMatch[1] : normalized;
    const [pathPart, queryPart] = remainder.split('?', 2);
    path = pathPart.replace(/^\/+/, '');
    queryString = queryPart ?? '';
  } catch {
    return '';
  }

  // Drop any leading host (e.g. "snaproad.app/referral/CODE" → "referral/CODE").
  const segments = path.split('/').filter(Boolean);
  let referralIdx = segments.findIndex((s) => /^(referral|invite)$/i.test(s));
  if (referralIdx === -1) {
    return '';
  }

  const codeSegment = segments[referralIdx + 1] ?? '';
  let candidate = '';
  try {
    candidate = decodeURIComponent(codeSegment);
  } catch {
    candidate = codeSegment;
  }

  if (!candidate && queryString) {
    const params = new URLSearchParams(queryString);
    candidate = params.get('code') ?? params.get('referral_code') ?? '';
  }

  return normalizeCode(candidate);
}

export async function storePendingReferralCode(code: string): Promise<void> {
  const normalized = normalizeCode(code);
  if (!normalized) return;
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, normalized);
  } catch {
    // Secure storage may be unavailable on some platforms; non-fatal.
  }
}

export async function readPendingReferralCode(): Promise<string> {
  try {
    const value = await SecureStore.getItemAsync(STORAGE_KEY);
    return normalizeCode(value ?? '');
  } catch {
    return '';
  }
}

/** Read + clear in one call. Use right before sending the signup request. */
export async function consumePendingReferralCode(): Promise<string> {
  const code = await readPendingReferralCode();
  if (code) {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    } catch {
      // Best effort — leaving the value behind only causes a stale referral attempt later.
    }
  }
  return code;
}

export async function clearPendingReferralCode(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    // ignore
  }
}
