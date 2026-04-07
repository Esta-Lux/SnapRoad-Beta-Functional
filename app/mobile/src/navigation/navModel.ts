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

/** Single turn-banner truth derived from {@link NavigationProgress}. */
export type NavBannerModel = {
  primaryInstruction: string;
  primaryDistanceMeters: number;
  primaryStreet?: string | null;
  /** Only “Then …” for the maneuver after {@link NavigationProgress.nextStep}. */
  secondaryInstruction?: string | null;
};

export type NavigationProgress = {
  displayCoord: RawLocation | null;
  snapped: SnapPoint | null;
  traveledRoute: RoutePoint[];
  remainingRoute: RoutePoint[];
  maneuverRoute: RoutePoint[];
  nextStep: NavStep | null;
  /** Step after `nextStep` (for “Then …” only). */
  followingStep: NavStep | null;
  /**
   * Single source for distance to the upcoming maneuver (snap → step boundary along route model).
   * Use for banner, speech, camera maneuver boost, and highlight timing — nowhere else.
   */
  nextStepDistanceMeters: number;
  /** Banner copy; distances match {@link nextStepDistanceMeters}. */
  banner: NavBannerModel | null;
  distanceRemainingMeters: number;
  durationRemainingSeconds: number;
  etaEpochMs: number | null;
  isOffRoute: boolean;
  confidence: number;
};
