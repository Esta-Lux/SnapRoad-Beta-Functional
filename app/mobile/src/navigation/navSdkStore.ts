import {
  nativeFormattedDistanceFromProgressPayload,
  type SdkNavProgressEvent,
  type SdkNavProgressLane,
  type SdkNavProgressShield,
} from './sdkNavBridgePayload';
import type { NativeFormattedDistance, NativeLaneAsset, SdkCameraPayload } from './navSdkMirrorTypes';
import { isValidSdkCameraPayload } from './navSdkMirrorTypes';
import type { Coordinate } from '../types';
import type { DirectionsStep } from '../lib/directions';
import type { NavigationProgress } from './navModel';
import {
  buildNavigationProgressFromSdk,
  buildSdkWaitingNavigationProgress,
  resetHeadingSmoothing,
} from './navSdkProgressAdapter';
import { buildMinimalNavigationProgressFromSdk } from './navSdkMinimalAdapter';

export type SdkGuidancePhase = 'idle' | 'waiting' | 'active';

export type SdkTelemetrySnapshot = {
  startedAtMs: number;
  progressEvents: number;
  locationEvents: number;
  voiceEvents: number;
  /** Native `onRouteChanged` (reroute / refresh) — should increment during SDK trips. */
  routeChangedEvents: number;
};

/** Aliases for `SdkNavProgress*` — single contract with `src/types/expo-mapbox-navigation.d.ts` + native bridges. */
export type SdkLanePayload = SdkNavProgressLane;
export type SdkShieldPayload = SdkNavProgressShield;
export type SdkProgressPayload = SdkNavProgressEvent;

export type SdkLocationPayload = {
  latitude: number;
  longitude: number;
  course: number;
  speed: number;
  horizontalAccuracy: number;
  timestamp: number;
  speedLimitMps?: number;
};

type NavSdkState = {
  progress: SdkProgressPayload | null;
  location: SdkLocationPayload | null;
  routePolyline: Coordinate[];
  /** Last native navigation camera viewport (mirror RN `setCamera` when valid). */
  nativeCameraState: SdkCameraPayload | null;
  /** Locale-aware distance from native (replaces JS formatting when present). */
  nativeFormattedDistance: NativeFormattedDistance | null;
  /** Per-lane PNGs from native (parallel to `progress.lanes` when lengths match). */
  nativeLaneAssets: NativeLaneAsset[] | null;
  /** Last native voice instruction text (SDK TTS only — for HUD / subtitle). */
  lastVoiceInstructionText: string | null;
  /** Wall-clock ms when the last native voice subtitle was ingested (0 if never). Used by
   *  `advisory` speak path to avoid JS TTS stepping on a native turn cue that just played. */
  lastVoiceInstructionAtMs: number;
  /** Which pipeline last produced a navigation voice line (HUD). */
  lastNavVoiceSource: 'sdk' | 'js' | 'none';
  lastProgressIngestAtMs: number;
  sdkGuidancePhase: SdkGuidancePhase;
  telemetry: SdkTelemetrySnapshot;
};

const initial: NavSdkState = {
  progress: null,
  location: null,
  routePolyline: [],
  nativeCameraState: null,
  nativeFormattedDistance: null,
  nativeLaneAssets: null,
  lastVoiceInstructionText: null,
  lastVoiceInstructionAtMs: 0,
  lastNavVoiceSource: 'none',
  lastProgressIngestAtMs: 0,
  sdkGuidancePhase: 'idle',
  telemetry: {
    startedAtMs: 0,
    progressEvents: 0,
    locationEvents: 0,
    voiceEvents: 0,
    routeChangedEvents: 0,
  },
};

let state: NavSdkState = initial;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getNavSdkState(): NavSdkState {
  return state;
}

