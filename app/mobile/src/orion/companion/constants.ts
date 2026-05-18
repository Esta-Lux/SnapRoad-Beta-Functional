import type { OrionMessageCategory } from './types';

export const ORION_COMPANION_MEMORY_KEY = 'orion_companion_memory_v1';
export const ORION_COMPANION_MEMORY_MAX = 20;

export const NAV_VOICE_IMMINENT_MAX_M = 88;
export const ADVISORY_SDK_HOLDOFF_MS = 3000;

/** Base min gap between non-urgent companion lines (ms). */
export const COMPANION_MIN_GAP_MS = 100_000;

export const CATEGORY_COOLDOWN_MS: Record<OrionMessageCategory, number> = {
  traffic_humor: 20 * 60 * 1000,
  reroute: 10 * 60 * 1000,
  reward: 5 * 60 * 1000,
  safety: 2 * 60 * 1000,
  trip: 4 * 60 * 1000,
  checkin: 30 * 60 * 1000,
};

/** Per-event probability to speak when cadence otherwise allows (bias toward silence). */
export const EVENT_SPEAK_PROBABILITY: Record<string, number> = {
  drive_started: 0.85,
  smooth_drive: 0.35,
  heavy_traffic: 0.55,
  reroute: 0.7,
  long_drive: 0.75,
  reward_earned: 0.8,
  arrival: 0.9,
  safety_caution: 0.65,
  idle_checkin: 0.5,
};

export const EVENT_CATEGORY: Record<string, OrionMessageCategory> = {
  drive_started: 'trip',
  smooth_drive: 'traffic_humor',
  heavy_traffic: 'traffic_humor',
  reroute: 'reroute',
  long_drive: 'trip',
  reward_earned: 'reward',
  arrival: 'trip',
  safety_caution: 'safety',
  idle_checkin: 'checkin',
};

export const EVENT_DEFAULT_PRIORITY: Record<string, 'low' | 'normal' | 'urgent'> = {
  drive_started: 'normal',
  smooth_drive: 'low',
  heavy_traffic: 'normal',
  reroute: 'normal',
  long_drive: 'normal',
  reward_earned: 'normal',
  arrival: 'normal',
  safety_caution: 'urgent',
  idle_checkin: 'low',
};

export const SMOOTH_DRIVE_MIN_MINUTES = 8;
export const LONG_DRIVE_MIN_MINUTES = 45;
