// SnapRoad Mobile - Theme & Constants

export const Colors = {
  // Primary
  primary: '#10b981', // Emerald
  primaryLight: '#34d399',
  primaryDark: '#059669',
  
  // Secondary
  secondary: '#14b8a6', // Teal
  secondaryLight: '#2dd4bf',
  secondaryDark: '#0d9488',
  
  // Accent
  accent: '#8b5cf6', // Purple
  accentLight: '#a78bfa',
  accentDark: '#7c3aed',
  
  // Background
  background: '#0f172a', // Slate 900
  backgroundLight: '#1e293b', // Slate 800
  backgroundLighter: '#334155', // Slate 700
  
  // Surface
  surface: '#1e293b',
  surfaceLight: '#334155',
  
  // Text
  text: '#ffffff',
  textSecondary: '#94a3b8', // Slate 400
  textMuted: '#64748b', // Slate 500
  
  // Status
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Gems & Gold
  gem: '#8b5cf6',
  gold: '#fbbf24',
  silver: '#9ca3af',
  bronze: '#f97316',
  
  // Rarity Colors
  common: '#94a3b8',
  rare: '#3b82f6',
  epic: '#8b5cf6',
  legendary: '#fbbf24',
  
  // Offer Types
  gas: '#ef4444',
  cafe: '#f59e0b',
  restaurant: '#10b981',
  carwash: '#3b82f6',
  retail: '#8b5cf6',
  
  // Gradients (as arrays for LinearGradient)
  gradientPrimary: ['#10b981', '#14b8a6'],
  gradientAccent: ['#8b5cf6', '#ec4899'],
  gradientGold: ['#fbbf24', '#f59e0b'],
  gradientDark: ['#1e293b', '#0f172a'],
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

// Car Options
export const CarCategories = [
  { id: 'sedan', name: 'Sedan', icon: '🚗' },
  { id: 'suv', name: 'SUV', icon: '🚙' },
  { id: 'truck', name: 'Truck', icon: '🛻' },
];

export const CarColors = [
  // Standard
  { id: 'midnight-black', name: 'Midnight Black', hex: '#1a1a2e', tier: 'standard', gems: 0 },
  { id: 'arctic-white', name: 'Arctic White', hex: '#f8fafc', tier: 'standard', gems: 0 },
  { id: 'ocean-blue', name: 'Ocean Blue', hex: '#3b82f6', tier: 'standard', gems: 0 },
  { id: 'forest-green', name: 'Forest Green', hex: '#22c55e', tier: 'standard', gems: 0 },
  { id: 'sunset-red', name: 'Sunset Red', hex: '#ef4444', tier: 'standard', gems: 0 },
  
  // Metallic
  { id: 'silver-metallic', name: 'Silver Metallic', hex: '#cbd5e1', tier: 'metallic', gems: 100 },
  { id: 'gold-metallic', name: 'Gold Metallic', hex: '#fbbf24', tier: 'metallic', gems: 150 },
  { id: 'bronze-metallic', name: 'Bronze Metallic', hex: '#f97316', tier: 'metallic', gems: 150 },
  
  // Premium
  { id: 'neon-purple', name: 'Neon Purple', hex: '#a855f7', tier: 'premium', gems: 300 },
  { id: 'electric-cyan', name: 'Electric Cyan', hex: '#06b6d4', tier: 'premium', gems: 300 },
  { id: 'rose-gold', name: 'Rose Gold', hex: '#fb7185', tier: 'premium', gems: 500 },
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
