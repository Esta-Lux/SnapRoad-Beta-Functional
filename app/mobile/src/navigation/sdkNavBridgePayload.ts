/**
 * Native `onRouteProgressChanged` JSON contract (iOS + Android bridges).
 * Keep in sync with Swift `navProgressPayload` / Kotlin `navProgressPayload`.
 */
export type SdkNavProgressLane = {
  indications: string[];
  active: boolean;
  valid: boolean;
};

export type SdkNavProgressShield = {
  text: string;
  /** Optional PNG as base64; bridges may omit to avoid fetch on the main thread. */
  imageBase64?: string;
};

export type SdkNavProgressEvent = {
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
  upcomingIntersectionName?: string;
  currentRoadName?: string;
  lanes?: SdkNavProgressLane[];
  shield?: SdkNavProgressShield | null;
};
