// SnapRoad Mobile - Profile Screen

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore, useTripsStore, useGasStationsStore } from '../store';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';
import { Card, Avatar, StatCard, ProgressBar, GemDisplay } from '../components/ui';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useUserStore();
  const { trips } = useTripsStore();
  const { stations, averagePrice } = useGasStationsStore();

  const recentTrips = trips.slice(0, 3);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={Colors.gradientDark}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Avatar name={user.name} size={80} showLevel level={user.level} />
          <Text style={styles.userName}>{user.name}</Text>
          <View style={styles.planBadge}>
            <Ionicons
              name={user.isPremium ? 'star' : 'person'}
              size={14}
              color={user.isPremium ? Colors.gold : Colors.textSecondary}
            />
            <Text style={[styles.planText, user.isPremium && styles.planTextPremium]}>
              {user.isPremium ? 'Premium' : 'Basic'} Plan
            </Text>
          </View>
        </View>
        <GemDisplay amount={user.gems} size="lg" />
      </LinearGradient>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          label="Safety Score"
          value={user.safetyScore}
          icon="shield-checkmark"
          color={Colors.success}
        />
        <StatCard
          label="Total Miles"
          value={`${user.totalMiles.toFixed(0)}`}
          icon="speedometer"
          color={Colors.info}
        />
        <StatCard
          label="Trips"
          value={user.totalTrips}
          icon="navigate"
          color={Colors.primary}
        />
      </View>

      {/* Savings Card */}
      <Card style={styles.savingsCard}>
        <View style={styles.savingsHeader}>
          <Ionicons name="wallet" size={24} color={Colors.success} />
          <Text style={styles.savingsTitle}>Total Savings</Text>
        </View>
        <Text style={styles.savingsAmount}>${user.totalSavings.toFixed(2)}</Text>
        <View style={styles.savingsBreakdown}>
          <View style={styles.savingsItem}>
            <Text style={styles.savingsLabel}>Gas Savings</Text>
            <Text style={styles.savingsValue}>${(user.totalSavings * 0.6).toFixed(2)}</Text>
          </View>
          <View style={styles.savingsItem}>
            <Text style={styles.savingsLabel}>Offer Discounts</Text>
            <Text style={styles.savingsValue}>${(user.totalSavings * 0.4).toFixed(2)}</Text>
          </View>
        </View>
      </Card>

      {/* Gas Prices */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Gas Prices</Text>
          <Text style={styles.avgPrice}>Avg: ${averagePrice.toFixed(2)}</Text>
        </View>
        {stations.slice(0, 3).map((station) => (
          <View key={station.id} style={styles.gasStation}>
            <View style={styles.stationInfo}>
              <Text style={styles.stationName}>{station.name}</Text>
              <Text style={styles.stationDistance}>{station.distance}</Text>
            </View>
            <Text style={[
              styles.gasPrice,
              station.price < averagePrice && styles.gasPriceLow
            ]}>
              ${station.price.toFixed(2)}
            </Text>
          </View>
        ))}
      </Card>

      {/* My Car */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Car</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CarStudio')}>
            <Text style={styles.customizeLink}>Customize →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.carPreview}>
          <View style={styles.carIcon}>
            <Ionicons name="car-sport" size={48} color={Colors.primary} />
          </View>
          <View style={styles.carInfo}>
            <Text style={styles.carName}>
              {user.carCategory.charAt(0).toUpperCase() + user.carCategory.slice(1)}
            </Text>
            <Text style={styles.carColor}>{user.carColor.replace('-', ' ')}</Text>
          </View>
        </View>
      </Card>

      {/* Recent Trips */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Trips</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllLink}>View All</Text>
          </TouchableOpacity>
        </View>
        {recentTrips.map((trip) => (
          <View key={trip.id} style={styles.tripItem}>
            <View style={styles.tripRoute}>
              <View style={styles.tripDot} />
              <View style={styles.tripLine} />
              <View style={[styles.tripDot, styles.tripDotEnd]} />
            </View>
            <View style={styles.tripInfo}>
              <Text style={styles.tripText}>{trip.startLocation}</Text>
              <Text style={styles.tripText}>{trip.endLocation}</Text>
            </View>
            <View style={styles.tripStats}>
              <Text style={styles.tripDistance}>{trip.distance} mi</Text>
              <View style={styles.tripScore}>
                <Ionicons name="shield-checkmark" size={12} color={Colors.success} />
                <Text style={styles.tripScoreText}>{trip.safetyScore}</Text>
              </View>
            </View>
          </View>
        ))}
      </Card>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Leaderboard')}>
          <LinearGradient colors={Colors.gradientPrimary} style={styles.actionGradient}>
            <Ionicons name="trophy" size={24} color={Colors.text} />
            <Text style={styles.actionText}>Leaderboard</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Settings')}>
          <View style={styles.actionPlain}>
            <Ionicons name="settings" size={24} color={Colors.textSecondary} />
            <Text style={styles.actionTextPlain}>Settings</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Upgrade Banner */}
      {!user.isPremium && (
        <TouchableOpacity style={styles.upgradeBanner}>
          <LinearGradient
            colors={Colors.gradientGold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgradeGradient}
          >
            <View style={styles.upgradeContent}>
              <Ionicons name="star" size={28} color={Colors.background} />
              <View style={styles.upgradeText}>
                <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
                <Text style={styles.upgradeSubtitle}>Get 2x rewards & exclusive offers</Text>
              </View>
            </View>
            <Text style={styles.upgradePrice}>$4.99/mo</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  userName: {
    color: Colors.text,
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    marginTop: Spacing.md,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginTop: 8,
    gap: 6,
  },
  planText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  planTextPremium: {
    color: Colors.gold,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginTop: -Spacing.lg,
    gap: Spacing.md,
  },

  // Savings Card
  savingsCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  savingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  savingsTitle: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  savingsAmount: {
    color: Colors.success,
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.md,
  },
  savingsBreakdown: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  savingsItem: {
    flex: 1,
  },
  savingsLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  savingsValue: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginTop: 2,
  },

  // Section
  section: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  avgPrice: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  viewAllLink: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  customizeLink: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },

  // Gas Stations
  gasStation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  stationInfo: {},
  stationName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  stationDistance: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  gasPrice: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  gasPriceLow: {
    color: Colors.success,
  },

  // Car Preview
  carPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  carIcon: {
    width: 80,
    height: 80,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carInfo: {},
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

  // Trips
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  tripRoute: {
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  tripDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  tripLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.surfaceLight,
  },
  tripDotEnd: {
    backgroundColor: Colors.success,
  },
  tripInfo: {
    flex: 1,
    gap: 4,
  },
  tripText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  tripStats: {
    alignItems: 'flex-end',
  },
  tripDistance: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  tripScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripScoreText: {
    color: Colors.success,
    fontSize: FontSizes.sm,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  actionText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  actionPlain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
  },
  actionTextPlain: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },

  // Upgrade Banner
  upgradeBanner: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  upgradeText: {},
  upgradeTitle: {
    color: Colors.background,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  upgradeSubtitle: {
    color: Colors.background,
    fontSize: FontSizes.sm,
    opacity: 0.8,
  },
  upgradePrice: {
    color: Colors.background,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
});
