import Constants from 'expo-constants';

function pickToken(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

/**
 * Mapbox public token for Directions/Geocoding and @rnmapbox/maps.
 *
 * Always prefer Metro-inlined `process.env.EXPO_PUBLIC_*` first (EAS/babel embeds at bundle time).
 * Fall back to `Constants.expoConfig.extra` / legacy manifests after that.
 *
 * Why env first on iOS TestFlight / release: with `expo-updates`, embedded or cached manifests can
 * omit or carry a stale `extra` while the JS bundle still has the correct inlined token — if we
 * preferred `extra` first, a bad or empty embedded value could block the good inlined one.
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
    fromMetro
    ?? fromAlias
    ?? fromFallbackMetro
    ?? fromFallbackAlias
    ?? fromExpoConfig
    ?? fromLegacyManifest
    ?? fromManifest2
    ?? ''
  );
}

export function isMapboxPublicTokenConfigured(): boolean {
  const t = getMapboxPublicToken();
  /** pk.* tokens are typically 100+ chars; keep a low floor for tests. */
  return t.length >= 12;
}
