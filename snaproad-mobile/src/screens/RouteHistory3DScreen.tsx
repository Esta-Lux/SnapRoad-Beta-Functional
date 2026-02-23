// SnapRoad Mobile - Route History 3D Screen
// Interactive route history visualization

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  PanResponder,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';
import { Card } from '../components/ui';

interface RouteHistory3DScreenProps {
  navigation?: any;
  onNavigate?: (screen: string) => void;
}

interface RouteData {
  id: string;
  route_name: string;
  origin: string;
  destination: string;
  total_trips: number;
  total_distance_miles: number;
  avg_safety_score: number;
  color_intensity: number;
  last_traveled: string | null;
  coordinates: { lat: number; lng: number }[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_SIZE = SCREEN_WIDTH - 40;

export const RouteHistory3DScreen: React.FC<RouteHistory3DScreenProps> = ({ navigation, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'trips' | 'distance' | 'recent'>('trips');
  const [dateRange, setDateRange] = useState(90);
  const [totalStats, setTotalStats] = useState<any>(null);
  
  // Animation for 3D effect
  const rotateX = useRef(new Animated.Value(45)).current;
  const rotateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        rotateY.setValue(gesture.dx * 0.3);
        rotateX.setValue(45 - gesture.dy * 0.3);
      },
      onPanResponderRelease: () => {
        Animated.parallel([
          Animated.spring(rotateX, { toValue: 45, useNativeDriver: Platform.OS !== 'web' }),
          Animated.spring(rotateY, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }),
        ]).start();
      },
    })
  ).current;

  useEffect(() => {
    loadRoutes();
  }, [dateRange]);

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'https://feature-stitch.preview.emergentagent.com'}/api/routes/history-3d?days=${dateRange}`
      );
      const data = await response.json();
      if (data.success) {
        setRoutes(data.data.routes || []);
        setTotalStats({
          totalRoutes: data.data.total_unique_routes,
          totalTrips: data.data.total_trips,
          totalDistance: data.data.total_distance,
        });
      }
    } catch (e) {
      console.log('Could not load route history');
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

  const sortedRoutes = [...routes].sort((a, b) => {
    if (sortBy === 'trips') return b.total_trips - a.total_trips;
    if (sortBy === 'distance') return b.total_distance_miles - a.total_distance_miles;
    return (b.last_traveled || '').localeCompare(a.last_traveled || '');
  });

  const selectedRouteData = routes.find((r) => r.id === selectedRoute);

  const getScoreColor = (score: number) => {
    if (score >= 90) return Colors.success;
    if (score >= 75) return Colors.primary;
    return Colors.warning;
  };

  const getRouteColor = (score: number) => {
    if (score >= 90) return '#22c55e';
    if (score >= 75) return '#3b82f6';
    return '#f59e0b';
  };

  // Convert lat/lng to SVG coordinates
  const center = { lat: 39.9612, lng: -82.9988 };
  const scale = 3000;
  const latLngToXY = (lat: number, lng: number) => ({
    x: (lng - center.lng) * scale + MAP_SIZE / 2,
    y: (center.lat - lat) * scale + MAP_SIZE / 2,
  });

  const renderMap = () => (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.mapContainer,
        {
          transform: [
            { perspective: 1000 },
            {
              rotateX: rotateX.interpolate({
                inputRange: [0, 90],
                outputRange: ['0deg', '90deg'],
              }),
            },
            {
              rotateZ: rotateY.interpolate({
                inputRange: [-180, 180],
                outputRange: ['-180deg', '180deg'],
              }),
            },
          ],
        },
      ]}
    >
      {/* Grid Background */}
      <View style={styles.gridBackground}>
        {[...Array(10)].map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLine, { top: (i * MAP_SIZE) / 10 }]} />
        ))}
        {[...Array(10)].map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridLineVertical, { left: (i * MAP_SIZE) / 10 }]} />
        ))}
      </View>

      {/* Routes SVG */}
      <Svg width={MAP_SIZE} height={MAP_SIZE} style={styles.routesSvg}>
        {routes.map((route) => {
          if (route.coordinates.length < 2) return null;

          const points = route.coordinates.map((c) => latLngToXY(c.lat, c.lng));
          const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          const isSelected = selectedRoute === route.id;
          const color = getRouteColor(route.avg_safety_score);
          const opacity = 0.3 + route.color_intensity * 0.7;

          return (
            <G key={route.id} onPress={() => setSelectedRoute(route.id)}>
              {/* Glow effect */}
              <Path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={isSelected ? 12 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={opacity * 0.3}
              />
              {/* Main path */}
              <Path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={isSelected ? 4 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isSelected ? 1 : opacity}
              />
              {/* Start point */}
              <Circle
                cx={points[0]?.x}
                cy={points[0]?.y}
                r={isSelected ? 6 : 4}
                fill={color}
                opacity={isSelected ? 1 : opacity}
              />
              {/* End point */}
              <Circle
                cx={points[points.length - 1]?.x}
                cy={points[points.length - 1]?.y}
                r={isSelected ? 6 : 4}
                fill={color}
                stroke="white"
                strokeWidth={isSelected ? 2 : 1}
                opacity={isSelected ? 1 : opacity}
              />
            </G>
          );
        })}

        {/* Center marker */}
        <Circle cx={MAP_SIZE / 2} cy={MAP_SIZE / 2} r={6} fill={Colors.primary} stroke="white" strokeWidth={2} />
      </Svg>

      <Text style={styles.dragHint}>Drag to rotate view</Text>
    </Animated.View>
  );

  const renderRouteItem = ({ item, index }: { item: RouteData; index: number }) => {
    const isSelected = selectedRoute === item.id;

    return (
      <TouchableOpacity
        onPress={() => setSelectedRoute(item.id === selectedRoute ? null : item.id)}
        activeOpacity={0.8}
      >
        <Card style={[styles.routeCard, isSelected && styles.routeCardSelected]}>
          <View style={styles.routeHeader}>
            <View style={styles.routeHeaderLeft}>
              <View
                style={[
                  styles.routeColorDot,
                  {
                    backgroundColor: getRouteColor(item.avg_safety_score),
                    opacity: 0.3 + item.color_intensity * 0.7,
                  },
                ]}
              />
              <Text style={styles.routeRank}>#{index + 1}</Text>
            </View>
            <View style={[styles.scoreBadge, { backgroundColor: `${getScoreColor(item.avg_safety_score)}20` }]}>
              <Ionicons name="shield-checkmark" size={10} color={getScoreColor(item.avg_safety_score)} />
              <Text style={[styles.scoreText, { color: getScoreColor(item.avg_safety_score) }]}>
                {item.avg_safety_score}
              </Text>
            </View>
          </View>

          <View style={styles.routeLocationRow}>
            <Ionicons name="location" size={12} color={Colors.success} />
            <Text style={styles.routeLocationText}>{item.origin}</Text>
            <Text style={styles.routeArrow}>→</Text>
            <Text style={styles.routeLocationText}>{item.destination}</Text>
          </View>

          <View style={styles.routeStats}>
            <Text style={styles.routeStatText}>{item.total_trips} trips</Text>
            <Text style={styles.routeStatDot}>•</Text>
            <Text style={styles.routeStatText}>{item.total_distance_miles.toFixed(0)} mi</Text>
            {item.last_traveled && (
              <>
                <Text style={styles.routeStatDot}>•</Text>
                <Text style={styles.routeStatTextMuted}>Last: {item.last_traveled}</Text>
              </>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient
        colors={['#7c3aed', '#6366f1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="map" size={20} color={Colors.text} />
          <Text style={styles.headerTitle}>Route History</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Stats Bar */}
      {totalStats && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalStats.totalRoutes}</Text>
            <Text style={styles.statLabel}>Unique Routes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalStats.totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalStats.totalDistance?.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Miles</Text>
          </View>
        </View>
      )}

      {/* 3D Map */}
      {renderMap()}

      {/* Selected Route Info */}
      {selectedRouteData && (
        <Card style={styles.selectedRouteCard}>
          <View style={styles.selectedRouteHeader}>
            <Ionicons name="navigate" size={14} color={Colors.accent} />
            <Text style={styles.selectedRouteTitle} numberOfLines={1}>
              {selectedRouteData.route_name}
            </Text>
          </View>
          <View style={styles.selectedRouteStats}>
            <View style={styles.selectedRouteStat}>
              <Text style={styles.selectedRouteStatValue}>{selectedRouteData.total_trips}</Text>
              <Text style={styles.selectedRouteStatLabel}>trips</Text>
            </View>
            <View style={styles.selectedRouteStat}>
              <Text style={styles.selectedRouteStatValue}>{selectedRouteData.total_distance_miles.toFixed(0)}</Text>
              <Text style={styles.selectedRouteStatLabel}>miles</Text>
            </View>
            <View style={styles.selectedRouteStat}>
              <Text style={[styles.selectedRouteStatValue, { color: getScoreColor(selectedRouteData.avg_safety_score) }]}>
                {selectedRouteData.avg_safety_score}
              </Text>
              <Text style={styles.selectedRouteStatLabel}>avg score</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Filters */}
      <View style={styles.filterRow}>
        <Ionicons name="filter" size={14} color={Colors.textMuted} />
        <View style={styles.filterChips}>
          {[
            { key: 'trips', label: 'Most Trips' },
            { key: 'distance', label: 'Distance' },
            { key: 'recent', label: 'Recent' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterChip, sortBy === opt.key && styles.filterChipActive]}
              onPress={() => setSortBy(opt.key as any)}
            >
              <Text style={[styles.filterChipText, sortBy === opt.key && styles.filterChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Routes List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading routes...</Text>
        </View>
      ) : (
        <FlatList
          data={sortedRoutes}
          renderItem={renderRouteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="navigate-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No routes recorded</Text>
              <Text style={styles.emptySubtitle}>Start driving to build your route history!</Text>
            </View>
          }
        />
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
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: -Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.surfaceLight,
  },
  mapContainer: {
    width: MAP_SIZE,
    height: MAP_SIZE * 0.7,
    alignSelf: 'center',
    marginVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  gridBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(100,116,139,0.1)',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(100,116,139,0.1)',
  },
  routesSvg: {
    position: 'absolute',
  },
  dragHint: {
    position: 'absolute',
    bottom: Spacing.sm,
    alignSelf: 'center',
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  selectedRouteCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  selectedRouteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  selectedRouteTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.text,
    flex: 1,
  },
  selectedRouteStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  selectedRouteStat: {
    alignItems: 'center',
  },
  selectedRouteStatValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  selectedRouteStatLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChips: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
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
  routeCard: {
    marginBottom: Spacing.sm,
  },
  routeCardSelected: {
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  routeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  routeColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeRank: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  scoreText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  routeLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  routeLocationText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginLeft: 4,
  },
  routeArrow: {
    color: Colors.textMuted,
    marginHorizontal: 4,
  },
  routeStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeStatText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  routeStatTextMuted: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  routeStatDot: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginHorizontal: 4,
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

export default RouteHistory3DScreen;
