// SnapRoad Mobile - Driver Analytics Screen
// Aligned with Figma UI: /app/frontend/src/components/figma-ui/mobile/DriverAnalytics.tsx

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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';

interface DriverAnalyticsScreenProps {
  navigation?: any;
  onNavigate?: (screen: string) => void;
}

interface StatCard {
  label: string;
  value: string | number;
  change: number;
  icon: string;
  color: string;
  trend: 'up' | 'down' | 'neutral';
}

interface DrivingMetric {
  name: string;
  score: number;
  color: string;
  icon: string;
  tip: string;
}

export const DriverAnalyticsScreen: React.FC<DriverAnalyticsScreenProps> = ({ navigation, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  const stats: StatCard[] = [
    { label: 'Safety Score', value: 94, change: 3, icon: 'shield-checkmark', color: '#00DFA2', trend: 'up' },
    { label: 'Total Miles', value: '1,247', change: 12, icon: 'location', color: '#0084FF', trend: 'up' },
    { label: 'Gems Earned', value: '2,450', change: 8, icon: 'diamond', color: '#9D4EDD', trend: 'up' },
    { label: 'Streak', value: '23 days', change: 0, icon: 'flash', color: '#FFC24C', trend: 'neutral' },
  ];

  const drivingMetrics: DrivingMetric[] = [
    { name: 'Smooth Braking', score: 92, color: '#00DFA2', icon: 'pulse', tip: 'Excellent braking' },
    { name: 'Speed Control', score: 96, color: '#0084FF', icon: 'trending-up', tip: 'Great speed limits' },
    { name: 'Cornering', score: 88, color: '#FFC24C', icon: 'navigate', tip: 'Take turns gradually' },
    { name: 'Acceleration', score: 90, color: '#9D4EDD', icon: 'flash', tip: 'Controlled acceleration' },
    { name: 'Phone Focus', score: 78, color: '#FF5A5A', icon: 'phone-portrait', tip: 'Reduce phone use' },
    { name: 'Night Driving', score: 85, color: '#0084FF', icon: 'moon', tip: 'Good night awareness' },
  ];

  const weeklyData = [
    { day: 'Mon', score: 92 }, { day: 'Tue', score: 88 }, { day: 'Wed', score: 95 },
    { day: 'Thu', score: 91 }, { day: 'Fri', score: 94 }, { day: 'Sat', score: 97 },
    { day: 'Sun', score: 96 },
  ];

  const handleBack = () => {
    if (onNavigate) onNavigate('profile');
    else if (navigation) navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Time Range Selector */}
        <View style={styles.timeRange}>
          {(['week', 'month', 'year'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.timeBtn, timeRange === range && styles.timeBtnActive]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[styles.timeBtnText, timeRange === range && styles.timeBtnTextActive]}>
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: `${stat.color}15` }]}>
                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
              </View>
              <Text style={styles.statCardValue}>{stat.value}</Text>
              <Text style={styles.statCardLabel}>{stat.label}</Text>
              {stat.change > 0 && (
                <View style={styles.statChangeRow}>
                  <Ionicons name="arrow-up" size={12} color="#00DFA2" />
                  <Text style={styles.statChangeText}>{stat.change}%</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Weekly Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weekly Performance</Text>
          <View style={styles.barChart}>
            {weeklyData.map((day, i) => (
              <View key={i} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={day.score >= 95 ? ['#00DFA2', '#00B87A'] : day.score >= 90 ? ['#0084FF', '#0066CC'] : ['#FFC24C', '#FF9F1C']}
                    style={[styles.barFill, { height: `${day.score}%` }]}
                  />
                </View>
                <Text style={styles.barLabel}>{day.day}</Text>
                <Text style={styles.barValue}>{day.score}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Driving Metrics */}
        <View style={styles.metricsCard}>
          <Text style={styles.metricsTitle}>Driving Breakdown</Text>
          {drivingMetrics.map((metric, i) => (
            <View key={i} style={styles.metricRow}>
              <View style={[styles.metricIconBox, { backgroundColor: `${metric.color}15` }]}>
                <Ionicons name={metric.icon as any} size={16} color={metric.color} />
              </View>
              <View style={styles.metricContent}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricName}>{metric.name}</Text>
                  <Text style={[styles.metricScore, { color: metric.color }]}>{metric.score}</Text>
                </View>
                <View style={styles.metricBarTrack}>
                  <View style={[styles.metricBarFill, { width: `${metric.score}%`, backgroundColor: metric.color }]} />
                </View>
                <Text style={styles.metricTip}>{metric.tip}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E16' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 16 },
  // Time range
  timeRange: {
    flexDirection: 'row', backgroundColor: '#1A1F2E',
    borderRadius: 12, padding: 4, marginBottom: 16,
  },
  timeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  timeBtnActive: { backgroundColor: '#0084FF' },
  timeBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500' },
  timeBtnTextActive: { color: '#fff' },
  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: {
    width: '47%', backgroundColor: '#1A1F2E', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  statIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statCardValue: { color: '#fff', fontSize: 24, fontWeight: '700' },
  statCardLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  statChangeRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 8 },
  statChangeText: { color: '#00DFA2', fontSize: 12, fontWeight: '500' },
  // Chart
  chartCard: {
    backgroundColor: '#1A1F2E', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 16, marginBottom: 16,
  },
  chartTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  barChart: { flexDirection: 'row', justifyContent: 'space-around', height: 140 },
  barColumn: { alignItems: 'center', flex: 1 },
  barTrack: { flex: 1, width: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 10 },
  barLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6 },
  barValue: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 },
  // Metrics
  metricsCard: {
    backgroundColor: '#1A1F2E', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 16, marginBottom: 16,
  },
  metricsTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  metricRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  metricIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricContent: { flex: 1 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  metricName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  metricScore: { fontSize: 14, fontWeight: '700' },
  metricBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  metricBarFill: { height: '100%', borderRadius: 3 },
  metricTip: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 },
});

export default DriverAnalyticsScreen;
