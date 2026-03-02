// SnapRoad Mobile - Leaderboard Screen
// Weekly rankings with filters

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';
import { Avatar } from '../components/ui';
import { useLeaderboardStore, useUserStore } from '../store';

interface LeaderboardScreenProps {
  navigation: any;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ navigation }) => {
  const { entries, filter, timeFilter, setFilter, setTimeFilter, currentUserRank } = useLeaderboardStore();
  const { user } = useUserStore();

  const filters = [
    { id: 'all', label: 'Global' },
    { id: 'state', label: user.state || 'State' },
    { id: 'friends', label: 'Friends' },
  ];

  const timeFilters = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'allTime', label: 'All Time' },
  ];

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  const getPodiumStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return { color: Colors.gold, height: 120, gradient: [Colors.gold, '#F59E0B'] };
      case 2:
        return { color: Colors.silver, height: 100, gradient: ['#CBD5E1', '#94A3B8'] };
      case 3:
        return { color: Colors.bronze, height: 80, gradient: [Colors.bronze, '#EA580C'] };
      default:
        return { color: Colors.textSecondary, height: 60, gradient: [Colors.surface, Colors.surface] };
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, '#0a1929']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRow}>
              {filters.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterTab, filter === f.id && styles.filterTabActive]}
                  onPress={() => setFilter(f.id as any)}
                >
                  <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Time Filter */}
        <View style={styles.timeFilterContainer}>
          {timeFilters.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.timeTab, timeFilter === t.id && styles.timeTabActive]}
              onPress={() => setTimeFilter(t.id as any)}
            >
              <Text style={[styles.timeText, timeFilter === t.id && styles.timeTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Podium */}
          <View style={styles.podiumContainer}>
            {/* 2nd Place */}
            {topThree[1] && (
              <View style={styles.podiumItem}>
                <Avatar name={topThree[1].name} size={60} showLevel level={topThree[1].level} />
                <Text style={styles.podiumName} numberOfLines={1}>{topThree[1].name}</Text>
                <Text style={styles.podiumScore}>{topThree[1].score.toLocaleString()}</Text>
                <LinearGradient
                  colors={getPodiumStyle(2).gradient as [string, string]}
                  style={[styles.podiumBar, { height: getPodiumStyle(2).height }]}
                >
                  <Text style={styles.podiumRank}>2</Text>
                </LinearGradient>
              </View>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <View style={[styles.podiumItem, styles.podiumFirst]}>
                <View style={styles.crownContainer}>
                  <Ionicons name="crown" size={24} color={Colors.gold} />
                </View>
                <Avatar name={topThree[0].name} size={72} showLevel level={topThree[0].level} />
                <Text style={styles.podiumName} numberOfLines={1}>{topThree[0].name}</Text>
                <Text style={[styles.podiumScore, { color: Colors.gold }]}>
                  {topThree[0].score.toLocaleString()}
                </Text>
                <LinearGradient
                  colors={getPodiumStyle(1).gradient as [string, string]}
                  style={[styles.podiumBar, { height: getPodiumStyle(1).height }]}
                >
                  <Text style={styles.podiumRank}>1</Text>
                </LinearGradient>
              </View>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <View style={styles.podiumItem}>
                <Avatar name={topThree[2].name} size={56} showLevel level={topThree[2].level} />
                <Text style={styles.podiumName} numberOfLines={1}>{topThree[2].name}</Text>
                <Text style={styles.podiumScore}>{topThree[2].score.toLocaleString()}</Text>
                <LinearGradient
                  colors={getPodiumStyle(3).gradient as [string, string]}
                  style={[styles.podiumBar, { height: getPodiumStyle(3).height }]}
                >
                  <Text style={styles.podiumRank}>3</Text>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* Rest of the list */}
          <View style={styles.listContainer}>
            {rest.map((entry) => (
              <View
                key={entry.userId}
                style={[styles.listItem, entry.isCurrentUser && styles.listItemCurrent]}
              >
                <Text style={styles.listRank}>#{entry.rank}</Text>
                <Avatar name={entry.name} size={44} />
                <View style={styles.listInfo}>
                  <Text style={[styles.listName, entry.isCurrentUser && styles.listNameCurrent]}>
                    {entry.name}
                    {entry.isCurrentUser && ' (You)'}
                  </Text>
                  <Text style={styles.listLevel}>Level {entry.level}</Text>
                </View>
                <View style={styles.listScore}>
                  <Text style={styles.listScoreValue}>{entry.score.toLocaleString()}</Text>
                  <Text style={styles.listScoreLabel}>XP</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Your Rank Card */}
          <View style={styles.yourRankCard}>
            <LinearGradient colors={Colors.gradientPrimary} style={styles.yourRankGradient}>
              <View style={styles.yourRankContent}>
                <Text style={styles.yourRankLabel}>Your Position</Text>
                <Text style={styles.yourRankValue}>#{currentUserRank}</Text>
              </View>
              <View style={styles.yourRankDivider} />
              <View style={styles.yourRankContent}>
                <Text style={styles.yourRankLabel}>Points to Next</Text>
                <Text style={styles.yourRankValue}>+850</Text>
              </View>
            </LinearGradient>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  filterTextActive: {
    color: Colors.text,
  },
  timeFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  timeTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  timeTabActive: {
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  timeText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  timeTextActive: {
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: Spacing.xl,
    paddingTop: 40,
  },
  podiumItem: {
    alignItems: 'center',
    width: 100,
  },
  podiumFirst: {
    marginHorizontal: Spacing.md,
  },
  crownContainer: {
    position: 'absolute',
    top: -30,
  },
  podiumName: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    marginTop: 8,
    maxWidth: 90,
  },
  podiumScore: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    marginBottom: 8,
  },
  podiumBar: {
    width: 70,
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  podiumRank: {
    color: Colors.background,
    fontSize: 24,
    fontWeight: FontWeights.bold,
  },
  listContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  listItemCurrent: {
    backgroundColor: `${Colors.primary}15`,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  listRank: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    width: 40,
  },
  listInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  listName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  listNameCurrent: {
    color: Colors.primary,
  },
  listLevel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  listScore: {
    alignItems: 'flex-end',
  },
  listScoreValue: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  listScoreLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  yourRankCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  yourRankGradient: {
    flexDirection: 'row',
    padding: Spacing.lg,
  },
  yourRankContent: {
    flex: 1,
    alignItems: 'center',
  },
  yourRankLabel: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    opacity: 0.8,
    marginBottom: 4,
  },
  yourRankValue: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: FontWeights.bold,
  },
  yourRankDivider: {
    width: 1,
    backgroundColor: `${Colors.text}30`,
    marginHorizontal: Spacing.md,
  },
});

export default LeaderboardScreen;
