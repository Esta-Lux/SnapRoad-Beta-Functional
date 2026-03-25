import type { Badge, Challenge, Offer } from '../../types';

export type RewardsTab = 'offers' | 'challenges' | 'badges';
export type ChallengeModalTab = 'history' | 'badges';

export type LeaderboardEntry = {
  rank: number;
  id: string;
  name: string;
  safety_score: number;
  level: number;
  gems: number;
  state: string;
  is_premium?: boolean;
};

export type GemTx = {
  id: string;
  type: 'earned' | 'spent' | 'unknown';
  amount: number;
  source: string;
  date: string;
};

export type ChallengeHistoryItem = {
  id: string;
  opponent_name: string;
  status: 'pending' | 'active' | 'won' | 'lost' | 'draw' | string;
  your_score: number;
  opponent_score: number;
  stake: number;
  duration_hours: number;
};

export type ChallengeHistoryStats = {
  wins: number;
  losses: number;
  win_rate: number;
  total_gems_won: number;
  total_gems_lost: number;
  current_streak: number;
  best_streak: number;
};

export type BadgePressHandler = (badge: Badge) => void;
export type OfferPressHandler = (offer: Offer) => void;
export type ChallengeClaimHandler = (challenge: Challenge) => void;
