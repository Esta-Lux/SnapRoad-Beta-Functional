// SnapRoad Mobile - Theme & Constants
// Updated to match Flutter UI design system

export const Colors = {
  // Primary (Sky Blue - matching Flutter)
  primary: '#0EA5E9',
  primaryLight: '#38BDF8',
  primaryDark: '#0284C7',
  
  // Secondary (Teal)
  secondary: '#14b8a6',
  secondaryLight: '#2dd4bf',
  secondaryDark: '#0d9488',
  
  // Accent (Fuchsia - matching Flutter)
  accent: '#D946EF',
  accentLight: '#E879F9',
  accentDark: '#C026D3',
  
  // Background (Slate - matching Flutter)
  background: '#0F172A',
  backgroundLight: '#1E293B',
  backgroundLighter: '#334155',
  
  // Surface (matching Flutter)
  surface: '#1E293B',
  surfaceLight: '#334155',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  
  // Status (matching Flutter)
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Gems & Gold
  gem: '#D946EF',
  gold: '#FBBF24',
  silver: '#9CA3AF',
  bronze: '#F97316',
  
  // Rarity Colors
  common: '#94A3B8',
  rare: '#3B82F6',
  epic: '#D946EF',
  legendary: '#FBBF24',
  
  // Offer Types
  gas: '#EF4444',
  cafe: '#F59E0B',
  restaurant: '#22C55E',
  carwash: '#3B82F6',
  retail: '#D946EF',
  
  // Gradients (as arrays for LinearGradient) - using mutable arrays for compatibility
  gradientPrimary: ['#0EA5E9', '#06B6D4'] as string[],
  gradientAccent: ['#D946EF', '#EC4899'] as string[],
  gradientGold: ['#FBBF24', '#F59E0B'] as string[],
  gradientDark: ['#1E293B', '#0F172A'] as string[],
  gradientSuccess: ['#22C55E', '#10B981'] as string[],
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  xxxl: 32,
  display: 48,
};

export const FontWeights = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Shadows for cards (matching Flutter elevation)
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Car Options
export const CarCategories = [
  { id: 'sedan', name: 'Sedan', icon: 'car-sport' },
  { id: 'suv', name: 'SUV', icon: 'car' },
  { id: 'truck', name: 'Truck', icon: 'bus' },
];

export const CarColors = [
  // Standard
  { id: 'midnight-black', name: 'Midnight Black', hex: '#1A1A2E', tier: 'standard', gems: 0 },
  { id: 'arctic-white', name: 'Arctic White', hex: '#F8FAFC', tier: 'standard', gems: 0 },
  { id: 'ocean-blue', name: 'Ocean Blue', hex: '#0EA5E9', tier: 'standard', gems: 0 },
  { id: 'forest-green', name: 'Forest Green', hex: '#22C55E', tier: 'standard', gems: 0 },
  { id: 'sunset-red', name: 'Sunset Red', hex: '#EF4444', tier: 'standard', gems: 0 },
  
  // Metallic
  { id: 'silver-metallic', name: 'Silver Metallic', hex: '#CBD5E1', tier: 'metallic', gems: 100 },
  { id: 'gold-metallic', name: 'Gold Metallic', hex: '#FBBF24', tier: 'metallic', gems: 150 },
  { id: 'bronze-metallic', name: 'Bronze Metallic', hex: '#F97316', tier: 'metallic', gems: 150 },
  
  // Premium
  { id: 'neon-purple', name: 'Neon Purple', hex: '#D946EF', tier: 'premium', gems: 300 },
  { id: 'electric-cyan', name: 'Electric Cyan', hex: '#06B6D4', tier: 'premium', gems: 300 },
  { id: 'rose-gold', name: 'Rose Gold', hex: '#FB7185', tier: 'premium', gems: 500 },
];

// Level XP Requirements
export const LevelXpRequirements = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, // 1-10
  3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450, // 11-20
];

export const getXpForLevel = (level: number): number => {
  if (level <= 0) return 0;
  if (level <= LevelXpRequirements.length) {
    return LevelXpRequirements[level - 1];
  }
  // After level 20, each level requires 1000 more XP
  return LevelXpRequirements[19] + (level - 20) * 1000;
};

export const getXpProgress = (currentXp: number, level: number): number => {
  const currentLevelXp = getXpForLevel(level);
  const nextLevelXp = getXpForLevel(level + 1);
  const progress = (currentXp - currentLevelXp) / (nextLevelXp - currentLevelXp);
  return Math.min(Math.max(progress, 0), 1);
};

// Map Configuration
export const MapConfig = {
  initialRegion: {
    latitude: 39.9612,
    longitude: -82.9988,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  },
  // Columbus, OH center
  defaultLocation: {
    latitude: 39.9612,
    longitude: -82.9988,
  },
};

// Subscription Tiers (matching Flutter constants)
export const SubscriptionTiers = {
  free: 'free',
  premium: 'premium',
  family: 'family',
};

// Plan Features
export const PlanFeatures = {
  basic: {
    name: 'Basic',
    price: 0,
    features: [
      'Standard offers',
      'Basic rewards',
      'Safety tracking',
      'Community features',
    ],
  },
  premium: {
    name: 'Premium',
    price: 4.99,
    features: [
      'All Basic features',
      '2x gems on offers',
      'Exclusive premium offers',
      'Priority support',
      'Ad-free experience',
      'Early access to features',
    ],
  },
};

// Incident Types (matching Flutter constants)
export const IncidentTypes = {
  accident: 'accident',
  hazard: 'hazard',
  violation: 'violation',
  construction: 'construction',
  other: 'other',
};

// Rewards Constants (matching Flutter)
export const RewardsConfig = {
  baseGemsPerTrip: 5,
  gemsPerKm: 1,
  perfectScoreBonus: 10,
  streakBonusMultiplier: 2,
};

// Driving Event Thresholds (matching Flutter)
export const DrivingThresholds = {
  speedingThresholdKmh: 10.0,
  hardBrakeThresholdG: 0.5,
  rapidAccelThresholdG: 0.4,
};
