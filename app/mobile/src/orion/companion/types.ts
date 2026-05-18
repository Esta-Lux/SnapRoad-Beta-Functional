export type OrionMood = 'calm' | 'witty' | 'focused' | 'hype' | 'quiet';

export type OrionStressLevel = 'low' | 'medium' | 'high';

export type OrionTrafficLevel = 'light' | 'moderate' | 'heavy' | 'severe' | 'unknown';

export type OrionTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export type OrionTripPhase = 'opening' | 'cruising' | 'stressed' | 'closing';

export type OrionCompanionEventType =
  | 'drive_started'
  | 'smooth_drive'
  | 'heavy_traffic'
  | 'reroute'
  | 'long_drive'
  | 'reward_earned'
  | 'arrival'
  | 'safety_caution'
  | 'idle_checkin';

export type OrionCompanionPriority = 'low' | 'normal' | 'urgent';

export type OrionMessageCategory =
  | 'trip'
  | 'traffic_humor'
  | 'reroute'
  | 'reward'
  | 'safety'
  | 'checkin'
  | 'offer'
  | 'police';

/** Categories used by MapScreen advisories and the companion engine. */
export type OrionAdvisoryCategory = OrionMessageCategory;

export type OrionDriveContextInput = {
  isNavigating?: boolean;
  speedMph?: number;
  etaMinutes?: number;
  distanceMiles?: number;
  trafficLevel?: OrionTrafficLevel | string;
  congestionNearManeuver?: boolean;
  currentRoad?: string | null;
  nextManeuver?: string | null;
  nextStepDistanceMeters?: number | null;
  rerouteDetected?: boolean;
  incidentNearby?: boolean;
  driveDurationMinutes?: number;
  gemsEarned?: number;
  gemsEarnedThisTrip?: number;
  timeOfDay?: OrionTimeOfDay;
  weather?: string | null;
  destination?: string | null;
  userName?: string | null;
  tripId?: string | null;
  nowMs?: number;
};

export type OrionDriveContext = {
  isNavigating: boolean;
  speedMph: number;
  etaMinutes: number | null;
  distanceMiles: number | null;
  trafficLevel: OrionTrafficLevel;
  currentRoad: string | null;
  nextManeuver: string | null;
  nextStepDistanceMeters: number | null;
  rerouteDetected: boolean;
  incidentNearby: boolean;
  driveDurationMinutes: number;
  gemsEarned: number;
  gemsEarnedThisTrip: number;
  timeOfDay: OrionTimeOfDay;
  weather: string | null;
  destination: string | null;
  userName: string | null;
  tripId: string | null;
  nowMs: number;
};

export type PersonalityKnobs = {
  humorLevel: number;
  maxWords: number;
  sarcasmLevel: number;
  supportiveness: number;
  talkFrequency: number;
};

export type OrionMemoryEntry = {
  message: string;
  category: OrionMessageCategory | string;
  mood: OrionMood;
  timestampMs: number;
  eventType: OrionCompanionEventType;
};

export type OrionCompanionResult = {
  shouldSpeak: boolean;
  message: string | null;
  category: OrionMessageCategory | string;
  mood: OrionMood;
  priority: OrionCompanionPriority;
  eventType: OrionCompanionEventType;
};

export type NavVoiceState = {
  guidanceSuppressed: boolean;
  msSinceLastSdkVoice: number;
  advisorySdkHoldoffMs: number;
  imminentManeuver: boolean;
};

export type DialogueVariant = {
  id: string;
  template: string;
  moods?: OrionMood[];
  phases?: OrionTripPhase[];
  maxStress?: OrionStressLevel;
  /** When true, only if session.flags.openedWithLine */
  requiresOpenedWithLine?: boolean;
};

export type OrionHudLineMeta = {
  text: string;
  mood?: OrionMood;
  source: 'companion' | 'advisory';
};
