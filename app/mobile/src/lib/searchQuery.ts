/**
 * Normalize map search text for Google/Mapbox: strip intent phrases, tighten local bias,
 * and detect when the user asked for "open now" (handled server-side when possible).
 */

const OPEN_NOW_RE = /\b(open\s+now|open\s+right\s+now|currently\s+open)\b/gi;
const NEAR_ME_RE = /\b(near\s+me|close\s+to\s+me|around\s+me)\b/gi;
const CLOSEST_RE = /\b(closest|nearest)(\s+to\s+me)?\b/gi;

function collapseSpace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** ~±12–15 km bounding box for Mapbox forward-geocode fallback (driving-local). */
export function localSearchBbox(lat: number, lng: number): string {
  const dLat = 0.11;
  const dLng = 0.13 / Math.max(0.35, Math.cos((lat * Math.PI) / 180));
  const w = Math.max(-180, lng - dLng);
  const e = Math.min(180, lng + dLng);
  const s = Math.max(-90, lat - dLat);
  const n = Math.min(90, lat + dLat);
  return `${w},${s},${e},${n}`;
}

export interface NormalizedPlacesSearch {
  /** Query sent to /api/places/autocomplete */
  googleQuery: string;
  /** Query sent to Mapbox forward geocode fallback */
  mapboxQuery: string;
  /** Server may use Place Text Search with opennow=true */
  openNow: boolean;
  /** Google autocomplete / textsearch radius bias (meters) */
  tightRadiusM: number;
  /** Use bbox + tighter distance filter on Mapbox */
  tightLocal: boolean;
}

/**
 * @param raw - Raw search box text (what the user sees).
 */
export function normalizePlacesSearchQuery(raw: string): NormalizedPlacesSearch {
  const original = raw.trim();
  let q = original;
  let openNow = false;
  if (OPEN_NOW_RE.test(q)) {
    openNow = true;
    q = q.replace(OPEN_NOW_RE, ' ');
  }

  let tightRadiusM = 20_000;
  let tightLocal = false;
  if (NEAR_ME_RE.test(q) || CLOSEST_RE.test(q)) {
    tightLocal = true;
    tightRadiusM = 12_000;
    q = q.replace(NEAR_ME_RE, ' ').replace(CLOSEST_RE, ' ');
  }
  // "nearby Kroger" / "coffee nearby" → tighten bias, strip filler
  if (/\bnearby\s+/i.test(q) || /\s+nearby\b/i.test(q)) {
    tightLocal = true;
    tightRadiusM = Math.min(tightRadiusM, 12_000);
    q = q.replace(/\bnearby\s+/gi, ' ').replace(/\s+nearby\b/gi, ' ');
  }

  const lower = q.toLowerCase();
  // "nearby gas" / "gas near me" → searchable POI text
  if (/\bnearby\s+gas\b|\bgas\s+near\b|\bgas\s+near\s+me\b/.test(lower)) {
    q = q.replace(/\bnearby\s+gas\b/gi, 'gas station').replace(/\bgas\s+near(\s+me)?\b/gi, 'gas station');
  }
  if (/\bnearby\s+coffee\b|\bcoffee\s+near\b|\bcoffee\s+near\s+me\b/.test(lower)) {
    q = q.replace(/\bnearby\s+coffee\b/gi, 'coffee shop').replace(/\bcoffee\s+near(\s+me)?\b/gi, 'coffee shop');
  }

  q = collapseSpace(q);
  const googleQuery = q.length >= 2 ? q : original;
  const mapboxQuery = q.length >= 2 ? q : original;

  return {
    googleQuery,
    mapboxQuery,
    openNow,
    tightRadiusM,
    tightLocal,
  };
}
