export function parseParamsFromUrl(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const [basePart, hashPart] = url.split('#');
  const queryIndex = basePart.indexOf('?');
  const queryPart = queryIndex >= 0 ? basePart.slice(queryIndex + 1) : '';

  const ingest = (part: string) => {
    if (!part) return;
    for (const pair of part.split('&')) {
      const [k, v] = pair.split('=');
      if (!k) continue;
      try {
        out[decodeURIComponent(k)] = decodeURIComponent(v || '');
      } catch {
        out[k] = v || '';
      }
    }
  };

  ingest(queryPart);
  ingest(hashPart || '');
  return out;
}

/** Decode query-style OAuth error_description (may be URL-encoded, + as space). */
export function decodeOAuthErrorDescription(raw: string): string {
  const s = String(raw || '').replace(/\+/g, ' ');
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Map common Supabase failures to actionable copy for drivers. */
export function friendlySupabaseAuthErrorMessage(message: string): string {
  const text = String(message || '').trim();
  if (!text) return 'Sign-in failed. Please try again or use email and password.';
  if (/invalid\s*api\s*key/i.test(text)) {
    return (
      'The app’s Supabase key does not match your project. In EAS Environment variables, set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY from Supabase Dashboard → Settings → API (same project your backend uses). Rebuild the app after updating.'
    );
  }
  return text;
}

export function getPathFromUrl(url: string): string {
  const normalized = url.trim();
  if (!normalized) return '';

  const withoutHash = normalized.split('#', 1)[0] || normalized;
  const withoutQuery = withoutHash.split('?', 1)[0] || withoutHash;
  const schemeMatch = /^[a-z][a-z0-9+\-.]*:\/\/(.*)$/i.exec(withoutQuery);
  const remainder = schemeMatch ? schemeMatch[1] : withoutQuery;
  return remainder.replace(/^\/+/, '').trim().toLowerCase();
}
