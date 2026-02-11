// SnapRoad Mobile - Rewards Screen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore, useBadgesStore, useChallengesStore } from '../store';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, getXpProgress } from '../utils/theme';
import { Card, Badge as BadgeComponent, ProgressBar, GemDisplay } from '../components/ui';

const { width } = Dimensions.get('window');

type Tab = 'badges' | 'challenges' | 'car';

export const RewardsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useUserStore();
  const { badges } = useBadgesStore();
  const { challenges, joinChallenge } = useChallengesStore();
  const [activeTab, setActiveTab] = useState<Tab>('badges');

  const earnedBadges = badges.filter((b) => b.earned);
  const unlockedBadges = badges.filter((b) => !b.earned);
  const activeChallenges = challenges.filter((c) => c.joined);

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: Colors.common,
      rare: Colors.rare,
      epic: Colors.epic,
      legendary: Colors.legendary,
    };
    return colors[rarity] || Colors.common;
  };

  const renderBadgesTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Earned Badges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Earned ({earnedBadges.length})</Text>
        <View style={styles.badgesGrid}>
          {earnedBadges.map((badge) => (
            <TouchableOpacity
              key={badge.id}
              style={styles.badgeCard}
              onPress={() => navigation.navigate('BadgeDetail', { badge })}
            >
              <View style={[styles.badgeIcon, { borderColor: getRarityColor(badge.rarity) }]}>
                <Ionicons name={badge.icon as any} size={28} color={getRarityColor(badge.rarity)} />
              </View>
              <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
              <BadgeComponent label={badge.rarity} variant="default" size="sm" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Locked Badges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>In Progress ({unlockedBadges.length})</Text>
        <View style={styles.badgesGrid}>
          {unlockedBadges.map((badge) => (
            <TouchableOpacity key={badge.id} style={[styles.badgeCard, styles.badgeCardLocked]}>
              <View style={[styles.badgeIcon, styles.badgeIconLocked]}>
                <Ionicons name={badge.icon as any} size={28} color={Colors.textMuted} />
              </View>
              <Text style={[styles.badgeName, styles.badgeNameLocked]} numberOfLines={1}>
                {badge.name}
              </Text>
              {badge.progress !== undefined && badge.requirement && (
                <View style={styles.progressContainer}>
                  <ProgressBar
                    progress={badge.progress / badge.requirement}
                    height={4}
                    color={getRarityColor(badge.rarity)}
                  />
                  <Text style={styles.progressText}>
                    {badge.progress}/{badge.requirement}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderChallengesTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Challenges</Text>
          {activeChallenges.map((challenge) => (
            <Card key={challenge.id} style={styles.challengeCard}>
              <View style={styles.challengeHeader}>
                <View style={styles.challengeInfo}>
                  <Text style={styles.challengeTitle}>{challenge.title}</Text>
                  <Text style={styles.challengeDescription}>{challenge.description}</Text>
                </View>
                <View style={styles.challengeRewards}>
                  <View style={styles.rewardItem}>
                    <Ionicons name="flash" size={14} color={Colors.gold} />
                    <Text style={styles.rewardText}>{challenge.rewardXp} XP</Text>
                  </View>
                  <View style={styles.rewardItem}>
                    <Ionicons name="diamond" size={14} color={Colors.gem} />
                    <Text style={styles.rewardText}>{challenge.rewardGems}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.challengeProgress}>
                <ProgressBar
                  progress={challenge.currentProgress / challenge.goalValue}
                  height={8}
                  color={Colors.primary}
                />
                <Text style={styles.challengeProgressText}>
                  {challenge.currentProgress} / {challenge.goalValue} {challenge.goalType}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Available Challenges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Challenges</Text>
        {challenges.filter((c) => !c.joined).map((challenge) => (
          <Card key={challenge.id} style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <Text style={styles.challengeDescription}>{challenge.description}</Text>
                <View style={styles.participantsRow}>
                  <Ionicons name="people" size={14} color={Colors.textSecondary} />
                  <Text style={styles.participantsText}>
                    {challenge.participants?.toLocaleString()} joined
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => joinChallenge(challenge.id)}
              >
                <LinearGradient colors={Colors.gradientPrimary} style={styles.joinGradient}>
                  <Text style={styles.joinText}>Join</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={styles.challengeRewardsRow}>
              <View style={styles.rewardItem}>
                <Ionicons name="flash" size={16} color={Colors.gold} />
                <Text style={styles.rewardTextLarge}>{challenge.rewardXp} XP</Text>
              </View>
              <View style={styles.rewardItem}>
                <Ionicons name="diamond" size={16} color={Colors.gem} />
                <Text style={styles.rewardTextLarge}>{challenge.rewardGems} gems</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );

  const renderCarTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.carStudioButton}
          onPress={() => navigation.navigate('CarStudio')}
        >
          <LinearGradient
            colors={Colors.gradientAccent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.carStudioGradient}
          >
            <Ionicons name="color-palette" size={32} color={Colors.text} />
            <Text style={styles.carStudioTitle}>Car Studio</Text>
            <Text style={styles.carStudioSubtitle}>Customize your ride</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Current Car */}
        <Card style={styles.currentCarCard}>
          <Text style={styles.currentCarLabel}>Current Vehicle</Text>
          <View style={styles.currentCarInfo}>
            <View style={styles.carPreview}>
              <Ionicons name="car-sport" size={64} color={Colors.primary} />
            </View>
            <View style={styles.carDetails}>
              <Text style={styles.carName}>
                {user.carCategory.charAt(0).toUpperCase() + user.carCategory.slice(1)}
              </Text>
              <Text style={styles.carColor}>{user.carColor.replace('-', ' ')}</Text>
            </View>
          </View>
        </Card>

        {/* Owned Colors */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Owned Colors</Text>
        <View style={styles.colorsGrid}>
          {['#1a1a2e', '#f8fafc', '#3b82f6', '#22c55e', '#ef4444'].map((color, idx) => (
            <View key={idx} style={[styles.colorSwatch, { backgroundColor: color }]}>
              {idx === 2 && (
                <Ionicons name="checkmark" size={20} color="#fff" />
              )}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Rewards</Text>
        <GemDisplay amount={user.gems} />
      </View>

      {/* XP Progress */}
      <Card style={styles.xpCard}>
        <View style={styles.xpHeader}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Lvl {user.level}</Text>
          </View>
          <View style={styles.xpInfo}>
            <Text style={styles.xpTitle}>{user.xp.toLocaleString()} XP</Text>
            <Text style={styles.xpSubtitle}>
              {Math.round(getXpProgress(user.xp, user.level) * 100)}% to Level {user.level + 1}
            </Text>
          </View>
        </View>
        <ProgressBar progress={getXpProgress(user.xp, user.level)} height={10} />
      </Card>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['badges', 'challenges', 'car'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'badges' && renderBadgesTab()}
        {activeTab === 'challenges' && renderChallengesTab()}
        {activeTab === 'car' && renderCarTab()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
  },

  // XP Card
  xpCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  xpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  levelBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
  },
  levelText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },
  xpInfo: {
    flex: 1,
  },
  xpTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  xpSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },

  // Sections
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.md,
  },

  // Badges Grid
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  badgeCard: {
    width: (width - Spacing.lg * 2 - Spacing.md * 2) / 3,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  badgeCardLocked: {
    opacity: 0.7,
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: `${Colors.primary}10`,
  },
  badgeIconLocked: {
    borderColor: Colors.textMuted,
    backgroundColor: Colors.surfaceLight,
  },
  badgeName: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeNameLocked: {
    color: Colors.textSecondary,
  },
  progressContainer: {
    width: '100%',
    marginTop: 4,
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    textAlign: 'center',
    marginTop: 2,
  },

  // Challenges
  challengeCard: {
    marginBottom: Spacing.md,
  },
  challengeHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  challengeDescription: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 4,
  },
  challengeRewards: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  rewardTextLarge: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  challengeProgress: {
    gap: 4,
  },
  challengeProgressText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    textAlign: 'right',
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  participantsText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  joinButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  joinGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  joinText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },
  challengeRewardsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
  },

  // Car Tab
  carStudioButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  carStudioGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  carStudioTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    marginTop: Spacing.md,
  },
  carStudioSubtitle: {
    color: Colors.text,
    fontSize: FontSizes.md,
    opacity: 0.8,
  },
  currentCarCard: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  currentCarLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
  },
  currentCarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  carPreview: {
    width: 100,
    height: 100,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carDetails: {
    alignItems: 'flex-start',
  },
  carName: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  carColor: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textTransform: 'capitalize',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  colorSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surfaceLight,
  },
});
