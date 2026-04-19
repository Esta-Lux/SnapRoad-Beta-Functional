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
  safety_score?: number;
  tripEndedAtIso?: string;
};

export type ProfileGemTxItem = {
  id: string;
  type: 'earned' | 'spent' | 'unknown';
  amount: number;
  source: string;
  date: string;
};
