import type { Coordinate } from '../types';
import type { DirectionsStep } from '../lib/directions';
import type { NavigationProgress } from './navModel';
import { buildNavigationProgressFromSdk } from './navSdkProgressAdapter';

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
};

const initial: NavSdkState = { progress: null, location: null, routePolyline: [] };

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
  state = { progress: null, location: null, routePolyline: [] };
  emit();
}

export function ingestSdkProgress(p: SdkProgressPayload) {
  state = { ...state, progress: p };
  emit();
}

export function ingestSdkLocation(l: SdkLocationPayload) {
  state = { ...state, location: l };
  emit();
}

export function ingestSdkRoutePolyline(poly: Coordinate[]) {
  state = { ...state, routePolyline: poly };
  emit();
}

export function getSdkNavigationProgress(
  navigationData: { polyline: Coordinate[]; steps: DirectionsStep[] } | null,
): NavigationProgress | null {
  const st = state;
  if (!st.progress || !navigationData?.polyline?.length) return null;
  const poly = st.routePolyline.length >= 2 ? st.routePolyline : navigationData.polyline;
  return buildNavigationProgressFromSdk({
    progress: st.progress,
    location: st.location,
    polyline: poly,
    steps: navigationData.steps,
  });
}

export function getSdkMatchedCoordinate(): Coordinate | null {
  if (!state.location) return null;
  return { lat: state.location.latitude, lng: state.location.longitude };
}
