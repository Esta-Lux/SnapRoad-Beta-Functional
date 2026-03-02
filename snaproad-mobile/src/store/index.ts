// SnapRoad Mobile - Mock Data Store
// This store contains all mock data. Replace with API calls when ready.

import { create } from 'zustand';
import { User, Offer, Badge, Challenge, LeaderboardEntry, Trip, GasStation } from '../types';

// ============== USER STORE ==============
interface UserState {
  user: User;
  isLoggedIn: boolean;
  
  // Actions
  updateUser: (updates: Partial<User>) => void;
  addXp: (amount: number) => void;
  addGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;
  selectCar: (category: string, variant: string, color: string) => void;
  selectPlan: (plan: 'basic' | 'premium') => void;
  completeOnboarding: () => void;
  resetUser: () => void;
}

const initialUser: User = {
  id: '123456',
  name: 'Alex Driver',
  email: 'alex@snaproad.com',
  plan: 'basic',
  xp: 2450,
  level: 12,
  gems: 750,
  safetyScore: 92,
  carCategory: 'sedan',
  carVariant: 'sedan-classic',
  carColor: 'ocean-blue',
  totalMiles: 1234.5,
  totalTrips: 89,
  totalSavings: 156.75,
  state: 'Ohio',
  city: 'Columbus',
  onboardingComplete: false,
  isPremium: false,
};

export const useUserStore = create<UserState>((set, get) => ({
  user: initialUser,
  isLoggedIn: true,
  
  updateUser: (updates) => set((state) => ({ 
    user: { ...state.user, ...updates } 
  })),
  
  addXp: (amount) => set((state) => {
    const newXp = state.user.xp + amount;
    const xpPerLevel = 500;
    const newLevel = Math.floor(newXp / xpPerLevel) + 1;
    return { 
      user: { ...state.user, xp: newXp, level: newLevel } 
    };
  }),
  
  addGems: (amount) => set((state) => ({ 
    user: { ...state.user, gems: state.user.gems + amount } 
  })),
  
  spendGems: (amount) => {
    const { user } = get();
    if (user.gems >= amount) {
      set({ user: { ...user, gems: user.gems - amount } });
      return true;
    }
    return false;
  },
  
  selectCar: (category, variant, color) => set((state) => ({
    user: { 
      ...state.user, 
      carCategory: category as any, 
      carVariant: variant, 
      carColor: color 
    }
  })),
  
  selectPlan: (plan) => set((state) => ({
    user: { 
      ...state.user, 
      plan, 
      isPremium: plan === 'premium' 
    }
  })),
  
  completeOnboarding: () => set((state) => ({
    user: { ...state.user, onboardingComplete: true }
  })),
  
  resetUser: () => set({ user: initialUser }),
}));

// ============== OFFERS STORE ==============
interface OffersState {
  offers: Offer[];
  selectedOffer: Offer | null;
  
  selectOffer: (offer: Offer | null) => void;
  getOffersByType: (type: string) => Offer[];
  getNearbyOffers: () => Offer[];
}

const mockOffers: Offer[] = [
  {
    id: 1,
    businessName: 'Shell Gas Station',
    businessType: 'gas',
    description: 'Save on fuel today!',
    discountPercent: 15,
    baseGems: 30,
    premiumGems: 50,
    lat: 39.9612,
    lng: -82.9988,
    distance: '0.3 mi',
    expiresAt: '2025-03-01T23:59:59Z',
  },
  {
    id: 2,
    businessName: 'Starbucks Downtown',
    businessType: 'cafe',
    description: 'Free drink upgrade!',
    discountPercent: 20,
    baseGems: 25,
    premiumGems: 40,
    lat: 39.9650,
    lng: -82.9950,
    distance: '0.5 mi',
    expiresAt: '2025-02-28T23:59:59Z',
  },
  {
    id: 3,
    businessName: 'Quick Shine Car Wash',
    businessType: 'carwash',
    description: 'Premium wash discount',
    discountPercent: 25,
    baseGems: 35,
    premiumGems: 60,
    lat: 39.9580,
    lng: -83.0020,
    distance: '0.8 mi',
    expiresAt: '2025-03-15T23:59:59Z',
  },
  {
    id: 4,
    businessName: 'Chipotle',
    businessType: 'restaurant',
    description: 'Free guac with entree',
    discountPercent: 10,
    baseGems: 20,
    premiumGems: 35,
    lat: 39.9700,
    lng: -82.9900,
    distance: '1.2 mi',
    expiresAt: '2025-02-20T23:59:59Z',
  },
  {
    id: 5,
    businessName: 'BP Gas Station',
    businessType: 'gas',
    description: 'Weekend fuel savings',
    discountPercent: 18,
    baseGems: 32,
    premiumGems: 55,
    lat: 39.9550,
    lng: -83.0100,
    distance: '1.5 mi',
    expiresAt: '2025-03-10T23:59:59Z',
  },
];

