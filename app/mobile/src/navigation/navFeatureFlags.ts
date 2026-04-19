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
 * When full-screen native navigation is launched, `MapMain` is replaced and this headless mode no
 * longer owns the visible turn-by-turn UI.
 *
 * **Default on:** matched location, reroute, progress, and native TTS come from the Navigation SDK
 * during trips (single authority). Set `EXPO_PUBLIC_NAV_LOGIC_SDK=0` for JS-only Directions +
 * `useNavigationProgress` (e.g. Expo Go / experiments). Requires a **dev client** build with native
 * Mapbox Navigation, not Expo Go.
 */
export function navLogicSdkEnabled(): boolean {
  return envBool('EXPO_PUBLIC_NAV_LOGIC_SDK', true);
}

/**
 * Full-screen `NativeNavigationScreen` — **opt-in** path.
 *
 * Default is **off**: SnapRoad keeps its branded `@rnmapbox/maps` presentation during
 * navigation (route polyline, puck, stat strip, turn card, camera markers) while the
 * headless Navigation SDK ({@link navLogicSdkEnabled}) drives all of the logic —
 * matched location, route geometry, reroute, progress, maneuver banners, voice. This
 * single-authority hybrid avoids two parallel nav sessions competing on GPS/routing
 * (see `docs/NATIVE_NAVIGATION.md`).
 *
 * Set `EXPO_PUBLIC_NAV_FULLSCREEN_NATIVE=1` to switch to the full-screen Mapbox UI.
 * Requires a dev-client build (same platform gate as {@link navNativeSdkEnabled}).
 */
export function navNativeFullScreenEnabled(): boolean {
  if (!navNativeSdkEnabled()) return false;
  return envBool('EXPO_PUBLIC_NAV_FULLSCREEN_NATIVE', false);
}

/** Release-safe nav diagnostics overlay (HUD) — set `EXPO_PUBLIC_NAV_LOGIC_DEBUG=1` in EAS env and rebuild. */
export function navLogicDebugEnabled(): boolean {
  return envBool('EXPO_PUBLIC_NAV_LOGIC_DEBUG', false);
}

/** Lane UI + lane phrases in TTS — default off (set EXPO_PUBLIC_NAV_LANE_UI=1 to enable). */
export function navLaneGuidanceUiEnabled(): boolean {
  return envBool('EXPO_PUBLIC_NAV_LANE_UI', false);
}
