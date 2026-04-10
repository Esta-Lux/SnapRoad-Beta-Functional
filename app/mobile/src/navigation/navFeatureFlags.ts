/**
 * EXPO_PUBLIC_* vars are inlined at bundle time. Defaults favor safe rollout (off).
 */
function envBool(key: string, defaultVal: boolean): boolean {
  const v = process.env[key];
  if (v === '1' || v === 'true') return true;
  if (v === '0' || v === 'false') return false;
  return defaultVal;
}

export function navRefreshV2Enabled(): boolean {
  return envBool('EXPO_PUBLIC_NAV_REFRESH_V2', false);
}

export function navEdgeEtaEnabled(): boolean {
  return envBool('EXPO_PUBLIC_NAV_EDGE_ETA', false);
}

export function navEtaBlendEnabled(): boolean {
  return envBool('EXPO_PUBLIC_NAV_ETA_BLEND', false);
}

export function navServerEtaEnabled(): boolean {
  return envBool('EXPO_PUBLIC_NAV_SERVER_ETA', false);
}

/** When on, "Start Navigation" launches the native Mapbox Navigation SDK UI
 *  instead of the custom RN turn-by-turn flow. Requires an EAS dev client build. */
export function navNativeSdkEnabled(): boolean {
  return envBool('EXPO_PUBLIC_NAV_NATIVE_SDK', false);
}

/**
 * Hybrid mode: Navigation SDK runs trip session + voice headless; UI stays on `@rnmapbox/maps`.
 * When both this and {@link navNativeSdkEnabled} are true, hybrid wins — MapMain is not replaced
 * by the full-screen native navigator.
 */
export function navLogicSdkEnabled(): boolean {
  return envBool('EXPO_PUBLIC_NAV_LOGIC_SDK', false);
}

/** Full-screen `NativeNavigationScreen` — only when legacy native flag is on and hybrid is off. */
export function navNativeFullScreenEnabled(): boolean {
  return navNativeSdkEnabled() && !navLogicSdkEnabled();
}