export const useOffersStore = create<OffersState>((set, get) => ({
  offers: mockOffers,
  selectedOffer: null,
  
  selectOffer: (offer) => set({ selectedOffer: offer }),
  
  getOffersByType: (type) => {
    return get().offers.filter(o => o.businessType === type);
  },
  
  getNearbyOffers: () => {
    return get().offers.slice(0, 3);
  },
}));

// ============== BADGES STORE ==============
interface BadgesState {
  badges: Badge[];
  claimBadge: (badgeId: string) => void;
}

const mockBadges: Badge[] = [
  { id: '1', name: 'Road Warrior', description: 'Drive 100 miles', icon: 'car', category: 'driving', rarity: 'common', earned: true, earnedAt: '2025-01-15' },
  { id: '2', name: 'Safety Star', description: 'Maintain 90+ safety score for a week', icon: 'shield', category: 'safety', rarity: 'rare', earned: true, earnedAt: '2025-01-20' },
  { id: '3', name: 'Explorer', description: 'Visit 10 different locations', icon: 'map', category: 'exploration', rarity: 'common', earned: true, earnedAt: '2025-01-25' },
  { id: '4', name: 'Social Butterfly', description: 'Add 5 friends', icon: 'users', category: 'social', rarity: 'common', earned: false, progress: 3, requirement: 5 },
  { id: '5', name: 'Marathon Driver', description: 'Drive 1000 miles', icon: 'award', category: 'driving', rarity: 'epic', earned: false, progress: 650, requirement: 1000 },
  { id: '6', name: 'Perfect Week', description: '100% safety score for 7 days', icon: 'star', category: 'safety', rarity: 'legendary', earned: false, progress: 4, requirement: 7 },
  { id: '7', name: 'Gem Collector', description: 'Earn 500 gems', icon: 'gem', category: 'exploration', rarity: 'rare', earned: true, earnedAt: '2025-02-01' },
  { id: '8', name: 'Early Bird', description: 'Complete a trip before 6 AM', icon: 'sunrise', category: 'driving', rarity: 'rare', earned: false },
];

export const useBadgesStore = create<BadgesState>((set) => ({
  badges: mockBadges,
  
  claimBadge: (badgeId) => set((state) => ({
    badges: state.badges.map(b => 
      b.id === badgeId ? { ...b, earned: true, earnedAt: new Date().toISOString() } : b
    )
  })),
}));

// ============== CHALLENGES STORE ==============
interface ChallengesState {
  challenges: Challenge[];
  joinChallenge: (challengeId: string) => void;
  updateProgress: (challengeId: string, progress: number) => void;
}

const mockChallenges: Challenge[] = [
  {
    id: '1',
    title: 'Weekend Warrior',
    description: 'Drive 50 miles this weekend',
    type: 'weekly',
    goalType: 'miles',
    goalValue: 50,
    currentProgress: 32,
    rewardXp: 200,
    rewardGems: 50,
    startsAt: '2025-02-08T00:00:00Z',
    endsAt: '2025-02-10T23:59:59Z',
    participants: 1247,
    joined: true,
  },
  {
    id: '2',
    title: 'Safety Champion',
    description: 'Maintain 95+ safety score for 5 trips',
    type: 'weekly',
    goalType: 'score',
    goalValue: 5,
    currentProgress: 3,
    rewardXp: 300,
    rewardGems: 75,
    startsAt: '2025-02-05T00:00:00Z',
    endsAt: '2025-02-12T23:59:59Z',
    participants: 856,
    joined: true,
  },
  {
    id: '3',
    title: 'Road Trip Challenge',
    description: 'Complete 20 trips this week',
    type: 'community',
    goalType: 'trips',
    goalValue: 20,
    currentProgress: 0,
    rewardXp: 500,
    rewardGems: 100,
    startsAt: '2025-02-10T00:00:00Z',
    endsAt: '2025-02-17T23:59:59Z',
    participants: 2341,
    joined: false,
  },
];

export const useChallengesStore = create<ChallengesState>((set) => ({
  challenges: mockChallenges,
  
  joinChallenge: (challengeId) => set((state) => ({
    challenges: state.challenges.map(c =>
      c.id === challengeId ? { ...c, joined: true } : c
    )
  })),
  
  updateProgress: (challengeId, progress) => set((state) => ({
    challenges: state.challenges.map(c =>
      c.id === challengeId ? { ...c, currentProgress: progress } : c
    )
  })),
}));

