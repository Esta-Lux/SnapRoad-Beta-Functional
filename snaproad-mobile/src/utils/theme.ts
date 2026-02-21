// SnapRoad Mobile - Premium Design System
// Neon Blue theme with glass-morphism, optimized for iPhone 17+
// Uses SF Pro (iOS system font) automatically via React Native

export const Colors = {
  // Primary Neon Blue Palette
  primary: '#2563EB',
  primaryLight: '#60A5FA',
  primaryDark: '#1D4ED8',
  primaryGlow: '#3B82F6',
  neonBlue: '#2563EB',
  electricBlue: '#38BDF8',
  
  // Secondary
  secondary: '#06D6A0',
  secondaryLight: '#34D399',
  secondaryDark: '#059669',
  
  // Accent
  accent: '#A855F7',
  accentLight: '#C084FC',
  accentDark: '#9333EA',
  
  // Background — deep navy, not pure black
  background: '#070E1B',
  backgroundLight: '#0F1A2E',
  backgroundLighter: '#1A2744',
  
  // Surface — glass card backgrounds
  surface: '#111D32',
  surfaceLight: '#1A2B47',
  surfaceLighter: '#243B5C',
  glass: 'rgba(17,29,50,0.85)',
  glassLight: 'rgba(26,43,71,0.75)',
  glassBorder: 'rgba(56,189,248,0.12)',
  
  // Text — crisp hierarchy
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDim: '#475569',
  
  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#38BDF8',
  
  // Gems & Ranks
  gem: '#A855F7',
  gold: '#FBBF24',
  silver: '#9CA3AF',
  bronze: '#F97316',
  
  // Rarity
  common: '#94A3B8',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#FBBF24',
  
  // Offer Types
  gas: '#EF4444',
  cafe: '#F59E0B',
  restaurant: '#10B981',
  carwash: '#38BDF8',
  retail: '#A855F7',
  
  // Gradients
  gradientPrimary: ['#2563EB', '#38BDF8'] as string[],
  gradientNeon: ['#2563EB', '#06D6A0'] as string[],
  gradientAccent: ['#A855F7', '#EC4899'] as string[],
  gradientGold: ['#FBBF24', '#F59E0B'] as string[],
  gradientDark: ['#111D32', '#070E1B'] as string[],
  gradientSuccess: ['#10B981', '#06D6A0'] as string[],
  gradientGlass: ['rgba(17,29,50,0.9)', 'rgba(7,14,27,0.95)'] as string[],
  gradientCard: ['#111D32', '#0D1628'] as string[],
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
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const FontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  xxxl: 34,
  display: 48,
  hero: 56,
};

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
  black: '900' as const,
  normal: '400' as const,
};

// Premium glass-morphism shadows
export const Shadows = {
  sm: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  neon: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  glow: {
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
};

// Glass card style helper
export const GlassCard = {
  backgroundColor: Colors.glass,
  borderWidth: 1,
  borderColor: Colors.glassBorder,
  borderRadius: BorderRadius.xl,
};

// Car Options
export const CarCategories = [
  { id: 'sedan', name: 'Sedan', icon: 'car-sport' },
  { id: 'suv', name: 'SUV', icon: 'car' },
  { id: 'truck', name: 'Truck', icon: 'bus' },
];

export const CarColors = [
  { id: 'midnight-black', name: 'Midnight Black', hex: '#1A1A2E', tier: 'standard', gems: 0 },
  { id: 'arctic-white', name: 'Arctic White', hex: '#F8FAFC', tier: 'standard', gems: 0 },
  { id: 'ocean-blue', name: 'Ocean Blue', hex: '#2563EB', tier: 'standard', gems: 0 },
  { id: 'forest-green', name: 'Forest Green', hex: '#10B981', tier: 'standard', gems: 0 },
  { id: 'sunset-red', name: 'Sunset Red', hex: '#EF4444', tier: 'standard', gems: 0 },
  { id: 'silver-metallic', name: 'Silver Metallic', hex: '#CBD5E1', tier: 'metallic', gems: 100 },
  { id: 'gold-metallic', name: 'Gold Metallic', hex: '#FBBF24', tier: 'metallic', gems: 150 },
  { id: 'bronze-metallic', name: 'Bronze Metallic', hex: '#F97316', tier: 'metallic', gems: 150 },
  { id: 'neon-purple', name: 'Neon Purple', hex: '#A855F7', tier: 'premium', gems: 300 },
  { id: 'electric-cyan', name: 'Electric Cyan', hex: '#38BDF8', tier: 'premium', gems: 300 },
  { id: 'rose-gold', name: 'Rose Gold', hex: '#FB7185', tier: 'premium', gems: 500 },
];

export const LevelXpRequirements = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700,
  3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450,
];

export const getXpForLevel = (level: number): number => {
  if (level <= 0) return 0;
  if (level <= LevelXpRequirements.length) return LevelXpRequirements[level - 1];
  return LevelXpRequirements[19] + (level - 20) * 1000;
};

export const getXpProgress = (currentXp: number, level: number): number => {
  const currentLevelXp = getXpForLevel(level);
  const nextLevelXp = getXpForLevel(level + 1);
  return Math.min(Math.max((currentXp - currentLevelXp) / (nextLevelXp - currentLevelXp), 0), 1);
};

export const MapConfig = {
  initialRegion: { latitude: 39.9612, longitude: -82.9988, latitudeDelta: 0.02, longitudeDelta: 0.02 },
  defaultLocation: { latitude: 39.9612, longitude: -82.9988 },
};

export const SubscriptionTiers = { free: 'free', premium: 'premium', family: 'family' };

export const PlanFeatures = {
  basic: { name: 'Basic', price: 0, features: ['Standard offers', 'Basic rewards', 'Safety tracking', 'Community features'] },
  premium: { name: 'Premium', price: 4.99, features: ['All Basic features', '2x gems on offers', 'Exclusive premium offers', 'Priority support', 'Ad-free experience', 'Early access to features'] },
};

export const IncidentTypes = { accident: 'accident', hazard: 'hazard', violation: 'violation', construction: 'construction', other: 'other' };
export const RewardsConfig = { baseGemsPerTrip: 5, gemsPerKm: 1, perfectScoreBonus: 10, streakBonusMultiplier: 2 };
export const DrivingThresholds = { speedingThresholdKmh: 10.0, hardBrakeThresholdG: 0.5, rapidAccelThresholdG: 0.4 };
