// SnapRoad Mobile - Profile Screen
// User stats, settings, and account management

import React from 'react';
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
import { Card, ProgressBar, Avatar, Badge, GemDisplay } from '../components/ui';
import { useUserStore, useTripsStore, useGasStationsStore } from '../store';

const { width } = Dimensions.get('window');

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user } = useUserStore();
  const { trips } = useTripsStore();
  const { stations, averagePrice } = useGasStationsStore();

  const recentTrips = trips.slice(0, 3);
  const xpProgress = (user.xp % 500) / 500; // XP to next level

  const menuItems = [
    { id: 'analytics', icon: 'analytics', label: 'Trip Analytics', color: Colors.accent, screen: 'TripAnalytics' },
    { id: 'routes', icon: 'map', label: 'Route History', color: '#7c3aed', screen: 'RouteHistory3D' },
    { id: 'trips', icon: 'car', label: 'Trip Logs', color: Colors.primary, screen: 'TripLogs' },
    { id: 'fuel', icon: 'water', label: 'Fuel Dashboard', color: Colors.warning, screen: 'FuelDashboard' },
    { id: 'leaderboard', icon: 'trophy', label: 'Leaderboard', color: Colors.gold, screen: 'Leaderboard' },
    { id: 'orion', icon: 'chatbubble-ellipses', label: 'Orion AI Coach', color: Colors.success, screen: 'OrionCoach' },
    { id: 'offers', icon: 'gift', label: 'My Offers', color: Colors.info, screen: 'MyOffers' },
    { id: 'friends', icon: 'people', label: 'Family & Friends', color: '#f472b6', screen: 'Family' },
    { id: 'settings', icon: 'settings', label: 'Settings', color: Colors.textSecondary, screen: 'Settings' },
    { id: 'help', icon: 'help-circle', label: 'Help & Support', color: Colors.textMuted },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <LinearGradient
            colors={Colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileBg}
          />
          
          <View style={styles.profileContent}>
            <Avatar name={user.name} size={80} showLevel level={user.level} />
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userLocation}>
              <Ionicons name="location" size={12} color={Colors.textSecondary} /> {user.city}, {user.state}
            </Text>
            
            <View style={styles.planBadge}>
              {user.isPremium ? (
                <>
                  <Ionicons name="star" size={14} color={Colors.gold} />
                  <Text style={styles.planText}>Premium Member</Text>
                </>
              ) : (
                <Text style={styles.planTextBasic}>Basic Plan</Text>
              )}
            </View>
          </View>
        </View>

        {/* XP Progress */}
        <Card style={styles.xpCard}>
          <View style={styles.xpHeader}>
            <View>
              <Text style={styles.xpLabel}>Level {user.level}</Text>
              <Text style={styles.xpValue}>{user.xp.toLocaleString()} XP</Text>
            </View>
            <GemDisplay amount={user.gems} />
          </View>
          <View style={styles.xpProgress}>
            <ProgressBar progress={xpProgress} color={Colors.primary} height={8} />
            <Text style={styles.xpNext}>{Math.round(xpProgress * 100)}% to Level {user.level + 1}</Text>
          </View>
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.success} />
            <Text style={styles.statValue}>{user.safetyScore}</Text>
            <Text style={styles.statLabel}>Safety Score</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="speedometer" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{user.totalMiles.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Miles</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="flag" size={24} color={Colors.info} />
            <Text style={styles.statValue}>{user.totalTrips}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="wallet" size={24} color={Colors.success} />
            <Text style={styles.statValue}>${user.totalSavings.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </Card>
        </View>

        {/* Gas Prices */}
        <Card style={styles.gasCard}>
          <View style={styles.gasHeader}>
            <View style={styles.gasIcon}>
              <Ionicons name="flame" size={20} color={Colors.gas} />
            </View>
            <View>
              <Text style={styles.gasTitle}>Nearby Gas Prices</Text>
              <Text style={styles.gasSubtitle}>Average ${averagePrice.toFixed(2)}/gal</Text>
            </View>
            <TouchableOpacity style={styles.gasMoreBtn}>
              <Text style={styles.gasMoreText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.gasList}>
            {stations.slice(0, 3).map((station) => (
              <View key={station.id} style={styles.gasItem}>
                <View style={styles.gasStationInfo}>
                  <Text style={styles.gasStationName}>{station.name}</Text>
                  <Text style={styles.gasStationDistance}>{station.distance}</Text>
                </View>
                <Text style={[
                  styles.gasPrice,
                  station.price <= averagePrice && styles.gasPriceGood
                ]}>
                  ${station.price.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Recent Trips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>
            <TouchableOpacity>
              <Text style={styles.sectionAction}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {recentTrips.map((trip) => (
            <Card key={trip.id} style={styles.tripCard}>
              <View style={styles.tripRoute}>
                <View style={styles.tripDot} />
                <View style={styles.tripLine} />
                <View style={[styles.tripDot, styles.tripDotEnd]} />
              </View>
              <View style={styles.tripInfo}>
                <Text style={styles.tripLocation}>{trip.startLocation}</Text>
                <Text style={styles.tripLocation}>{trip.endLocation}</Text>
              </View>
              <View style={styles.tripStats}>
                <View style={styles.tripStatItem}>
                  <Ionicons name="speedometer" size={14} color={Colors.textSecondary} />
                  <Text style={styles.tripStatText}>{trip.distance} mi</Text>
                </View>
                <View style={styles.tripStatItem}>
                  <Ionicons name="shield" size={14} color={Colors.success} />
                  <Text style={styles.tripStatText}>{trip.safetyScore}</Text>
                </View>
                <View style={styles.tripStatItem}>
                  <Ionicons name="diamond" size={14} color={Colors.gem} />
                  <Text style={styles.tripStatText}>+{trip.gemsEarned}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => item.screen && navigation.navigate(item.screen)}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>SnapRoad v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileHeader: {
    position: 'relative',
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  profileBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    opacity: 0.2,
  },
  profileContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  userName: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: FontWeights.bold,
    marginTop: Spacing.md,
  },
  userLocation: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 4,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.gold}15`,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
    gap: 6,
  },
  planText: {
    color: Colors.gold,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  planTextBasic: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  xpCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  xpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  xpLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  xpValue: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  xpProgress: {},
  xpNext: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    textAlign: 'right',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  statValue: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: FontWeights.bold,
    marginTop: 8,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  gasCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  gasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  gasIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.gas}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  gasTitle: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  gasSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  gasMoreBtn: {
    marginLeft: 'auto',
  },
  gasMoreText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  gasList: {
    gap: Spacing.sm,
  },
  gasItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  gasStationInfo: {},
  gasStationName: {
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  gasStationDistance: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  gasPrice: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  gasPriceGood: {
    color: Colors.success,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  sectionAction: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tripRoute: {
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  tripDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  tripLine: {
    width: 2,
    height: 24,
    backgroundColor: Colors.surfaceLight,
    marginVertical: 2,
  },
  tripDotEnd: {
    backgroundColor: Colors.success,
  },
  tripInfo: {
    flex: 1,
    justifyContent: 'space-between',
    height: 44,
  },
  tripLocation: {
    color: Colors.text,
    fontSize: FontSizes.sm,
  },
  tripStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tripStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripStatText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  menuSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuLabel: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.lg,
    gap: 8,
    marginBottom: Spacing.lg,
  },
  logoutText: {
    color: Colors.error,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  version: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
});

export default ProfileScreen;
