import type { Ionicons } from '@expo/vector-icons';

const FALLBACK: keyof typeof Ionicons.glyphMap = 'ribbon-outline';

/** Slugs from backend ALL_BADGES / COMMUNITY_BADGES → valid Ionicons names. */
const SLUG_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  car: 'car-outline',
  navigate: 'navigate-outline',
  footsteps: 'footsteps-outline',
  ribbon: 'ribbon-outline',
  flash: 'flash-outline',
  'car-sport': 'car-sport-outline',
  earth: 'earth-outline',
  flag: 'flag-outline',
  calendar: 'calendar-outline',
  repeat: 'repeat-outline',
  analytics: 'analytics-outline',
  diamond: 'diamond-outline',
  'diamond-outline': 'diamond-outline',
  'shield-checkmark': 'shield-checkmark-outline',
  shield: 'shield-outline',
  trophy: 'trophy-outline',
  flame: 'flame-outline',
  'flame-outline': 'flame-outline',
  star: 'star-outline',
  pin: 'location-outline',
  'thumbs-up': 'thumbs-up-outline',
  hero: 'shield-outline',
  warning: 'warning-outline',
};

const CATEGORY_ACCENT: Record<string, string> = {
  distance: '#3B82F6',
  trips: '#8B5CF6',
  gems: '#F59E0B',
  safety: '#10B981',
  streak: '#EF4444',
  level: '#6366F1',
  community: '#EC4899',
  other: '#64748B',
};

export function badgeIoniconsName(raw?: string | null): keyof typeof Ionicons.glyphMap {
  if (!raw || typeof raw !== 'string') return FALLBACK;
  const key = raw.trim().toLowerCase();
  if (key in SLUG_MAP) return SLUG_MAP[key]!;
  return FALLBACK;
}

export function badgeCategoryAccent(category?: string | null): string {
  if (!category) return CATEGORY_ACCENT.other;
  const c = category.trim().toLowerCase();
  return CATEGORY_ACCENT[c] ?? CATEGORY_ACCENT.other;
}
