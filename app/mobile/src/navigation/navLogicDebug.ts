import {
  navLogicDebugEnabled,
  navLogicSdkEnabled,
  navNativeFullScreenEnabled,
  navNativeSdkEnabled,
} from './navFeatureFlags';

let lastLogMs = 0;

/**
 * Throttled console snapshot when `EXPO_PUBLIC_NAV_LOGIC_DEBUG=1` (release EAS or local Metro).
 */
export function logNavLogicSnapshot(reason: string, extra?: Record<string, unknown>) {
  if (!navLogicDebugEnabled()) return;
  const now = Date.now();
  if (now - lastLogMs < 1200 && reason !== 'mount') return;
  lastLogMs = now;
  const flags = {
    EXPO_PUBLIC_NAV_LOGIC_SDK: process.env.EXPO_PUBLIC_NAV_LOGIC_SDK,
    EXPO_PUBLIC_NAV_NATIVE_SDK: process.env.EXPO_PUBLIC_NAV_NATIVE_SDK,
    navLogicSdkEnabled: navLogicSdkEnabled(),
    navNativeSdkEnabled: navNativeSdkEnabled(),
    navNativeFullScreenEnabled: navNativeFullScreenEnabled(),
  };
  // eslint-disable-next-line no-console
  console.log('[NavLogicDebug]', reason, flags, extra ?? {});
}

/**
 * Per-category throttle for the verification NDJSON logger. Keyed by the
 * `channel` argument so bearing, projection, render, and provider emit
 * independently without drowning each other out.
 */
const lastVerifyLogByChannel: Record<string, number> = {};
const VERIFY_THROTTLE_MS: Record<string, number> = {
  bearing: 750,
  projection: 750,
  'render.polyline': 1500,
  'provider.mount': 1500,
  'reroute.handoff': 0,
};

/**
 * NDJSON-style single-line log for runtime verification of the navigation
 * plan (camera heading, polyline authority, projection hysteresis, reroute
 * handoff). Gated on the same `EXPO_PUBLIC_NAV_LOGIC_DEBUG=1` flag used for
 * `logNavLogicSnapshot` so no cost in production. Emit one `[NavVerify]`
 * line per event; readers can `grep '^\[NavVerify\]' | cut -d' ' -f2- | jq`
 * to get structured JSON. Throttled per-channel to keep the log usable
 * during a real trip.
 */
export function logNavVerify(
  channel:
    | 'bearing'
    | 'projection'
    | 'render.polyline'
    | 'provider.mount'
    | 'reroute.handoff',
  payload: Record<string, unknown>,
): void {
  if (!navLogicDebugEnabled()) return;
  const now = Date.now();
  const throttle = VERIFY_THROTTLE_MS[channel] ?? 1000;
  const last = lastVerifyLogByChannel[channel] ?? 0;
  if (throttle > 0 && now - last < throttle) return;
  lastVerifyLogByChannel[channel] = now;
  const line = JSON.stringify({ ts: now, channel, ...payload });
  // eslint-disable-next-line no-console
  console.log('[NavVerify]', line);
}
