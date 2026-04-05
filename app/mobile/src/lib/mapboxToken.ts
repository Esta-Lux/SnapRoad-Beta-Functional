import Constants from 'expo-constants';

function pickToken(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

/**
 * Mapbox public token for Directions/Geocoding and @rnmapbox/maps.
 * Prefer manifest `extra` (baked at EAS prebuild) over Metro `process.env`, since some builds
 * embed `extra.mapboxPublicToken` reliably while inlined EXPO_PUBLIC_* can be empty if env
 * was not linked to the build profile's EAS environment.
 */
export function getMapboxPublicToken(): string {
  const extraRoot = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExpoConfig = pickToken(extraRoot?.mapboxPublicToken);

  const manifest = Constants.manifest as { extra?: Record<string, unknown> } | null;
  const fromLegacyManifest = pickToken(manifest?.extra?.mapboxPublicToken);

  const m2 = Constants.manifest2 as
    | { extra?: { expoClient?: { extra?: Record<string, unknown> } } }
    | null;
  const fromManifest2 = pickToken(m2?.extra?.expoClient?.extra?.mapboxPublicToken);

  const fromMetro = pickToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN);
  const fromAlias = pickToken(process.env.MAPBOX_PUBLIC_TOKEN);
  const fromFallbackMetro = pickToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN_FALLBACK);
  const fromFallbackAlias = pickToken(process.env.MAPBOX_PUBLIC_TOKEN_FALLBACK);

  return (
    fromExpoConfig
    ?? fromLegacyManifest
    ?? fromManifest2
    ?? fromMetro
    ?? fromAlias
    ?? fromFallbackMetro
    ?? fromFallbackAlias
    ?? ''
  );
}

export function isMapboxPublicTokenConfigured(): boolean {
  const t = getMapboxPublicToken();
  /** pk.* tokens are typically 100+ chars; keep a low floor for tests. */
  return t.length >= 12;
}
