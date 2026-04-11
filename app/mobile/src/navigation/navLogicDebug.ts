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
