/**
 * EXPO_PUBLIC_* vars are inlined at bundle time. Most flags default off. The launch-default
 * navigation engine is the JS/RNMapbox pipeline; native/headless SDK modes are opt-in.
 *
 * Do **not** statically import `expo-constants`: it resolves to a path that pulls `react-native`
 * into the module graph, which breaks Node/tsx unit tests (`esbuild` cannot transform RN).
 * Lazy-require inside {@link nativeNavigationSupportedBuild} only; callers of other exports
 * never load Expo in the test runner.
 */
type NavEnvKey =
  | 'EXPO_PUBLIC_NAV_REFRESH_V2'
  | 'EXPO_PUBLIC_NAV_EDGE_ETA'
  | 'EXPO_PUBLIC_NAV_ETA_BLEND'
  | 'EXPO_PUBLIC_NAV_SERVER_ETA'
  | 'EXPO_PUBLIC_NAV_NATIVE_SDK'
  | 'EXPO_PUBLIC_NAV_LOGIC_SDK'
  | 'EXPO_PUBLIC_NAV_FULLSCREEN_NATIVE'
  | 'EXPO_PUBLIC_NAV_LOGIC_DEBUG'
  | 'EXPO_PUBLIC_NAV_LANE_UI';

function envValue(key: NavEnvKey): string | undefined {
  switch (key) {
    case 'EXPO_PUBLIC_NAV_REFRESH_V2':
      return process.env.EXPO_PUBLIC_NAV_REFRESH_V2;
    case 'EXPO_PUBLIC_NAV_EDGE_ETA':
      return process.env.EXPO_PUBLIC_NAV_EDGE_ETA;
    case 'EXPO_PUBLIC_NAV_ETA_BLEND':
      return process.env.EXPO_PUBLIC_NAV_ETA_BLEND;
    case 'EXPO_PUBLIC_NAV_SERVER_ETA':
      return process.env.EXPO_PUBLIC_NAV_SERVER_ETA;
    case 'EXPO_PUBLIC_NAV_NATIVE_SDK':
      return process.env.EXPO_PUBLIC_NAV_NATIVE_SDK;
    case 'EXPO_PUBLIC_NAV_LOGIC_SDK':
      return process.env.EXPO_PUBLIC_NAV_LOGIC_SDK;
    case 'EXPO_PUBLIC_NAV_FULLSCREEN_NATIVE':
      return process.env.EXPO_PUBLIC_NAV_FULLSCREEN_NATIVE;
    case 'EXPO_PUBLIC_NAV_LOGIC_DEBUG':
      return process.env.EXPO_PUBLIC_NAV_LOGIC_DEBUG;
    case 'EXPO_PUBLIC_NAV_LANE_UI':
      return process.env.EXPO_PUBLIC_NAV_LANE_UI;
    default:
      return undefined;
  }
}

function envBool(key: NavEnvKey, defaultVal: boolean): boolean {
  const v = envValue(key);
  if (v === '1' || v === 'true') return true;
  if (v === '0' || v === 'false') return false;
  return defaultVal;
}

function nativeNavigationSupportedBuild(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default as {
      expoGoConfig?: { debuggerHost?: string };
      executionEnvironment?: string;
    };
    const expoGoConfig = Constants.expoGoConfig;
    const executionEnvironment = String(Constants.executionEnvironment ?? '').toLowerCase();
    return !expoGoConfig && executionEnvironment !== 'storeclient';
  } catch {
    // Node / tsx tests: no Expo module — env flags alone decide; treat as dev-client capable.
    return true;
  }
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

/** When on, native Mapbox Navigation SDK paths are available for internal experiments.
 *  Launch default is off so JS/RNMapbox owns navigation unless explicitly enabled. */
export function navNativeSdkEnabled(): boolean {
  return envBool('EXPO_PUBLIC_NAV_NATIVE_SDK', false) && nativeNavigationSupportedBuild();
}

/**
 * Hybrid mode: Navigation SDK runs trip session + voice headless; UI stays on `@rnmapbox/maps`.
 * When full-screen native navigation is launched, `MapMain` is replaced and this headless mode no
 * longer owns the visible turn-by-turn UI.
 *
 * **Default off for launch:** JS Directions + `useNavigationProgress` own routing, puck,
 * reroute, progress, and voice. Set `EXPO_PUBLIC_NAV_LOGIC_SDK=1` only for internal
 * native/headless SDK experiments. Requires a **dev client** build with native Mapbox Navigation,
 * not Expo Go.
 *
 * Turn-by-turn **card** copy on the RN map: when `NavigationProgress.instructionSource === 'sdk'`,
 * `MapScreen` + `TurnInstructionCard` with `navSdkDrivesContent`: native banner, NavStep, lanes,
 * shields, distance meters → imperial formatting only; no REST / merged DirectionsStep or
 * `NAV_LANE_UI` full JS lane row on SDK trips. JS pipeline remains `instructionSource === 'js'`.
 */
export function navLogicSdkEnabled(): boolean {
  return envBool('EXPO_PUBLIC_NAV_LOGIC_SDK', false);
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
 * Set `EXPO_PUBLIC_NAV_FULLSCREEN_NATIVE=0` to keep the hybrid RN map + headless SDK.
 *
 * **Default off:** headless Navigation SDK + branded JS map (route, puck, turn card,
 * camera). Set `EXPO_PUBLIC_NAV_FULLSCREEN_NATIVE=1` for full-screen native Mapbox UI.
 */
export function navNativeFullScreenEnabled(): boolean {
  if (!navNativeSdkEnabled()) return false;
  return envBool('EXPO_PUBLIC_NAV_FULLSCREEN_NATIVE', false);
}

/** Release-safe nav diagnostics overlay (HUD) — set `EXPO_PUBLIC_NAV_LOGIC_DEBUG=1` in EAS env and rebuild. */
export function navLogicDebugEnabled(): boolean {
  return envBool('EXPO_PUBLIC_NAV_LOGIC_DEBUG', false);
}

/**
 * Full lane UI (REST/SVG + TTS lane phrases). When false, the turn card shows a lane
 * row only if the native SDK supplies a full bitmap strip (`nativeLaneAssets`); otherwise
 * the row is hidden for a clean HUD.
 */
export function navLaneGuidanceUiEnabled(): boolean {
  return envBool('EXPO_PUBLIC_NAV_LANE_UI', false);
}
