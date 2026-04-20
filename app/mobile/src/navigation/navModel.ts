/**
 * Navigation domain model — single source of truth for turn cards + voice.
 *
 * Consumers (TurnInstructionCard, useNavigationSpeech, NavigationStatusStrip,
 * voice.formatTurnInstruction) read the same {@link NavStep} fields where possible.
 */

// ── Road-signal enum (from Mapbox intersections / banner sub-components) ──

export type RoadSignalKind =
  | 'traffic_light'
  | 'stop_sign'
  | 'yield'
  | 'roundabout'
  | 'railway_crossing'
  | 'speed_camera'
  | 'toll_booth'
  /** Native banner: named intersection ahead */
  | 'named_intersection'
  /** Native banner: current road name */
  | 'road_name'
  | 'none';

export interface RoadSignal {
  kind: RoadSignalKind;
  /** Human label for card ("At the traffic light") */
  label: string;
}

// ── Lane guidance ──

export type LaneIndication = 'left' | 'slight_left' | 'straight' | 'slight_right' | 'right' | 'uturn';

export interface LaneInfo {
  indications: LaneIndication[];
  /**
   * Glyph for this lane when Mapbox provides `valid_indication` (may differ from `indications[0]`
   * when a lane allows multiple movements).
   */
  displayIndication?: LaneIndication;
  /** This lane is valid for the current maneuver. */
  active: boolean;
  /** Preferred lane (Mapbox `active_direction` / `valid_indication` match). */
  preferred: boolean;
}

// ── Shield / road reference ──

export interface RoadShield {
  /** e.g. "us-interstate", "us-state", "de-motorway" */
  network: string;
  /** e.g. "95", "A1" */
  ref: string;
  /** Display text shown on the sign */
  displayRef: string;
}

// ── Maneuver kind (superset of Mapbox type + modifier) ──

export type ManeuverKind =
  | 'turn_left'
  | 'turn_right'
  | 'sharp_left'
  | 'sharp_right'
  | 'slight_left'
  | 'slight_right'
  | 'straight'
  | 'uturn'
  | 'merge_left'
  | 'merge_right'
  | 'merge'
  | 'on_ramp_left'
  | 'on_ramp_right'
  | 'off_ramp_left'
  | 'off_ramp_right'
  | 'fork_left'
  | 'fork_right'
  | 'roundabout_left'
  | 'roundabout_right'
  | 'roundabout_straight'
  | 'rotary'
  | 'keep_left'
  | 'keep_right'
  | 'arrive'
  | 'depart'
  | 'notification'
  | 'continue'
  | 'unknown';

// ── NavStep — canonical step for card + voice ──

export interface NavStep {
  index: number;
  segmentIndex: number;

  kind: ManeuverKind;
  rawType: string;
  rawModifier: string;
  bearingAfter: number;

  displayInstruction: string;
  secondaryInstruction: string | null;
  subInstruction: string | null;
  /** Raw Mapbox maneuver.instruction */
  instruction: string;

  streetName: string | null;
  destinationRoad: string | null;
  shields: RoadShield[];

  signal: RoadSignal;
  lanes: LaneInfo[];

  roundaboutExitNumber: number | null;

  distanceMetersFromStart: number;
  /** Step length along route (Mapbox step distance). */
  distanceMeters: number;
  /** Distance to maneuver boundary — updated live in {@link navigationProgressCore}. */
  distanceMetersToNext: number;
  durationSeconds: number;

  voiceAnnouncement: string | null;

  nextManeuverKind: ManeuverKind | null;
  nextManeuverStreet: string | null;
  nextManeuverDistanceMeters: number | null;
}

export type RoutePoint = {
  lat: number;
  lng: number;
};

export type RawLocation = RoutePoint & {
  heading?: number | null;
  speedMps?: number | null;
  accuracy?: number | null;
  timestamp?: number | null;
};

export type LatLng = RoutePoint;

export type SnapPoint = {
  point: RoutePoint;
  segmentIndex: number;
  t: number;
  distanceMeters: number;
  cumulativeMeters: number;
};

/** Banner for TurnInstructionCard + voice — includes distance for the strip. */
export type NavBannerModel = {
  primaryInstruction: string;
  primaryDistanceMeters: number;
  primaryStreet?: string | null;
  secondaryInstruction?: string | null;
  subInstruction?: string | null;
  signal?: RoadSignal;
  lanes?: LaneInfo[];
  shields?: RoadShield[];
  maneuverKind?: ManeuverKind;
  roundaboutExitNumber?: number | null;
};

export type NavigationProgress = {
  displayCoord: RawLocation | null;
  /**
   * Map puck / CustomLocationProvider: on-route snap + optional lead-ahead, **no** display EMA smoothing.
   * `displayCoord` stays smoothed for stable camera/heading blending; puck was lagging when both used display.
   */
  puckCoord: RawLocation | null;
  snapped: SnapPoint | null;
  /**
   * Authoritative position for the passed/ahead route split shown on the map.
   * This may differ from `snapped` when the visible puck is intentionally biased
   * ahead along the polyline; consumers should use this instead of guessing from
   * `snapped` so the trail break stays attached to the puck.
   */
  routeSplitSnap?: SnapPoint | null;
  traveledRoute: RoutePoint[];
  remainingRoute: RoutePoint[];
  maneuverRoute: RoutePoint[];
  nextStep: NavStep | null;
  followingStep: NavStep | null;
  nextStepDistanceMeters: number;
  banner: NavBannerModel | null;
  distanceRemainingMeters: number;
  modelDurationRemainingSeconds: number;
  durationRemainingSeconds: number;
  etaEpochMs: number | null;
  etaBlendWeight?: number;
  etaNaiveSeconds?: number;
  isOffRoute: boolean;
  confidence: number;
  instructionSource?: 'sdk' | 'sdk_waiting' | 'js';
  routePolyline?: RoutePoint[];
  /**
   * Cumulative meters along the polyline at which the display position sits.
   * Consumers should use this (not `snapped.cumulativeMeters`) for route-line
   * split so the "traveled" / "remaining" break aligns with the visible puck.
   */
  displayCumulativeMeters?: number;
  /**
   * Native SDK `fractionTraveled` (minimal pass-through path). When set, UI should
   * not re-smooth or re-derive fraction from projected cumulative meters.
   */
  nativeFractionTraveled?: number;
};
