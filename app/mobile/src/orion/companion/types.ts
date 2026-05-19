export type OrionMood = 'calm' | 'witty' | 'sassy' | 'focused' | 'hype' | 'quiet';

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
  | 'cruise'
  | 'traffic_humor'
  | 'reroute'
  | 'reward'
  | 'safety'
  | 'checkin'
  | 'offer'
  | 'police';

export type OrionDriveContextInput = {
  isNavigating?: boolean;
  speedMph?: number;
  etaMinutes?: number;
  distanceMiles?: number;
  trafficLevel?: string;
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
  drivingMode?: string | null;
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
  drivingMode: string | null;
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
  normalizedText?: string;
  variantId?: string | null;
  patternKey?: string | null;
  tripId?: string | null;
  category: string;
  mood: OrionMood;
  timestampMs: number;
  eventType: OrionCompanionEventType;
};

export type OrionCompanionResult = {
  shouldSpeak: boolean;
  message: string | null;
  category: string;
  mood: OrionMood;
  priority: OrionCompanionPriority;
  eventType: OrionCompanionEventType;
  variantId?: string | null;
  patternKey?: string | null;
  tripId?: string | null;
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
  /** Helps avoid repeating the same sentence shape even when exact words differ. */
  patternKey?: string;
  /** Higher values are more likely after safety/memory filters. Defaults to 1. */
  weight?: number;
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
