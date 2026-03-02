// SnapRoad Mobile - Trip Logs Screen
// Aligned with /app/frontend/src/components/figma-ui/mobile/TripLogs.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';
import { Card } from '../components/ui';

interface TripLogsScreenProps {
  navigation?: any;
  onNavigate?: (screen: string) => void;
}

interface Trip {
  id: string;
  date: string;
  startLocation: string;
  endLocation: string;
  distance: string;
  duration: string;
  safetyScore: number;
  gemsEarned: number;
  events: { type: string; count: number }[];
}

export const TripLogsScreen: React.FC<TripLogsScreenProps> = ({ navigation, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'all' | 'shared'>('all');
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('profile');
    } else if (navigation) {
      navigation.goBack();
    }
  };

  // Mock data
  const trips: Trip[] = [
    {
      id: '1',
      date: 'Today, 2:30 PM',
      startLocation: 'Home',
      endLocation: 'Downtown Office',
      distance: '12.4 mi',
      duration: '28 min',
      safetyScore: 95,
      gemsEarned: 45,
      events: [{ type: 'smooth_driving', count: 3 }],
    },
    {
      id: '2',
      date: 'Today, 9:15 AM',
      startLocation: 'Gas Station',
      endLocation: 'Home',
      distance: '3.2 mi',
      duration: '8 min',
      safetyScore: 100,
      gemsEarned: 15,
      events: [],
    },
    {
      id: '3',
      date: 'Yesterday, 6:45 PM',
      startLocation: 'Downtown Office',
      endLocation: 'Home',
      distance: '12.8 mi',
      duration: '35 min',
      safetyScore: 88,
      gemsEarned: 38,
      events: [{ type: 'hard_brake', count: 2 }],
    },
    {
      id: '4',
      date: 'Yesterday, 8:30 AM',
      startLocation: 'Home',
      endLocation: 'Coffee Shop',
      distance: '5.1 mi',
      duration: '12 min',
      safetyScore: 92,
      gemsEarned: 22,
      events: [{ type: 'speeding', count: 1 }],
    },
    {
      id: '5',
      date: 'Feb 15, 4:00 PM',
      startLocation: 'Mall',
      endLocation: 'Home',
      distance: '8.7 mi',
      duration: '22 min',
      safetyScore: 97,
      gemsEarned: 35,
      events: [],
    },
  ];

  const sharedTrips = [
    {
      id: 's1',
      date: 'Feb 14, 3:00 PM',
      sharedWith: 'Family',
      startLocation: 'Home',
      endLocation: 'Airport',
      distance: '24.5 mi',
      duration: '45 min',
      safetyScore: 94,
      gemsEarned: 65,
      events: [],
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 95) return Colors.success;
    if (score >= 85) return Colors.primary;
    if (score >= 70) return Colors.warning;
    return Colors.error;
  };

  const renderTripCard = ({ item }: { item: Trip }) => {
    const isExpanded = selectedTrip === item.id;
    
    return (
      <TouchableOpacity 
        onPress={() => setSelectedTrip(isExpanded ? null : item.id)}
        activeOpacity={0.8}
      >
        <Card style={[styles.tripCard, isExpanded && styles.tripCardExpanded]}>
          {/* Header */}
          <View style={styles.tripHeader}>
            <View>
              <Text style={styles.tripDate}>{item.date}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color={Colors.success} />
                <Text style={styles.locationText}>{item.startLocation}</Text>
                <Ionicons name="arrow-forward" size={12} color={Colors.textMuted} style={{ marginHorizontal: 4 }} />
                <Ionicons name="flag" size={14} color={Colors.error} />
                <Text style={styles.locationText}>{item.endLocation}</Text>
              </View>
            </View>
            <View style={[styles.scoreBadge, { backgroundColor: `${getScoreColor(item.safetyScore)}20` }]}>
              <Text style={[styles.scoreText, { color: getScoreColor(item.safetyScore) }]}>
                {item.safetyScore}
              </Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="speedometer-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.statText}>{item.distance}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.statText}>{item.duration}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="diamond" size={16} color={Colors.accent} />
              <Text style={[styles.statText, { color: Colors.accent }]}>+{item.gemsEarned}</Text>
            </View>
          </View>

          {/* Expanded Content */}
          {isExpanded && (
            <View style={styles.expandedContent}>
              <View style={styles.divider} />
              
              {/* Route Timeline */}
              <Text style={styles.expandedTitle}>Route Timeline</Text>
              <View style={styles.timeline}>
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: Colors.success }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Started</Text>
                    <Text style={styles.timelineValue}>{item.startLocation}</Text>
                  </View>
                </View>
                <View style={styles.timelineLine} />
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: Colors.error }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Arrived</Text>
                    <Text style={styles.timelineValue}>{item.endLocation}</Text>
                  </View>
                </View>
              </View>

              {/* Events */}
              {item.events.length > 0 && (
                <>
                  <Text style={styles.expandedTitle}>Events</Text>
                  {item.events.map((event, index) => (
                    <View key={index} style={styles.eventItem}>
                      <Ionicons 
                        name={event.type === 'smooth_driving' ? 'checkmark-circle' : 'warning'} 
                        size={18} 
                        color={event.type === 'smooth_driving' ? Colors.success : Colors.warning} 
                      />
                      <Text style={styles.eventText}>
                        {event.type.replace('_', ' ')} ({event.count}x)
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {/* Actions */}
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="share-outline" size={18} color={Colors.primary} />
                  <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="map-outline" size={18} color={Colors.primary} />
                  <Text style={styles.actionText}>View Map</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  const stats = {
    totalTrips: trips.length,
    totalDistance: '42.2 mi',
    avgScore: 94,
    totalGems: 155,
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Logs</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All Trips
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shared' && styles.tabActive]}
          onPress={() => setActiveTab('shared')}
        >
          <Text style={[styles.tabText, activeTab === 'shared' && styles.tabTextActive]}>
            Shared
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <LinearGradient
        colors={Colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.summaryCard}
      >
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{stats.totalTrips}</Text>
          <Text style={styles.summaryLabel}>Trips</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{stats.totalDistance}</Text>
          <Text style={styles.summaryLabel}>Distance</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{stats.avgScore}</Text>
          <Text style={styles.summaryLabel}>Avg Score</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <View style={styles.gemValue}>
            <Ionicons name="diamond" size={16} color={Colors.text} />
            <Text style={styles.summaryValue}>{stats.totalGems}</Text>
          </View>
          <Text style={styles.summaryLabel}>Gems</Text>
        </View>
      </LinearGradient>

      {/* Trip List */}
      <FlatList
        data={activeTab === 'all' ? trips : sharedTrips}
        renderItem={renderTripCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtitle}>Start driving to see your trip history</Text>
          </View>
        }
      />
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
  filterButton: {
    padding: Spacing.xs,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.md,
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
  summaryCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    opacity: 0.8,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.text,
    opacity: 0.2,
    marginVertical: 4,
  },
  gemValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
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
  tripDate: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginLeft: 4,
  },
  scoreBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  scoreText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FontSizes.sm,
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
  expandedTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  timeline: {
    marginBottom: Spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineContent: {
    marginLeft: Spacing.sm,
  },
  timelineLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  timelineValue: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.surfaceLight,
    marginLeft: 5,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  eventText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: `${Colors.primary}15`,
    borderRadius: BorderRadius.md,
  },
  actionText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
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

export default TripLogsScreen;
