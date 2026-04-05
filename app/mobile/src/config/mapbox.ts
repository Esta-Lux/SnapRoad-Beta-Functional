/**
 * Single source of truth for Mapbox public (pk.) token resolution.
 *
 * Canonical env name (EAS, .env, Metro): EXPO_PUBLIC_MAPBOX_TOKEN only.
 * Do not read Mapbox env vars elsewhere — import from this module.
 *
 * Resolution order (important for expo-updates / OTA):
 * 1) process.env.EXPO_PUBLIC_MAPBOX_TOKEN — inlined when the **JS bundle** is produced
 *    (`expo start`, `eas build`, `eas update`). Empty/missing falls through.
 * 2) Constants.expoConfig.extra.mapboxPublicToken — baked at **native** `eas build` time.
 * 3) Legacy manifest shapes (older Expo runtime).
 *
 * OTA / native mismatch: A store binary built with a token in `extra` but an OTA bundle
 * built **with** EXPO_PUBLIC_MAPBOX_TOKEN set will use the OTA-inlined value (1) first.
 * An OTA built **without** that env var will still see (2) from the original binary. If both
 * are empty, the map cannot authenticate — that is a build/update configuration issue, not
 * a Mapbox outage.
 */
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

const CANONICAL_ENV_KEY = 'EXPO_PUBLIC_MAPBOX_TOKEN';

export type MapboxTokenSource =
  | 'expo_public_env'
  | 'expo_config_extra'
  | 'legacy_manifest'
  | 'manifest2'
  | 'none';

