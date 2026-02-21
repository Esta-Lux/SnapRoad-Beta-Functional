// SnapRoad Mobile - Trip Analytics Screen
// Comprehensive trip analytics with fuel savings calculations

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';
import { Card } from '../components/ui';
import api from '../services/api';

interface TripAnalyticsScreenProps {
  navigation?: any;
  onNavigate?: (screen: string) => void;
}

interface Trip {
  id: number;
  date: string;
  time: string;
  origin: string;
  destination: string;
  distance_miles: number;
  duration_minutes: number;
  safety_score: number;
  gems_earned: number;
  xp_earned: number;
  fuel_used_gallons: number;
  avg_speed_mph: number;
}

interface Analytics {
  total_trips: number;
  total_distance_miles: number;
  total_fuel_gallons: number;
  total_duration_hours: number;
  avg_safety_score: number;
  total_gems_earned: number;
  avg_mpg: number;
  fuel_saved_gallons: number;
  money_saved_dollars: number;
  co2_saved_lbs: number;
}

export const TripAnalyticsScreen: React.FC<TripAnalyticsScreenProps> = ({ navigation, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'trips' | 'savings' | 'stats'>('trips');
  const [dateRange, setDateRange] = useState(30);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTrip, setExpandedTrip] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'https://gamified-routes.preview.emergentagent.com'}/api/trips/history/detailed?days=${dateRange}`
      );
      const data = await response.json();
      if (data.success) {
        setTrips(data.data.trips || []);
        setAnalytics(data.data.analytics || null);
      }
    } catch (e) {
      console.log('Could not load trip analytics');
    }
    setLoading(false);
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('profile');
    } else if (navigation) {
      navigation.goBack();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return Colors.success;
    if (score >= 75) return Colors.warning;
    return Colors.error;
  };

  const renderTripItem = ({ item }: { item: Trip }) => {
    const isExpanded = expandedTrip === item.id;
    
    return (
      <TouchableOpacity
        onPress={() => setExpandedTrip(isExpanded ? null : item.id)}
        activeOpacity={0.8}
      >
        <Card style={[styles.tripCard, isExpanded && styles.tripCardExpanded]}>
          <View style={styles.tripHeader}>
            <View>
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.tripDate}>{item.date} • {item.time}</Text>
              </View>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color={Colors.success} />
                <Text style={styles.locationText}>{item.origin}</Text>
                <Ionicons name="arrow-forward" size={12} color={Colors.textMuted} style={{ marginHorizontal: 4 }} />
                <Text style={styles.locationText}>{item.destination}</Text>
              </View>
            </View>
            <View style={[styles.scoreBadge, { backgroundColor: `${getScoreColor(item.safety_score)}20` }]}>
              <Ionicons name="shield-checkmark" size={10} color={getScoreColor(item.safety_score)} />
              <Text style={[styles.scoreText, { color: getScoreColor(item.safety_score) }]}>
                {item.safety_score}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statText}>{item.distance_miles.toFixed(1)} mi</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statText}>{item.duration_minutes} min</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="diamond" size={12} color={Colors.accent} />
              <Text style={[styles.statText, { color: Colors.accent }]}>+{Math.round(item.gems_earned)}</Text>
            </View>
          </View>

          {isExpanded && (
            <View style={styles.expandedContent}>
              <View style={styles.divider} />
              <View style={styles.expandedStats}>
                <View style={styles.expandedStat}>
                  <Ionicons name="water" size={16} color={Colors.warning} />
                  <Text style={styles.expandedValue}>{item.fuel_used_gallons.toFixed(2)} gal</Text>
                  <Text style={styles.expandedLabel}>Fuel Used</Text>
                </View>
                <View style={styles.expandedStat}>
                  <Ionicons name="speedometer" size={16} color={Colors.primary} />
                  <Text style={styles.expandedValue}>{item.avg_speed_mph} mph</Text>
                  <Text style={styles.expandedLabel}>Avg Speed</Text>
                </View>
                <View style={styles.expandedStat}>
                  <Ionicons name="star" size={16} color={Colors.accent} />
                  <Text style={styles.expandedValue}>+{item.xp_earned}</Text>
                  <Text style={styles.expandedLabel}>XP Earned</Text>
                </View>
              </View>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  const renderSavingsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Savings Hero */}
      <LinearGradient
        colors={['#10b981', '#14b8a6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.savingsHero}
      >
        <Ionicons name="leaf" size={40} color="white" />
        <Text style={styles.savingsLabel}>Total Savings</Text>
        <Text style={styles.savingsValue}>${analytics?.money_saved_dollars.toFixed(2) || '0.00'}</Text>
        <Text style={styles.savingsSubtext}>Based on your efficient driving vs. avg vehicle</Text>
      </LinearGradient>

      {/* Savings Breakdown */}
      <View style={styles.savingsGrid}>
        <Card style={styles.savingsCard}>
          <Ionicons name="water" size={28} color={Colors.warning} />
          <Text style={styles.savingsCardValue}>{analytics?.fuel_saved_gallons.toFixed(1) || '0'}</Text>
          <Text style={styles.savingsCardLabel}>Gallons Saved</Text>
        </Card>
        <Card style={styles.savingsCard}>
          <Ionicons name="leaf" size={28} color={Colors.success} />
          <Text style={styles.savingsCardValue}>{analytics?.co2_saved_lbs.toFixed(0) || '0'}</Text>
          <Text style={styles.savingsCardLabel}>lbs CO2 Avoided</Text>
        </Card>
      </View>

      {/* Efficiency Rating */}
      <Card style={styles.efficiencyCard}>
        <View style={styles.efficiencyHeader}>
          <Text style={styles.efficiencyTitle}>Fuel Efficiency</Text>
          <Text style={styles.efficiencyValue}>{analytics?.avg_mpg || 0} MPG</Text>
        </View>
        <View style={styles.efficiencyBar}>
          <View 
            style={[
              styles.efficiencyFill, 
              { width: `${Math.min((analytics?.avg_mpg || 0) / 50 * 100, 100)}%` }
            ]} 
          />
        </View>
        <View style={styles.efficiencyLabels}>
          <Text style={styles.efficiencyLabel}>0 MPG</Text>
          <Text style={styles.efficiencyLabelCenter}>Nat'l Avg: 25.4</Text>
          <Text style={styles.efficiencyLabel}>50 MPG</Text>
        </View>
      </Card>
    </ScrollView>
  );

  const renderStatsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.statsCard}>
        <Text style={styles.statsCardTitle}>Distance & Time</Text>
        <View style={styles.statsCardGrid}>
          <View style={styles.statsCardItem}>
            <Text style={styles.statsCardValue}>{analytics?.total_distance_miles.toFixed(0) || 0}</Text>
            <Text style={styles.statsCardLabel}>Total Miles</Text>
          </View>
          <View style={styles.statsCardItem}>
            <Text style={styles.statsCardValue}>{analytics?.total_duration_hours.toFixed(1) || 0}</Text>
            <Text style={styles.statsCardLabel}>Hours Driven</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.statsCard}>
        <Text style={styles.statsCardTitle}>Fuel Consumption</Text>
        <View style={styles.statsCardGrid}>
          <View style={styles.statsCardItem}>
            <Text style={styles.statsCardValue}>{analytics?.total_fuel_gallons.toFixed(1) || 0}</Text>
            <Text style={styles.statsCardLabel}>Gallons Used</Text>
          </View>
          <View style={styles.statsCardItem}>
            <Text style={styles.statsCardValue}>{analytics?.avg_mpg || 0}</Text>
            <Text style={styles.statsCardLabel}>Avg MPG</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.statsCard}>
        <Text style={styles.statsCardTitle}>Safety & Rewards</Text>
        <View style={styles.statsCardGrid}>
          <View style={styles.statsCardItem}>
            <Text style={[styles.statsCardValue, { color: Colors.success }]}>
              {analytics?.avg_safety_score || 0}
            </Text>
            <Text style={styles.statsCardLabel}>Avg Safety Score</Text>
          </View>
          <View style={styles.statsCardItem}>
            <Text style={[styles.statsCardValue, { color: Colors.accent }]}>
              {Math.round(analytics?.total_gems_earned || 0)}
            </Text>
            <Text style={styles.statsCardLabel}>Gems Earned</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Quick Stats Bar */}
      {analytics && (
        <LinearGradient
          colors={Colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.quickStats}
        >
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{analytics.total_trips}</Text>
            <Text style={styles.quickStatLabel}>Trips</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{analytics.total_distance_miles.toFixed(0)}</Text>
            <Text style={styles.quickStatLabel}>Miles</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{analytics.avg_safety_score.toFixed(0)}</Text>
            <Text style={styles.quickStatLabel}>Avg Score</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={[styles.quickStatValue, { color: '#a7f3d0' }]}>
              ${analytics.money_saved_dollars.toFixed(0)}
            </Text>
            <Text style={styles.quickStatLabel}>Saved</Text>
          </View>
        </LinearGradient>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['trips', 'savings', 'stats'] as const).map((tab) => (
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

      {/* Date Range Filter */}
      <View style={styles.filterRow}>
        {[7, 30, 90].map((days) => (
          <TouchableOpacity
            key={days}
            style={[styles.filterChip, dateRange === days && styles.filterChipActive]}
            onPress={() => setDateRange(days)}
          >
            <Text style={[styles.filterChipText, dateRange === days && styles.filterChipTextActive]}>
              {days === 7 ? '7 Days' : days === 30 ? '30 Days' : '90 Days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'trips' && (
            <FlatList
              data={trips}
              renderItem={renderTripItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="car-outline" size={48} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>No trips recorded</Text>
                  <Text style={styles.emptySubtitle}>Start driving to see your analytics!</Text>
                </View>
              }
            />
          )}
          {activeTab === 'savings' && renderSavingsTab()}
          {activeTab === 'stats' && renderStatsTab()}
        </>
      )}
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  quickStats: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  quickStatLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    opacity: 0.8,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  tripCard: {
    marginBottom: Spacing.sm,
  },
  tripCardExpanded: {
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  tripDate: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginLeft: 4,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  scoreText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    gap: Spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  expandedContent: {
    marginTop: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceLight,
    marginBottom: Spacing.md,
  },
  expandedStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  expandedStat: {
    alignItems: 'center',
  },
  expandedValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginTop: 4,
  },
  expandedLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  // Savings tab styles
  savingsHero: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  savingsLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.sm,
  },
  savingsValue: {
    fontSize: 40,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  savingsSubtext: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  savingsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  savingsCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  savingsCardValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  savingsCardLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  efficiencyCard: {
    marginBottom: Spacing.md,
  },
  efficiencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  efficiencyTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  efficiencyValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.success,
  },
  efficiencyBar: {
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  efficiencyFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 4,
  },
  efficiencyLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  efficiencyLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  efficiencyLabelCenter: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  // Stats tab styles
  statsCard: {
    marginBottom: Spacing.md,
  },
  statsCardTitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  statsCardGrid: {
    flexDirection: 'row',
  },
  statsCardItem: {
    flex: 1,
  },
  statsCardValue: {
    fontSize: 28,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  statsCardLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});

export default TripAnalyticsScreen;
