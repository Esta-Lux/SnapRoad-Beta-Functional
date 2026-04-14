import Constants from 'expo-constants';

/**
 * EXPO_PUBLIC_* vars are inlined at bundle time. Most flags default off; logic SDK defaults on
 * (see {@link navLogicSdkEnabled}).
 */
function envBool(key: string, defaultVal: boolean): boolean {
  const v = process.env[key];
  if (v === '1' || v === 'true') return true;
  if (v === '0' || v === 'false') return false;
  return defaultVal;
}

function nativeNavigationSupportedBuild(): boolean {
  const expoGoConfig =
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig;
  const executionEnvironment = String(
    (Constants as unknown as { executionEnvironment?: string }).executionEnvironment ?? '',
  ).toLowerCase();
  return !expoGoConfig && executionEnvironment !== 'storeclient';
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
  return envBool('EXPO_PUBLIC_NAV_NATIVE_SDK', nativeNavigationSupportedBuild());
}

/**
 * Hybrid mode: Navigation SDK runs trip session + voice headless; UI stays on `@rnmapbox/maps`.
 * When both this and {@link navNativeSdkEnabled} are true, hybrid wins — MapMain is not replaced
 * by the full-screen native navigator.
 *
 * **Default on:** matched location, reroute, progress, and native TTS come from the Navigation SDK
 * during trips (single authority). Set `EXPO_PUBLIC_NAV_LOGIC_SDK=0` for JS-only Directions +
 * `useNavigationProgress` (e.g. Expo Go / experiments). Requires a **dev client** build with native
 * Mapbox Navigation, not Expo Go.
 */
export function navLogicSdkEnabled(): boolean {
  return envBool('EXPO_PUBLIC_NAV_LOGIC_SDK', true);
}

/** Full-screen `NativeNavigationScreen` — default path on supported native builds. */
export function navNativeFullScreenEnabled(): boolean {
  return navNativeSdkEnabled();
}

/** Release-safe nav diagnostics overlay (HUD) — set `EXPO_PUBLIC_NAV_LOGIC_DEBUG=1` in EAS env and rebuild. */
export function navLogicDebugEnabled(): boolean {
  return envBool('EXPO_PUBLIC_NAV_LOGIC_DEBUG', false);
}

/** Lane UI + lane phrases in TTS — default off (set EXPO_PUBLIC_NAV_LANE_UI=1 to enable). */
export function navLaneGuidanceUiEnabled(): boolean {
  return envBool('EXPO_PUBLIC_NAV_LANE_UI', false);
}