export function subscribeNavSdk(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetNavSdkState() {
  state = {
    progress: null,
    location: null,
    routePolyline: [],
    nativeCameraState: null,
    nativeFormattedDistance: null,
    nativeLaneAssets: null,
    lastVoiceInstructionText: null,
    lastVoiceInstructionAtMs: 0,
    lastNavVoiceSource: 'none',
    lastProgressIngestAtMs: 0,
    sdkGuidancePhase: 'idle',
    telemetry: {
      startedAtMs: 0,
      progressEvents: 0,
      locationEvents: 0,
      voiceEvents: 0,
      routeChangedEvents: 0,
    },
  };
  // Module-level EWMA in the adapter must reset across trips so the first
  // heading tick of a new trip isn't pulled toward the last trip's bearing.
  resetHeadingSmoothing();
  emit();
}

/**
 * Never carry `prev` across a leg/step change — that kept the last maneuver’s distance on the
 * card after the SDK advanced, and alternated with fresh `banner` strings (jitter).
 */
function pickNativeFormattedFromProgress(
  p: SdkProgressPayload,
  prev: NativeFormattedDistance | null,
  prevProgress: SdkProgressPayload | null,
): NativeFormattedDistance | null {
  const fromP = nativeFormattedDistanceFromProgressPayload(p);
  if (fromP) return fromP;
  const si = p.stepIndex ?? 0;
  const sj = prevProgress?.stepIndex ?? -1;
  const li = p.legIndex ?? 0;
  const lj = prevProgress?.legIndex ?? 0;
  const sameStep = si === sj && li === lj;
  if (!sameStep) return null;
  return prev;
}

/** True when the last ingested native camera payload has a finite center + zoom/pitch/bearing. */
export function hasNativeCameraState(): boolean {
  return isValidSdkCameraPayload(state.nativeCameraState);
}

export function hasNativeFormattedDistance(): boolean {
  return !!state.nativeFormattedDistance?.value?.trim();
}

export function hasNativeLaneAssets(): boolean {
  return Array.isArray(state.nativeLaneAssets) && state.nativeLaneAssets.length > 0;
}

/** Call when user starts headless SDK navigation (after route preview → start). */
export function enterSdkGuidanceWaiting() {
  const now = Date.now();
  state = {
    ...state,
    sdkGuidancePhase: 'waiting',
    telemetry: {
      startedAtMs: now,
      progressEvents: 0,
      locationEvents: 0,
      voiceEvents: 0,
      routeChangedEvents: 0,
    },
    lastNavVoiceSource: 'none',
  };
  emit();
}

/** Native reroute / route refresh (`onRouteChanged`). */
export function ingestSdkRouteChangedEvent() {
  const tel = { ...state.telemetry, routeChangedEvents: state.telemetry.routeChangedEvents + 1 };
  state = { ...state, telemetry: tel, nativeFormattedDistance: null };
  emit();
}

export function ingestSdkProgress(p: SdkProgressPayload) {
  const tel = { ...state.telemetry, progressEvents: state.telemetry.progressEvents + 1 };
  const prevFmt = state.nativeFormattedDistance;
  const prevProgress = state.progress;
  state = {
    ...state,
    progress: p,
    lastProgressIngestAtMs: Date.now(),
    sdkGuidancePhase: 'active',
    telemetry: tel,
    nativeCameraState: p.cameraState ?? state.nativeCameraState,
    nativeFormattedDistance: pickNativeFormattedFromProgress(p, prevFmt, prevProgress),
    nativeLaneAssets: p.laneAssets ?? state.nativeLaneAssets,
  };
  emit();
}

/** Standalone native event (or call from a thin `onCameraStateChanged` bridge handler). */
export function ingestSdkCameraState(payload: SdkCameraPayload | null | undefined) {
  if (payload === null) {
    state = { ...state, nativeCameraState: null };
    emit();
    return;
  }
  if (!payload || !isValidSdkCameraPayload(payload)) return;
  state = { ...state, nativeCameraState: payload };
  emit();
}

export function ingestSdkFormattedDistance(value: string | undefined, unit?: string) {
  const v = value?.trim();
  if (!v) return;
  state = {
    ...state,
    nativeFormattedDistance: { value: v, unit: (unit ?? '').trim() },
  };
  emit();
}

export function ingestSdkLaneAssets(assets: NativeLaneAsset[] | null | undefined) {
  if (assets === null) {
    state = { ...state, nativeLaneAssets: null };
    emit();
    return;
  }
  if (!assets?.length) {
    state = { ...state, nativeLaneAssets: null };
    emit();
    return;
  }
  state = { ...state, nativeLaneAssets: assets };
  emit();
}

export function ingestSdkVoiceSubtitle(text: string | undefined) {
  const t = text?.trim() || null;
  const tel = { ...state.telemetry, voiceEvents: state.telemetry.voiceEvents + 1 };
  state = {
    ...state,
    lastVoiceInstructionText: t,
    lastVoiceInstructionAtMs: Date.now(),
    lastNavVoiceSource: 'sdk',
    telemetry: tel,
  };
  emit();
}

/** Milliseconds since the native SDK last spoke a voice instruction, or `Infinity` if never. */
export function msSinceLastSdkVoice(): number {
  const t = state.lastVoiceInstructionAtMs;
  return t > 0 ? Date.now() - t : Number.POSITIVE_INFINITY;
}

/** expo-speech navigation line (turn prompts, trip messages) — not SDK TTS. */
export function markNavVoiceFromJs() {
  state = { ...state, lastNavVoiceSource: 'js' };
  emit();
}

export function ingestSdkLocation(l: SdkLocationPayload) {
  const tel = { ...state.telemetry, locationEvents: state.telemetry.locationEvents + 1 };
  state = { ...state, location: l, telemetry: tel };
  emit();
}

export function ingestSdkRoutePolyline(poly: Coordinate[]) {
  state = { ...state, routePolyline: poly };
  emit();
}

/**
 * Native SDK is authoritative: matched location, banner text, `fractionTraveled`, step index.
 * No REST Directions merge, polyline projection, or heading smoothing.
 */
export function getMinimalSdkNavigationProgress(routePolyline: Coordinate[]): NavigationProgress | null {
  const st = state;
  if (!st.progress || routePolyline.length < 2) return null;
  return buildMinimalNavigationProgressFromSdk({
    progress: st.progress,
    location: st.location,
    routePolyline,
  });
}

/** Legacy full adapter (projection + REST merge). Kept for callers/tests that need the old path. */
export function getSdkNavigationProgress(
  navigationData: { polyline: Coordinate[]; steps: DirectionsStep[]; distance: number; duration: number } | null,
): NavigationProgress | null {
  const st = state;
  if (!st.progress) return null;
  const poly =
    st.routePolyline.length >= 2
      ? st.routePolyline
      : navigationData?.polyline?.length
        ? navigationData.polyline
        : [];
  if (poly.length < 2) return null;
  return buildNavigationProgressFromSdk({
    progress: st.progress,
    location: st.location,
    polyline: poly,
    steps: navigationData?.steps?.length ? navigationData.steps : [],
  });
}

/** Placeholder UI until the first native `onRouteProgressChanged` event. */
export function getSdkWaitingNavigationProgress(
  navigationData: { polyline: Coordinate[]; steps: DirectionsStep[]; distance: number; duration: number } | null,
): NavigationProgress | null {
  return buildSdkWaitingNavigationProgress(navigationData, state.routePolyline);
}

export function getSdkMatchedCoordinate(): Coordinate | null {
  if (!state.location) return null;
  return { lat: state.location.latitude, lng: state.location.longitude };
}
