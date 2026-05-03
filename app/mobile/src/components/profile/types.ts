import type { Ionicons } from '@expo/vector-icons';

export type ProfileOverviewActionItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  badgeText?: string;
  onPress?: () => void;
};

export type ProfileWeeklyRecap = {
  totalTrips: number;
  totalMiles: number;
  gemsEarnedWeek: number;
  avgSafetyScore: number;
  aiTip?: string;
  highlights?: string[];
  orionCommentary?: string | null;
  behavior?: { hard_braking_events_total: number; speeding_events_total: number };
  /** Top instantaneous speed across the recap window (mph). */
  topSpeedMph?: number;
  /** Average speed across the recap window (mph). */
  avgSpeedMph?: number;
};

export type ProfileBadgeItem = {
  id: string | number;
  name: string;
  earned: boolean;
  description?: string;
  category?: string;
  progress?: number;
  icon?: string;
  gems?: number;
};

export type ProfileTripHistoryItem = {
  id: string;
  date: string;
  time: string;
  origin: string;
  destination: string;
  distance_miles?: number;
  duration_minutes?: number;
  gems_earned?: number;
  xp_earned?: number;
  safety_score?: number;
  avg_speed_mph?: number;
  /** Smoothed peak speed (mph) observed on this trip. */
  max_speed_mph?: number;
  fuel_used_gallons?: number;
  /** Behavioral counts forwarded from the trip row when present. */
  hard_braking_events?: number;
  speeding_events?: number;
  tripEndedAtIso?: string;
  /** When `tripEndedAtIso` missing, range filters can still anchor on trip start (server ISO). */
  startedAtIso?: string;
};

export type ProfileGemTxItem = {
  id: string;
  type: 'earned' | 'spent' | 'unknown';
  amount: number;
  source: string;
  date: string;
};
