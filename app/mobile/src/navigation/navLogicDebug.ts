import {
  navLogicSdkEnabled,
  navNativeFullScreenEnabled,
  navNativeSdkEnabled,
} from './navFeatureFlags';

let lastLogMs = 0;

/**
 * __DEV__ only, throttled. Logs nav flag snapshot + logic mode selection.
 * Set `EXPO_PUBLIC_NAV_LOGIC_DEBUG=1` in .env to enable (requires Metro restart).
 */
export function logNavLogicSnapshot(reason: string, extra?: Record<string, unknown>) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  const v = process.env.EXPO_PUBLIC_NAV_LOGIC_DEBUG;
  if (v !== '1' && v !== 'true') return;
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
