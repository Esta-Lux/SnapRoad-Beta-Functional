export type LatLng = {
  lat: number;
  lng: number;
};

export type RawLocation = LatLng & {
  heading?: number | null;
  speedMps?: number | null;
  accuracy?: number | null;
  timestamp?: number | null;
};

export type RoutePoint = LatLng;

export type ManeuverKind =
  | 'straight'
  | 'slight_left'
  | 'left'
  | 'sharp_left'
  | 'slight_right'
  | 'right'
  | 'sharp_right'
  | 'uturn'
  | 'merge'
  | 'fork'
  | 'arrive';

export type NavStep = {
  index: number;
  segmentIndex: number;
  /** Cumulative route meters at the start of this step (sum of prior Mapbox step lengths). */
  distanceMetersFromStart: number;
  /** Along-route distance to execute this step; recomputed in progress from snap. */
  distanceMetersToNext: number;
  kind: ManeuverKind;
  modifier?: string;
  streetName?: string | null;
  instruction?: string | null;
};

export type SnapPoint = {
  point: RoutePoint;
  segmentIndex: number;
  t: number;
  distanceMeters: number;
  cumulativeMeters: number;
};

export type NavigationProgress = {
  displayCoord: RawLocation | null;
  snapped: SnapPoint | null;
  traveledRoute: RoutePoint[];
  remainingRoute: RoutePoint[];
  maneuverRoute: RoutePoint[];
  nextStep: NavStep | null;
  distanceRemainingMeters: number;
  durationRemainingSeconds: number;
  etaEpochMs: number | null;
  isOffRoute: boolean;
  confidence: number;
};