function pickToken(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

/** Looks like a Mapbox public token; avoids treating random short strings as "configured". */
export function isPlausibleMapboxPublicToken(value: string): boolean {
  const t = value.trim();
  return t.startsWith('pk.') && t.length >= 20;
}

export function getMapboxTokenPublicPrefix(token: string, visibleChars = 6): string {
  const t = token.trim();
  if (!t) return '(empty)';
  const slice = t.slice(0, Math.min(visibleChars, t.length));
  return `${slice}… (${t.length} chars)`;
}

export interface MapboxTokenResolution {
  token: string;
  source: MapboxTokenSource;
}

let _diagLogged = false;

/**
 * Safe diagnostics: presence, winning source, token length and prefix only — never full secret.
 * In production release builds we log only once and only when the token is missing/invalid, or when
 * EXPO_PUBLIC_DEBUG_MAPBOX=1. __DEV__ always logs (each call site may run).
 */
export function logMapboxAccessDiagnostics(context: string): void {
  const verbose =
    (typeof __DEV__ !== 'undefined' && __DEV__) ||
    String(process.env.EXPO_PUBLIC_DEBUG_MAPBOX || '').trim() === '1';

  const { token, source } = resolveMapboxPublicToken();
  const present = isPlausibleMapboxPublicToken(token);

  if (!verbose && present) {
    return;
  }
  if (!verbose && _diagLogged) {
    return;
  }
  _diagLogged = true;

  const envRaw = process.env[CANONICAL_ENV_KEY];
  const envSet = typeof envRaw === 'string' && envRaw.trim().length > 0;
  const extraRoot = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const extraTok = pickToken(extraRoot?.mapboxPublicToken);

  // eslint-disable-next-line no-console
  console.log(
    `[Mapbox config] ${context}: configured=${present} source=${source} ` +
      `env.${CANONICAL_ENV_KEY}=${envSet ? 'set' : 'unset'} ` +
      `extra.mapboxPublicToken=${extraTok ? 'set' : 'unset'} ` +
      `prefix=${getMapboxTokenPublicPrefix(token)}`,
  );
}

let _startupLogged = false;

/** One-line startup probe (safe for production): reports token presence + winning source only, never token bytes. */
export function logMapboxStartupSourceOnce(context: string): void {
  if (_startupLogged) return;
  _startupLogged = true;
  const { token, source } = resolveMapboxPublicToken();
  const configured = isPlausibleMapboxPublicToken(token);
  // eslint-disable-next-line no-console
  console.log(`[Mapbox startup] ${context}: configured=${configured} source=${source}`);
}

export function resolveMapboxPublicToken(): MapboxTokenResolution {
  const fromMetro = pickToken(process.env[CANONICAL_ENV_KEY]);
  if (fromMetro) {
    return { token: fromMetro, source: 'expo_public_env' };
  }

  const extraRoot = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExpoConfig = pickToken(extraRoot?.mapboxPublicToken);
  if (fromExpoConfig) {
    return { token: fromExpoConfig, source: 'expo_config_extra' };
  }

  const manifest = Constants.manifest as { extra?: Record<string, unknown> } | null;
  const fromLegacyManifest = pickToken(manifest?.extra?.mapboxPublicToken);
  if (fromLegacyManifest) {
    return { token: fromLegacyManifest, source: 'legacy_manifest' };
  }

  const m2 = Constants.manifest2 as
    | { extra?: { expoClient?: { extra?: Record<string, unknown> } } }
    | null;
  const fromManifest2 = pickToken(m2?.extra?.expoClient?.extra?.mapboxPublicToken);
  if (fromManifest2) {
    return { token: fromManifest2, source: 'manifest2' };
  }

  return { token: '', source: 'none' };
}

/** Token string for Mapbox APIs and @rnmapbox/maps.setAccessToken */
export function getMapboxPublicToken(): string {
  return resolveMapboxPublicToken().token;
}

export function isMapboxPublicTokenConfigured(): boolean {
  return isPlausibleMapboxPublicToken(getMapboxPublicToken());
}

// #region agent log
/**
 * Debug ingest: Mapbox resolution + expo-updates context (OTA vs embedded). No secrets — lengths/prefix only.
 */
export function emitAgentMapboxOtaSnapshot(params: {
  hypothesisId?: string;
  hasNativeMapbox: boolean;
  mapboxTokenOk: boolean;
  mapOk: boolean;
  runId?: string;
}): void {
  const res = resolveMapboxPublicToken();
  const extraRoot = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const extraTok = pickToken(extraRoot?.mapboxPublicToken);
  const envRaw = process.env[CANONICAL_ENV_KEY];
  const um = Updates.manifest as { extra?: Record<string, unknown> } | undefined;
  const updateExtraTok = pickToken(um?.extra?.mapboxPublicToken as unknown);
  const data = {
    ...params,
    tokenSource: res.source,
    tokenPlausible: isPlausibleMapboxPublicToken(res.token),
    tokenLength: res.token.length,
    tokenPrefix: getMapboxTokenPublicPrefix(res.token, 4),
    envJsType: typeof envRaw,
    envJsLength: typeof envRaw === 'string' ? envRaw.trim().length : 0,
    expoConfigExtraHasKey: Boolean(extraRoot && 'mapboxPublicToken' in extraRoot),
    extraResolvedLength: extraTok ? extraTok.length : 0,
    extraResolvedPlausible: extraTok ? isPlausibleMapboxPublicToken(extraTok) : false,
    updatesIsEnabled: Updates.isEnabled,
    updatesChannel: Updates.channel,
    updatesRuntimeVersion: Updates.runtimeVersion,
    updatesUpdateId: Updates.updateId,
    updatesIsEmbeddedLaunch: Updates.isEmbeddedLaunch,
    updatesIsEmergencyLaunch: Updates.isEmergencyLaunch,
    updatesManifestExtraHasMapboxKey: Boolean(um?.extra && 'mapboxPublicToken' in um.extra),
    updatesManifestExtraLen: updateExtraTok ? updateExtraTok.length : 0,
    updatesManifestExtraPlausible: updateExtraTok ? isPlausibleMapboxPublicToken(updateExtraTok) : false,
    manifest2ClientExtraLen: (() => {
      const m2 = Constants.manifest2 as
        | { extra?: { expoClient?: { extra?: Record<string, unknown> } } }
        | null;
      const t = pickToken(m2?.extra?.expoClient?.extra?.mapboxPublicToken);
      return t ? t.length : 0;
    })(),
  };
  fetch('http://127.0.0.1:7534/ingest/128fa84f-5250-402d-aabb-51e02305d807', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7cb207' },
    body: JSON.stringify({
      sessionId: '7cb207',
      location: 'mapbox.ts:emitAgentMapboxOtaSnapshot',
      message: 'Mapbox + Updates snapshot',
      hypothesisId: params.hypothesisId ?? 'H-OTA-MAPBOX',
      data,
      timestamp: Date.now(),
      runId: params.runId ?? 'pre-fix',
    }),
  }).catch(() => {});
}
// #endregion
