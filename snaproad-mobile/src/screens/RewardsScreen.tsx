// SnapRoad Mobile - Rewards Screen
// Badges, challenges, and car studio

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
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';
import { Card, Badge, ProgressBar, GemDisplay } from '../components/ui';
import { useUserStore, useBadgesStore, useChallengesStore } from '../store';

const { width } = Dimensions.get('window');

type RewardsTab = 'challenges' | 'badges' | 'carstudio';

interface RewardsScreenProps {
  navigation: any;
}

export const RewardsScreen: React.FC<RewardsScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<RewardsTab>('challenges');
  const { user } = useUserStore();
  const { badges } = useBadgesStore();
  const { challenges, joinChallenge } = useChallengesStore();

  const earnedBadges = badges.filter(b => b.earned);
  const inProgressBadges = badges.filter(b => !b.earned && b.progress !== undefined);

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: Colors.common,
      rare: Colors.rare,
      epic: Colors.epic,
      legendary: Colors.legendary,
    };
    return colors[rarity] || Colors.common;
  };

  const tabs = [
    { id: 'challenges', label: 'Challenges', icon: 'trophy' },
    { id: 'badges', label: 'Badges', icon: 'ribbon' },
    { id: 'carstudio', label: 'Car Studio', icon: 'color-palette' },
  ];

  const renderChallenges = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Active Challenges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Challenges</Text>
        {challenges.filter(c => c.joined).map((challenge) => (
          <Card key={challenge.id} style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <View style={styles.challengeIcon}>
                <Ionicons name="flash" size={24} color={Colors.gold} />
              </View>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <Text style={styles.challengeDescription}>{challenge.description}</Text>
              </View>
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  {challenge.currentProgress} / {challenge.goalValue}
                </Text>
                <Text style={styles.progressPercent}>
                  {Math.round((challenge.currentProgress / challenge.goalValue) * 100)}%
                </Text>
              </View>
              <ProgressBar
                progress={challenge.currentProgress / challenge.goalValue}
                color={Colors.primary}
                height={8}
              />
            </View>

            <View style={styles.rewardsRow}>
              <View style={styles.rewardItem}>
                <Ionicons name="star" size={16} color={Colors.gold} />
                <Text style={styles.rewardText}>{challenge.rewardXp} XP</Text>
              </View>
              <View style={styles.rewardItem}>
                <Ionicons name="diamond" size={16} color={Colors.gem} />
                <Text style={styles.rewardText}>{challenge.rewardGems} Gems</Text>
              </View>
              <View style={styles.participantsTag}>
                <Ionicons name="people" size={14} color={Colors.textSecondary} />
                <Text style={styles.participantsText}>
                  {challenge.participants.toLocaleString()}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      {/* Available Challenges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Join a Challenge</Text>
        {challenges.filter(c => !c.joined).map((challenge) => (
          <Card key={challenge.id} style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <View style={[styles.challengeIcon, { backgroundColor: `${Colors.info}20` }]}>
                <Ionicons name="flag" size={24} color={Colors.info} />
              </View>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <Text style={styles.challengeDescription}>{challenge.description}</Text>
              </View>
            </View>

            <View style={styles.rewardsRow}>
              <View style={styles.rewardItem}>
                <Ionicons name="star" size={16} color={Colors.gold} />
                <Text style={styles.rewardText}>{challenge.rewardXp} XP</Text>
              </View>
              <View style={styles.rewardItem}>
                <Ionicons name="diamond" size={16} color={Colors.gem} />
                <Text style={styles.rewardText}>{challenge.rewardGems} Gems</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => joinChallenge(challenge.id)}
            >
              <Text style={styles.joinButtonText}>Join Challenge</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </Card>
        ))}
      </View>
    </ScrollView>
  );

  const renderBadges = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Stats */}
      <View style={styles.badgeStats}>
        <View style={styles.badgeStat}>
          <Text style={styles.badgeStatValue}>{earnedBadges.length}</Text>
          <Text style={styles.badgeStatLabel}>Earned</Text>
        </View>
        <View style={styles.badgeStatDivider} />
        <View style={styles.badgeStat}>
          <Text style={styles.badgeStatValue}>{badges.length}</Text>
          <Text style={styles.badgeStatLabel}>Total</Text>
        </View>
        <View style={styles.badgeStatDivider} />
        <View style={styles.badgeStat}>
          <Text style={styles.badgeStatValue}>
            {Math.round((earnedBadges.length / badges.length) * 100)}%
          </Text>
          <Text style={styles.badgeStatLabel}>Complete</Text>
        </View>
      </View>

      {/* In Progress */}
      {inProgressBadges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>In Progress</Text>
          {inProgressBadges.map((badge) => (
            <Card key={badge.id} style={styles.badgeCard}>
              <View style={[styles.badgeIcon, { borderColor: getRarityColor(badge.rarity) }]}>
                <Ionicons name={badge.icon as any} size={24} color={getRarityColor(badge.rarity)} />
              </View>
              <View style={styles.badgeInfo}>
                <View style={styles.badgeNameRow}>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Badge label={badge.rarity} variant="default" size="sm" />
                </View>
                <Text style={styles.badgeDescription}>{badge.description}</Text>
                <View style={styles.badgeProgress}>
                  <ProgressBar
                    progress={(badge.progress || 0) / (badge.requirement || 1)}
                    color={getRarityColor(badge.rarity)}
                    height={6}
                  />
                  <Text style={styles.badgeProgressText}>
                    {badge.progress} / {badge.requirement}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Earned */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Earned Badges</Text>
        <View style={styles.badgesGrid}>
          {earnedBadges.map((badge) => (
            <TouchableOpacity key={badge.id} style={styles.earnedBadge}>
              <View style={[styles.earnedBadgeIcon, { backgroundColor: `${getRarityColor(badge.rarity)}20` }]}>
                <Ionicons name={badge.icon as any} size={28} color={getRarityColor(badge.rarity)} />
              </View>
              <Text style={styles.earnedBadgeName} numberOfLines={1}>{badge.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderCarStudio = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Current Car Preview */}
      <View style={styles.carPreview}>
        <LinearGradient
          colors={[`${Colors.primary}40`, 'transparent']}
          style={styles.carPreviewGlow}
        />
        <View style={styles.carPreviewIcon}>
          <Ionicons name="car-sport" size={80} color={Colors.primary} />
        </View>
        <Text style={styles.carPreviewName}>
          {user.carCategory.charAt(0).toUpperCase() + user.carCategory.slice(1)} - {user.carColor}
        </Text>
      </View>

      {/* Options */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.studioOption}>
          <View style={[styles.studioOptionIcon, { backgroundColor: `${Colors.primary}20` }]}>
            <Ionicons name="color-palette" size={24} color={Colors.primary} />
          </View>
          <View style={styles.studioOptionInfo}>
            <Text style={styles.studioOptionTitle}>Change Color</Text>
            <Text style={styles.studioOptionDescription}>Customize your vehicle color</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.studioOption}>
          <View style={[styles.studioOptionIcon, { backgroundColor: `${Colors.accent}20` }]}>
            <Ionicons name="sparkles" size={24} color={Colors.accent} />
          </View>
          <View style={styles.studioOptionInfo}>
            <Text style={styles.studioOptionTitle}>Premium Skins</Text>
            <Text style={styles.studioOptionDescription}>Unlock exclusive designs</Text>
          </View>
          <View style={styles.premiumTag}>
            <Ionicons name="lock-closed" size={12} color={Colors.gold} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.studioOption}>
          <View style={[styles.studioOptionIcon, { backgroundColor: `${Colors.success}20` }]}>
            <Ionicons name="car" size={24} color={Colors.success} />
          </View>
          <View style={styles.studioOptionInfo}>
            <Text style={styles.studioOptionTitle}>Change Vehicle</Text>
            <Text style={styles.studioOptionDescription}>Switch car type</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Rewards</Text>
          <Text style={styles.headerSubtitle}>
            Level {user.level} • {user.xp.toLocaleString()} XP
          </Text>
        </View>
        <GemDisplay amount={user.gems} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.id as RewardsTab)}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={isActive ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'challenges' && renderChallenges()}
        {activeTab === 'badges' && renderBadges()}
        {activeTab === 'carstudio' && renderCarStudio()}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: FontWeights.bold,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    gap: 6,
  },
  tabActive: {
    backgroundColor: `${Colors.primary}15`,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tabLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.md,
  },
  // Challenges
  challengeCard: {
    marginBottom: Spacing.md,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  challengeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.gold}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: 2,
  },
  challengeDescription: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  progressPercent: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  rewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  participantsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  participantsText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: 8,
  },
  joinButtonText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  // Badges
  badgeStats: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  badgeStat: {
    flex: 1,
    alignItems: 'center',
  },
  badgeStatValue: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: FontWeights.bold,
  },
  badgeStatLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  badgeStatDivider: {
    width: 1,
    backgroundColor: Colors.surfaceLight,
    marginHorizontal: Spacing.md,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    backgroundColor: Colors.surfaceLight,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  badgeName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  badgeDescription: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginBottom: 8,
  },
  badgeProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  badgeProgressText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    minWidth: 50,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  earnedBadge: {
    width: (width - Spacing.lg * 2 - Spacing.md * 3) / 4,
    alignItems: 'center',
  },
  earnedBadgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  earnedBadgeName: {
    color: Colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
  },
  // Car Studio
  carPreview: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  carPreviewGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  carPreviewIcon: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  carPreviewName: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
  studioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  studioOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  studioOptionInfo: {
    flex: 1,
  },
  studioOptionTitle: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  studioOptionDescription: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  premiumTag: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${Colors.gold}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RewardsScreen;
