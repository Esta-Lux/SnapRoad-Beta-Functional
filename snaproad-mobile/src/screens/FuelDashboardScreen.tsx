// SnapRoad Mobile - Fuel Dashboard Screen
// Aligned with /app/frontend/src/components/figma-ui/mobile/FuelDashboard.tsx

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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';
import { Card, ProgressBar } from '../components/ui';

const { width } = Dimensions.get('window');

interface FuelDashboardScreenProps {
  navigation?: any;
  onNavigate?: (screen: string) => void;
}

// Circular Progress Component
const CircularProgress = ({ 
  value, 
  maxValue = 100, 
  size = 180, 
  strokeWidth = 12 
}: { 
  value: number; 
  maxValue?: number; 
  size?: number; 
  strokeWidth?: number;
}) => {
  const progress = Math.min(value / maxValue, 1);
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {/* Background Circle */}
      <View style={[styles.circleTrack, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth }]} />
      
      {/* Progress Circle - using SVG would be better but this is a simplified version */}
      <LinearGradient
        colors={[Colors.success, Colors.primary]}
        style={[styles.circleProgress, { width: size, height: size, borderRadius: size / 2 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.circleInner, { width: size - strokeWidth * 2, height: size - strokeWidth * 2, borderRadius: (size - strokeWidth * 2) / 2 }]}>
          <Text style={styles.circleValue}>{value}</Text>
          <Text style={styles.circleLabel}>Eco Score</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

// Stat Item Component
const StatItem = ({ icon, label, value, trend }: { icon: string; label: string; value: string; trend?: string }) => (
  <View style={styles.statItem}>
    <View style={styles.statIconContainer}>
      <Ionicons name={icon as any} size={20} color={Colors.primary} />
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
    {trend && (
      <Text style={[styles.statTrend, { color: trend.startsWith('+') ? Colors.success : Colors.error }]}>
        {trend}
      </Text>
    )}
  </View>
);

export const FuelDashboardScreen: React.FC<FuelDashboardScreenProps> = ({ navigation, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'tips'>('overview');

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('profile');
    } else if (navigation) {
      navigation.goBack();
    }
  };

  // Mock data
  const fuelStats = {
    ecoScore: 82,
    avgMpg: 32.4,
    monthlySpend: 148.50,
    savingsEstimate: 24.30,
    totalGallons: 45.2,
    efficiency: 'good' as const,
  };

  const recentTrips = [
    { id: '1', date: 'Today', distance: '28.5 mi', mpg: 34.2, efficiency: 'excellent' },
    { id: '2', date: 'Yesterday', distance: '15.2 mi', mpg: 31.8, efficiency: 'good' },
    { id: '3', date: 'Feb 15', distance: '42.1 mi', mpg: 30.5, efficiency: 'good' },
    { id: '4', date: 'Feb 14', distance: '8.3 mi', mpg: 28.2, efficiency: 'average' },
  ];

  const tips = [
    { id: '1', title: 'Smooth Acceleration', description: 'Gentle starts save up to 15% fuel', impact: 'High' },
    { id: '2', title: 'Optimal Speed', description: 'Highway driving at 55-65 mph is most efficient', impact: 'Medium' },
    { id: '3', title: 'Tire Pressure', description: 'Check monthly - low pressure increases consumption', impact: 'Medium' },
  ];

  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency) {
      case 'excellent': return Colors.success;
      case 'good': return Colors.primary;
      case 'average': return Colors.warning;
      case 'poor': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fuel Dashboard</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['overview', 'history', 'tips'] as const).map((tab) => (
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && (
          <>
            {/* Eco Score Circle */}
            <View style={styles.scoreContainer}>
              <CircularProgress value={fuelStats.ecoScore} />
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <StatItem icon="speedometer" label="Avg MPG" value={fuelStats.avgMpg.toString()} trend="+2.3" />
              <StatItem icon="card" label="Monthly" value={`$${fuelStats.monthlySpend}`} trend="-8%" />
              <StatItem icon="leaf" label="Savings" value={`$${fuelStats.savingsEstimate}`} />
              <StatItem icon="water" label="Gallons" value={fuelStats.totalGallons.toString()} />
            </View>

            {/* Performance Chart Placeholder */}
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>Weekly Performance</Text>
              <View style={styles.chartPlaceholder}>
                <View style={styles.chartBars}>
                  {[65, 72, 68, 82, 75, 88, 82].map((value, index) => (
                    <View key={index} style={styles.barContainer}>
                      <View style={[styles.bar, { height: value }]}>
                        <LinearGradient
                          colors={[Colors.primary, Colors.success]}
                          style={styles.barGradient}
                        />
                      </View>
                      <Text style={styles.barLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          </>
        )}

        {activeTab === 'history' && (
          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>
            {recentTrips.map((trip) => (
              <Card key={trip.id} style={styles.tripCard}>
                <View style={styles.tripHeader}>
                  <Text style={styles.tripDate}>{trip.date}</Text>
                  <View style={[styles.efficiencyBadge, { backgroundColor: `${getEfficiencyColor(trip.efficiency)}20` }]}>
                    <Text style={[styles.efficiencyText, { color: getEfficiencyColor(trip.efficiency) }]}>
                      {trip.efficiency}
                    </Text>
                  </View>
                </View>
                <View style={styles.tripStats}>
                  <View style={styles.tripStat}>
                    <Ionicons name="navigate" size={16} color={Colors.textSecondary} />
                    <Text style={styles.tripStatValue}>{trip.distance}</Text>
                  </View>
                  <View style={styles.tripStat}>
                    <Ionicons name="speedometer" size={16} color={Colors.textSecondary} />
                    <Text style={styles.tripStatValue}>{trip.mpg} mpg</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {activeTab === 'tips' && (
          <View style={styles.tipsContainer}>
            <Text style={styles.sectionTitle}>Fuel Saving Tips</Text>
            {tips.map((tip) => (
              <Card key={tip.id} style={styles.tipCard}>
                <View style={styles.tipHeader}>
                  <View style={styles.tipIconContainer}>
                    <Ionicons name="bulb" size={20} color={Colors.warning} />
                  </View>
                  <View style={styles.tipContent}>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    <Text style={styles.tipDescription}>{tip.description}</Text>
                  </View>
                </View>
                <View style={[styles.impactBadge, { backgroundColor: tip.impact === 'High' ? `${Colors.success}20` : `${Colors.primary}20` }]}>
                  <Text style={[styles.impactText, { color: tip.impact === 'High' ? Colors.success : Colors.primary }]}>
                    {tip.impact} Impact
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
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
  settingsButton: {
    padding: Spacing.xs,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 4,
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  circleTrack: {
    position: 'absolute',
    borderColor: Colors.surfaceLight,
  },
  circleProgress: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleValue: {
    fontSize: 48,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  circleLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  statItem: {
    width: '50%',
    padding: Spacing.xs,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginTop: 2,
  },
  statTrend: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    marginTop: 2,
  },
  chartCard: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
  },
  chartTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  chartPlaceholder: {
    height: 150,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: Spacing.md,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 24,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  barGradient: {
    flex: 1,
  },
  barLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  historyContainer: {
    paddingTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  tripCard: {
    marginBottom: Spacing.sm,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tripDate: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  efficiencyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  efficiencyText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    textTransform: 'capitalize',
  },
  tripStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  tripStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripStatValue: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  tipsContainer: {
    paddingTop: Spacing.md,
  },
  tipCard: {
    marginBottom: Spacing.sm,
  },
  tipHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  tipIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: `${Colors.warning}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  tipDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  impactBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  impactText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
});

export default FuelDashboardScreen;