// ============== LEADERBOARD STORE ==============
interface LeaderboardState {
  entries: LeaderboardEntry[];
  currentUserRank: number;
  filter: 'all' | 'state' | 'friends';
  timeFilter: 'week' | 'month' | 'allTime';
  setFilter: (filter: 'all' | 'state' | 'friends') => void;
  setTimeFilter: (filter: 'week' | 'month' | 'allTime') => void;
}

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, userId: '1', name: 'Sarah M.', score: 15420, level: 25, state: 'Ohio', avatar: undefined },
  { rank: 2, userId: '2', name: 'Mike T.', score: 14850, level: 23, state: 'Ohio', avatar: undefined },
  { rank: 3, userId: '3', name: 'Emily R.', score: 13200, level: 21, state: 'California', avatar: undefined },
  { rank: 4, userId: '4', name: 'James K.', score: 12100, level: 20, state: 'Ohio', avatar: undefined },
  { rank: 5, userId: '5', name: 'Lisa W.', score: 11500, level: 19, state: 'Texas', avatar: undefined },
  { rank: 6, userId: '123456', name: 'Alex Driver', score: 10200, level: 12, state: 'Ohio', isCurrentUser: true },
  { rank: 7, userId: '7', name: 'Chris P.', score: 9800, level: 17, state: 'Ohio', avatar: undefined },
  { rank: 8, userId: '8', name: 'Anna S.', score: 9200, level: 16, state: 'Florida', avatar: undefined },
];

export const useLeaderboardStore = create<LeaderboardState>((set) => ({
  entries: mockLeaderboard,
  currentUserRank: 6,
  filter: 'all',
  timeFilter: 'week',
  
  setFilter: (filter) => set({ filter }),
  setTimeFilter: (timeFilter) => set({ timeFilter }),
}));

// ============== TRIPS STORE ==============
interface TripsState {
  trips: Trip[];
  addTrip: (trip: Trip) => void;
}

const mockTrips: Trip[] = [
  { id: '1', startLocation: 'Home', endLocation: 'Downtown Office', distance: 12.5, duration: 25, safetyScore: 95, xpEarned: 125, gemsEarned: 15, date: '2025-02-09' },
  { id: '2', startLocation: 'Downtown Office', endLocation: 'Gym', distance: 3.2, duration: 10, safetyScore: 98, xpEarned: 45, gemsEarned: 5, date: '2025-02-09' },
  { id: '3', startLocation: 'Gym', endLocation: 'Home', distance: 8.7, duration: 18, safetyScore: 92, xpEarned: 90, gemsEarned: 10, date: '2025-02-09' },
  { id: '4', startLocation: 'Home', endLocation: 'Mall', distance: 15.3, duration: 30, safetyScore: 88, xpEarned: 150, gemsEarned: 18, date: '2025-02-08' },
  { id: '5', startLocation: 'Mall', endLocation: 'Restaurant', distance: 5.1, duration: 12, safetyScore: 100, xpEarned: 75, gemsEarned: 8, date: '2025-02-08' },
];

export const useTripsStore = create<TripsState>((set) => ({
  trips: mockTrips,
  
  addTrip: (trip) => set((state) => ({
    trips: [trip, ...state.trips]
  })),
}));

// ============== GAS STATIONS STORE ==============
interface GasStationsState {
  stations: GasStation[];
  averagePrice: number;
}

const mockGasStations: GasStation[] = [
  { id: '1', name: 'Shell', address: '100 N High St', price: 3.29, distance: '0.3 mi', lat: 39.9612, lng: -82.9988 },
  { id: '2', name: 'BP', address: '250 E Broad St', price: 3.35, distance: '0.8 mi', lat: 39.9600, lng: -82.9850 },
  { id: '3', name: 'Speedway', address: '500 S Front St', price: 3.19, distance: '1.2 mi', lat: 39.9500, lng: -82.9950 },
  { id: '4', name: 'Marathon', address: '800 W Main St', price: 3.25, distance: '1.5 mi', lat: 39.9550, lng: -83.0100 },
];

export const useGasStationsStore = create<GasStationsState>(() => ({
  stations: mockGasStations,
  averagePrice: 3.27,
}));

// ============== APP STATE STORE ==============
interface AppState {
  isLoading: boolean;
  showOnboarding: boolean;
  currentTab: string;
  
  setLoading: (loading: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  setCurrentTab: (tab: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isLoading: false,
  showOnboarding: true,
  currentTab: 'map',
  
  setLoading: (isLoading) => set({ isLoading }),
  setShowOnboarding: (showOnboarding) => set({ showOnboarding }),
  setCurrentTab: (currentTab) => set({ currentTab }),
}));
