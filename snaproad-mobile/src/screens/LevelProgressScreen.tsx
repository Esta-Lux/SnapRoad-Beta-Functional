// SnapRoad Mobile - Level Progress Screen
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Colors, FontSizes, FontWeights } from '../utils/theme';
import { useUserStore } from '../store';

const { width: SCREEN_W } = Dimensions.get('window');

interface LevelBenefit {
  level: number;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  unlocked: boolean;
}

const LEVEL_BENEFITS: LevelBenefit[] = [
  { level: 1, title: 'Getting Started', description: 'Access basic features', icon: 'flag', unlocked: true },
  { level: 3, title: 'Map Widgets', description: 'Unlock draggable widgets', icon: 'apps', unlocked: true },
  { level: 5, title: 'Car Studio', description: 'More car colors', icon: 'color-palette', unlocked: true },
  { level: 8, title: 'Challenges', description: 'Access weekly challenges', icon: 'trophy', unlocked: false },
  { level: 10, title: 'Leaderboard', description: 'Global rankings', icon: 'podium', unlocked: false },
  { level: 15, title: 'Premium Colors', description: 'Exclusive car paints', icon: 'sparkles', unlocked: false },
  { level: 20, title: 'Route Master', description: 'Advanced route planning', icon: 'git-branch', unlocked: false },
  { level: 25, title: 'Elite Status', description: 'VIP perks & rewards', icon: 'diamond', unlocked: false },
];

export const LevelProgressScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();

  const currentLevel = user?.level || 5;
  const currentXP = 4250;
  const xpForNextLevel = 5000;
  const totalXP = 12450;
  const progress = (currentXP / xpForNextLevel) * 100;

  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.title}>Level Progress</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Level Circle */}
        <View style={s.levelCircleContainer}>
          <Svg width={180} height={180}>
            <Circle cx={90} cy={90} r={70} stroke="rgba(255,255,255,0.2)" strokeWidth={12} fill="none" />
            <Circle
              cx={90} cy={90} r={70}
              stroke="#fff"
              strokeWidth={12}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              rotation={-90}
              origin="90, 90"
            />
          </Svg>
          <View style={s.levelCircleContent}>
            <Text style={s.levelLabel}>LEVEL</Text>
            <Text style={s.levelNumber}>{currentLevel}</Text>
          </View>
        </View>

        {/* XP Info */}
        <View style={s.xpInfo}>
          <View style={s.xpItem}>
            <Text style={s.xpValue}>{currentXP.toLocaleString()}</Text>
            <Text style={s.xpLabel}>Current XP</Text>
          </View>
          <View style={s.xpDivider} />
          <View style={s.xpItem}>
            <Text style={s.xpValue}>{(xpForNextLevel - currentXP).toLocaleString()}</Text>
            <Text style={s.xpLabel}>To Level {currentLevel + 1}</Text>
          </View>
          <View style={s.xpDivider} />
          <View style={s.xpItem}>
            <Text style={s.xpValue}>{totalXP.toLocaleString()}</Text>
            <Text style={s.xpLabel}>Total XP</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* XP Progress Bar */}
        <View style={s.progressCard}>
          <View style={s.progressHeader}>
            <Text style={s.progressTitle}>Progress to Level {currentLevel + 1}</Text>
            <Text style={s.progressPercent}>{Math.round(progress)}%</Text>
          </View>
          <View style={s.progressBar}>
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={[s.progressFill, { width: `${progress}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          </View>
          <Text style={s.progressSubtext}>{currentXP.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP</Text>
        </View>

        {/* How to Earn XP */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>How to Earn XP</Text>
          <View style={s.xpMethodsGrid}>
            {[
              { icon: 'car', label: 'Complete Trips', xp: '+50-200' },
              { icon: 'shield-checkmark', label: 'Safe Driving', xp: '+100' },
              { icon: 'flag', label: 'Challenges', xp: '+500-2000' },
              { icon: 'alert-circle', label: 'Road Reports', xp: '+25' },
              { icon: 'gift', label: 'Redeem Offers', xp: '+50' },
              { icon: 'flame', label: 'Daily Streak', xp: '+100/day' },
            ].map((method, i) => (
              <View key={i} style={s.xpMethodCard}>
                <Ionicons name={method.icon as any} size={20} color={Colors.primary} />
                <Text style={s.xpMethodLabel}>{method.label}</Text>
                <Text style={s.xpMethodValue}>{method.xp}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Level Benefits */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Level Rewards</Text>
          {LEVEL_BENEFITS.map((benefit, i) => (
            <View key={i} style={[s.benefitCard, !benefit.unlocked && s.benefitCardLocked]}>
              <View style={[s.benefitLevel, benefit.unlocked && s.benefitLevelUnlocked]}>
                <Text style={[s.benefitLevelText, benefit.unlocked && s.benefitLevelTextUnlocked]}>{benefit.level}</Text>
              </View>
              <View style={s.benefitInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[s.benefitTitle, !benefit.unlocked && s.benefitTitleLocked]}>{benefit.title}</Text>
                  {benefit.unlocked && (
                    <View style={s.unlockedBadge}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </View>
                <Text style={s.benefitDesc}>{benefit.description}</Text>
              </View>
              <View style={[s.benefitIcon, benefit.unlocked && s.benefitIconUnlocked]}>
                <Ionicons name={benefit.icon} size={20} color={benefit.unlocked ? '#4F46E5' : Colors.textDim} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 24 },
  title: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  // Level Circle
  levelCircleContainer: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  levelCircleContent: { position: 'absolute', alignItems: 'center' },
  levelLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, letterSpacing: 2, fontWeight: FontWeights.medium },
  levelNumber: { color: '#fff', fontSize: 56, fontWeight: FontWeights.bold },
  // XP Info
  xpInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  xpItem: { alignItems: 'center', paddingHorizontal: 16 },
  xpValue: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  xpLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 },
  xpDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  // Progress Card
  progressCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.glassBorder },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressTitle: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  progressPercent: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  progressBar: { height: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  progressSubtext: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 8, textAlign: 'center' },
  // Section
  section: { marginBottom: 24 },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold, marginBottom: 12 },
  // XP Methods
  xpMethodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  xpMethodCard: { width: (SCREEN_W - 48) / 3, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.glassBorder },
  xpMethodLabel: { color: Colors.textSecondary, fontSize: 10, marginTop: 6, textAlign: 'center' },
  xpMethodValue: { color: '#22C55E', fontSize: FontSizes.xs, fontWeight: FontWeights.bold, marginTop: 4 },
  // Benefits
  benefitCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.glassBorder },
  benefitCardLocked: { opacity: 0.6 },
  benefitLevel: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  benefitLevelUnlocked: { backgroundColor: 'rgba(79,70,229,0.15)' },
  benefitLevelText: { color: Colors.textDim, fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  benefitLevelTextUnlocked: { color: '#4F46E5' },
  benefitInfo: { flex: 1 },
  benefitTitle: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  benefitTitleLocked: { color: Colors.textMuted },
  benefitDesc: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  unlockedBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  benefitIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  benefitIconUnlocked: { backgroundColor: 'rgba(79,70,229,0.1)' },
});

export default LevelProgressScreen;
