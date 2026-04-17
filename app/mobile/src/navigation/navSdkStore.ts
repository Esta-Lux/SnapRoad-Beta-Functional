import type { Coordinate } from '../types';
import type { DirectionsStep } from '../lib/directions';
import type { NavigationProgress } from './navModel';
import { buildNavigationProgressFromSdk, buildSdkWaitingNavigationProgress } from './navSdkProgressAdapter';

export type SdkGuidancePhase = 'idle' | 'waiting' | 'active';

export type SdkTelemetrySnapshot = {
  startedAtMs: number;
  progressEvents: number;
  locationEvents: number;
  voiceEvents: number;
  /** Native `onRouteChanged` (reroute / refresh) — should increment during SDK trips. */
  routeChangedEvents: number;
};

export type SdkProgressPayload = {
  distanceRemaining: number;
  distanceTraveled: number;
  durationRemaining: number;
  fractionTraveled: number;
  legIndex?: number;
  stepIndex?: number;
  primaryInstruction?: string;
  secondaryInstruction?: string;
  maneuverType?: string;
  maneuverDirection?: string;
  distanceToNextManeuverMeters?: number;
  speedLimitMps?: number;
  thenInstruction?: string;
  currentStepInstruction?: string;
};

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
  /** Last native voice instruction text (SDK TTS only — for HUD / subtitle). */
  lastVoiceInstructionText: string | null;
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
  lastVoiceInstructionText: null,
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
    lastVoiceInstructionText: null,
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
  emit();
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
  state = { ...state, telemetry: tel };
  emit();
}

export function ingestSdkProgress(p: SdkProgressPayload) {
  const tel = { ...state.telemetry, progressEvents: state.telemetry.progressEvents + 1 };
  state = {
    ...state,
    progress: p,
    lastProgressIngestAtMs: Date.now(),
    sdkGuidancePhase: 'active',
    telemetry: tel,
  };
  emit();
}

export function ingestSdkVoiceSubtitle(text: string | undefined) {
  const t = text?.trim() || null;
  const tel = { ...state.telemetry, voiceEvents: state.telemetry.voiceEvents + 1 };
  state = {
    ...state,
    lastVoiceInstructionText: t,
    lastNavVoiceSource: 'sdk',
    telemetry: tel,
  };
  emit();
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
