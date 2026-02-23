// SnapRoad Mobile - Badges Grid Screen (matches /driver web BadgesGrid modal)
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://privacy-first-app-3.preview.emergentagent.com';
const { width: SCREEN_W } = Dimensions.get('window');
const BADGE_SIZE = (SCREEN_W - 64) / 3;

interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  earned: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward: number;
  progress?: number;
  total?: number;
}

const CATEGORIES = ['All', 'Driving', 'Safety', 'Social', 'Challenges', 'Special'];

const RARITY_COLORS = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
};

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  flag: 'flag',
  moon: 'moon',
  speedometer: 'speedometer',
  leaf: 'leaf',
  people: 'people',
  trophy: 'trophy',
  star: 'star',
  shield: 'shield-checkmark',
  car: 'car',
  flame: 'flame',
  diamond: 'diamond',
  medal: 'medal',
  ribbon: 'ribbon',
  heart: 'heart',
  flash: 'flash',
};

export const BadgesScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeFilter, setActiveFilter] = useState<'all' | 'earned' | 'locked'>('all');
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => { fetchBadges(); }, []);

  const fetchBadges = async () => {
    try {
      const res = await fetch(`${API_URL}/api/badges`);
      const data = await res.json();
      if (data.success) setBadges(data.data);
    } catch {
      // Mock data
      setBadges([
        { id: 1, name: 'First Mile', description: 'Complete your first trip', icon: 'flag', category: 'Driving', earned: true, rarity: 'common', xp_reward: 100 },
        { id: 2, name: 'Night Owl', description: 'Drive 10 trips at night', icon: 'moon', category: 'Driving', earned: true, rarity: 'rare', xp_reward: 250 },
        { id: 3, name: 'Speed Demon', description: 'Maintain speed limit for 50 miles', icon: 'speedometer', category: 'Safety', earned: true, rarity: 'epic', xp_reward: 500 },
        { id: 4, name: 'Eco Champion', description: 'Save 50 gallons of fuel', icon: 'leaf', category: 'Special', earned: false, rarity: 'legendary', xp_reward: 1000, progress: 32, total: 50 },
        { id: 5, name: 'Social Star', description: 'Add 10 friends', icon: 'people', category: 'Social', earned: false, rarity: 'rare', xp_reward: 250, progress: 3, total: 10 },
        { id: 6, name: 'Road Master', description: 'Complete 100 trips', icon: 'trophy', category: 'Challenges', earned: false, rarity: 'epic', xp_reward: 500, progress: 45, total: 100 },
        { id: 7, name: 'Safe Driver', description: 'No incidents for 30 days', icon: 'shield', category: 'Safety', earned: true, rarity: 'epic', xp_reward: 500 },
        { id: 8, name: 'Car Collector', description: 'Unlock 5 car colors', icon: 'car', category: 'Special', earned: false, rarity: 'rare', xp_reward: 250, progress: 2, total: 5 },
        { id: 9, name: 'Streak King', description: 'Maintain 7-day streak', icon: 'flame', category: 'Challenges', earned: true, rarity: 'rare', xp_reward: 250 },
      ]);
    }
  };

  const filteredBadges = badges.filter(badge => {
    const categoryMatch = activeCategory === 'All' || badge.category === activeCategory;
    const filterMatch = activeFilter === 'all' || 
      (activeFilter === 'earned' && badge.earned) ||
      (activeFilter === 'locked' && !badge.earned);
    return categoryMatch && filterMatch;
  });

  const earnedCount = badges.filter(b => b.earned).length;
  const totalCount = badges.length;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={['#F59E0B', '#D97706']} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.title}>All Badges</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={s.progressCard}>
          <View style={s.progressInfo}>
            <Text style={s.progressLabel}>Collection Progress</Text>
            <Text style={s.progressValue}>{earnedCount} / {totalCount}</Text>
          </View>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${(earnedCount / totalCount) * 100}%` }]} />
          </View>
        </View>
      </LinearGradient>

      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoriesScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[s.categoryBtn, activeCategory === cat && s.categoryBtnActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[s.categoryText, activeCategory === cat && s.categoryTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filter Tabs */}
      <View style={s.filterRow}>
        {(['all', 'earned', 'locked'] as const).map(filter => (
          <TouchableOpacity
            key={filter}
            style={[s.filterBtn, activeFilter === filter && s.filterBtnActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[s.filterText, activeFilter === filter && s.filterTextActive]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View style={s.badgesGrid}>
          {filteredBadges.map(badge => (
            <TouchableOpacity key={badge.id} style={[s.badgeCard, !badge.earned && s.badgeCardLocked]}>
              <View style={[s.badgeIcon, { backgroundColor: badge.earned ? `${RARITY_COLORS[badge.rarity]}20` : 'rgba(255,255,255,0.04)' }]}>
                <Ionicons
                  name={ICON_MAP[badge.icon] || 'ribbon'}
                  size={28}
                  color={badge.earned ? RARITY_COLORS[badge.rarity] : Colors.textDim}
                />
              </View>
              <Text style={[s.badgeName, !badge.earned && s.badgeNameLocked]} numberOfLines={2}>
                {badge.name}
              </Text>
              <View style={[s.rarityBadge, { backgroundColor: `${RARITY_COLORS[badge.rarity]}20` }]}>
                <Text style={[s.rarityText, { color: RARITY_COLORS[badge.rarity] }]}>
                  {badge.rarity.toUpperCase()}
                </Text>
              </View>
              {!badge.earned && badge.progress !== undefined && (
                <View style={s.progressMini}>
                  <View style={[s.progressMiniFill, { width: `${(badge.progress / (badge.total || 1)) * 100}%` }]} />
                </View>
              )}
              {!badge.earned && <Ionicons name="lock-closed" size={12} color={Colors.textDim} style={s.lockIcon} />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  progressCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.sm },
  progressValue: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4 },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  // Categories
  categoriesScroll: { flexGrow: 0, paddingVertical: 12 },
  categoryBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface },
  categoryBtnActive: { backgroundColor: Colors.primary },
  categoryText: { color: Colors.textMuted, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  categoryTextActive: { color: '#fff' },
  // Filter
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: Colors.surface },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterText: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  filterTextActive: { color: '#fff' },
  // Badges Grid
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeCard: { width: BADGE_SIZE, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.glassBorder },
  badgeCardLocked: { opacity: 0.6 },
  badgeIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  badgeName: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, textAlign: 'center', marginBottom: 6, height: 32 },
  badgeNameLocked: { color: Colors.textDim },
  rarityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  rarityText: { fontSize: 9, fontWeight: FontWeights.bold },
  progressMini: { height: 3, width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 8 },
  progressMiniFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  lockIcon: { position: 'absolute', top: 8, right: 8 },
});

export default BadgesScreen;
