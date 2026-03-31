/**
 * Traffic safety layer (speed camera POIs) — regional gating for policy / store alignment.
 * Country codes from Intl; US subdivisions use coarse GPS heuristics when country is US.
 */

const RESTRICTED_COUNTRIES = new Set(['FR', 'CH', 'DE']);

function inVirginiaRough(lat: number, lng: number): boolean {
  return lat >= 36.45 && lat <= 39.55 && lng <= -75.0 && lng >= -83.95;
}

function inDistrictOfColumbiaRough(lat: number, lng: number): boolean {
  return lat >= 38.75 && lat <= 39.05 && lng >= -77.25 && lng <= -76.85;
}

/** Region string for API query (e.g. US-VA, DC, FR). */
export function trafficSafetyRegionQuery(lat: number, lng: number): string {
  let iso = '';
  try {
    const ro = Intl.DateTimeFormat().resolvedOptions() as { region?: string };
    iso = (ro.region || '').toUpperCase();
  } catch {
    iso = '';
  }
  if (iso === 'US') {
    if (inVirginiaRough(lat, lng)) return 'US-VA';
    if (inDistrictOfColumbiaRough(lat, lng)) return 'DC';
  }
  return iso;
}

export function isTrafficSafetyLayerRestricted(lat: number, lng: number): boolean {
  const q = trafficSafetyRegionQuery(lat, lng);
  if (RESTRICTED_COUNTRIES.has(q)) return true;
  if (q === 'US-VA' || q === 'DC') return true;
  return false;
}

export function isTrafficSafetyLayerEnabled(lat: number, lng: number): boolean {
  return !isTrafficSafetyLayerRestricted(lat, lng);
}
