import Constants from 'expo-constants';

/**
 * Mapbox public token for Directions/Geocoding and @rnmapbox/maps.
 * Resolve at call time (not module load) so dev client manifest + Metro-inlined env are available.
 */
export function getMapboxPublicToken(): string {
  const fromMetro = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  if (typeof fromMetro === 'string' && fromMetro.trim().length > 0) {
    return fromMetro.trim();
  }

  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExtra = extra?.mapboxPublicToken;
  if (typeof fromExtra === 'string' && fromExtra.trim().length > 0) {
    return fromExtra.trim();
  }

  const manifest = Constants.manifest as { extra?: Record<string, unknown> } | null;
  const fromManifest = manifest?.extra?.mapboxPublicToken;
  if (typeof fromManifest === 'string' && fromManifest.trim().length > 0) {
    return fromManifest.trim();
  }

  return '';
}

export function isMapboxPublicTokenConfigured(): boolean {
  const t = getMapboxPublicToken();
  return t.length >= 12;
}
