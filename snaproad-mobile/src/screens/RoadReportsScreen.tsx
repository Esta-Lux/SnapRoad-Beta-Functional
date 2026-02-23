// SnapRoad Mobile - Road Reports Screen
// Community-submitted road hazards and reports

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, FontWeights, BorderRadius, Spacing } from '../utils/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://privacy-first-app-3.preview.emergentagent.com';

interface Report {
  id: number;
  type: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  upvotes: number;
  created_at: string;
  distance_km?: number;
  user_upvoted?: boolean;
}

interface RoadReportsScreenProps {
  navigation?: any;
}

const REPORT_TYPES = [
  { type: 'all', label: 'All', icon: 'list' },
  { type: 'police', label: 'Police', icon: 'shield-checkmark', color: '#3B82F6' },
  { type: 'hazard', label: 'Hazard', icon: 'warning', color: '#F59E0B' },
  { type: 'accident', label: 'Accident', icon: 'car', color: '#EF4444' },
  { type: 'construction', label: 'Construction', icon: 'construct', color: '#F97316' },
  { type: 'weather', label: 'Weather', icon: 'cloud', color: '#6366F1' },
];

export const RoadReportsScreen: React.FC<RoadReportsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    try {
      const params = new URLSearchParams({
        lat: '39.9612',
        lng: '-82.9988',
        radius: '10',
      });
      if (filter !== 'all') {
        params.append('type', filter);
      }
      
      const res = await fetch(`${API_URL}/api/reports/nearby?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setReports(data.data || []);
      } else {
        // Mock data
        setReports([
          { id: 1, type: 'police', title: 'Speed trap', description: 'On I-270 E near exit 10', lat: 39.96, lng: -82.99, upvotes: 24, created_at: new Date().toISOString(), distance_km: 0.5 },
          { id: 2, type: 'hazard', title: 'Debris in road', description: 'Right lane blocked', lat: 39.95, lng: -82.98, upvotes: 12, created_at: new Date().toISOString(), distance_km: 1.2 },
          { id: 3, type: 'construction', title: 'Lane closure', description: 'Left 2 lanes closed', lat: 39.97, lng: -83.01, upvotes: 8, created_at: new Date().toISOString(), distance_km: 2.1 },
        ]);
      }
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const handleUpvote = async (reportId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/reports/${reportId}/upvote`, { method: 'POST' });
      const data = await res.json();
      
      setReports(reports.map(r => 
        r.id === reportId 
          ? { ...r, upvotes: r.upvotes + 1, user_upvoted: true }
          : r
      ));
      
      Alert.alert('Thanks!', 'Your upvote helps other drivers.');
    } catch (e) {
      console.error('Upvote failed:', e);
    }
  };

  const handleAddReport = () => {
    navigation?.navigate('PhotoCapture');
  };

  const getTypeConfig = (type: string) => {
    return REPORT_TYPES.find(t => t.type === type) || REPORT_TYPES[0];
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const renderReport = ({ item }: { item: Report }) => {
    const config = getTypeConfig(item.type);
    return (
      <View style={styles.reportCard}>
        <View style={[styles.reportIcon, { backgroundColor: (config.color || Colors.primary) + '20' }]}>
          <Ionicons name={config.icon as any} size={24} color={config.color || Colors.primary} />
        </View>
        
        <View style={styles.reportContent}>
          <Text style={styles.reportTitle}>{item.title}</Text>
          <Text style={styles.reportDesc}>{item.description}</Text>
          <View style={styles.reportMeta}>
            <Text style={styles.reportTime}>{getTimeAgo(item.created_at)}</Text>
            {item.distance_km && (
              <Text style={styles.reportDistance}>• {item.distance_km.toFixed(1)} km away</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.upvoteBtn, item.user_upvoted && styles.upvoteBtnActive]}
          onPress={() => !item.user_upvoted && handleUpvote(item.id)}
        >
          <Ionicons 
            name={item.user_upvoted ? 'arrow-up' : 'arrow-up-outline'} 
            size={20} 
            color={item.user_upvoted ? '#fff' : Colors.success} 
          />
          <Text style={[styles.upvoteCount, item.user_upvoted && styles.upvoteCountActive]}>
            {item.upvotes}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Road Reports</Text>
        <TouchableOpacity onPress={handleAddReport} style={styles.addBtn}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {REPORT_TYPES.map(type => (
          <TouchableOpacity
            key={type.type}
            style={[styles.filterTab, filter === type.type && styles.filterTabActive]}
            onPress={() => setFilter(type.type)}
          >
            <Ionicons 
              name={type.icon as any} 
              size={16} 
              color={filter === type.type ? '#fff' : Colors.textMuted} 
            />
            <Text style={[styles.filterText, filter === type.type && styles.filterTextActive]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{reports.length}</Text>
          <Text style={styles.statLabel}>Nearby</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>+50</Text>
          <Text style={styles.statLabel}>Gems per report</Text>
        </View>
      </View>

      {/* Reports List */}
      <FlatList
        data={reports}
        keyExtractor={item => item.id.toString()}
        renderItem={renderReport}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); fetchReports(); }}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No reports in this area</Text>
            <Text style={styles.emptySubtext}>Be the first to report!</Text>
          </View>
        }
      />

      {/* Add Report FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleAddReport}>
        <Ionicons name="camera" size={24} color="#fff" />
        <Text style={styles.fabText}>Report</Text>
      </TouchableOpacity>
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
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  addBtn: {
    padding: Spacing.xs,
  },
  filterScroll: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontWeight: FontWeights.medium,
  },
  filterTextActive: {
    color: '#fff',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.surfaceLight,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  reportTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  reportDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  reportMeta: {
    flexDirection: 'row',
    marginTop: 4,
  },
  reportTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  reportDistance: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  upvoteBtn: {
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.success + '20',
    borderRadius: BorderRadius.md,
    minWidth: 50,
  },
  upvoteBtnActive: {
    backgroundColor: Colors.success,
  },
  upvoteCount: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.success,
    marginTop: 2,
  },
  upvoteCountActive: {
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
});

export default RoadReportsScreen;
