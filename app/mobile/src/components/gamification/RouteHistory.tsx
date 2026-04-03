import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../common/Modal';
import { api } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';

/** Rough trip fuel estimate when engine lacks fill-up data (25 MPG @ ~$3.60/gal). */
const ASSUMED_MPG = 25;
const ASSUMED_PRICE_PER_GAL = 3.6;

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface Trip {
  id: string;
  date: string;
  origin: string;
  destination: string;
  distance: number;
  duration: number;
  safety_score: number;
}

function accentColor(score: number): string {
  if (score >= 80) return '#22C55E';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function RouteHistory({ visible, onClose }: Props) {
  const { isLight, colors } = useTheme();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(null);
    api.get<Trip[]>('/api/trips/history/recent')
      .then((res) => {
        if (!res.success) {
          setError(res.error || 'Failed to load history');
          return;
        }
        const root = res.data as unknown as { data?: Trip[] } | Trip[] | null;
        const list = Array.isArray(root) ? root : root?.data;
        if (Array.isArray(list)) {
          setTrips(list);
        } else {
          setError('Failed to load history');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [visible]);

  const renderTrip = ({ item }: { item: Trip }) => {
    const color = accentColor(item.safety_score);
    const estGal = item.distance > 0 ? item.distance / ASSUMED_MPG : 0;
    const estCost = estGal * ASSUMED_PRICE_PER_GAL;
    const cardBg = colors.card;
    const borderC = colors.border;
    return (
      <View style={[styles.tripCard, { backgroundColor: cardBg, borderColor: borderC }]}>
        <View style={[styles.accentBar, { backgroundColor: color }]} />
        <View style={styles.tripContent}>
          <View style={styles.tripHeader}>
            <Text style={[styles.tripDate, { color: colors.textSecondary }]}>{formatDate(item.date)}</Text>
            <View style={[styles.scoreBadge, { backgroundColor: `${color}20` }]}>
              <Ionicons name="shield-checkmark" size={12} color={color} />
              <Text style={[styles.scoreText, { color }]}>{item.safety_score}</Text>
            </View>
          </View>
          <View style={styles.routeRow}>
            <Ionicons name="location" size={14} color={colors.primary} />
            <Text style={[styles.routeText, { color: colors.text }]} numberOfLines={1}>{item.origin}</Text>
            <Ionicons name="arrow-forward" size={12} color={colors.textTertiary} />
            <Text style={[styles.routeText, { color: colors.text }]} numberOfLines={1}>{item.destination}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.distance.toFixed(1)} mi</Text>
            <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{formatDuration(item.duration)}</Text>
          </View>
          {item.distance > 0 && (
            <Text style={[styles.fuelHint, { color: colors.textTertiary }]}>
              ~{estGal.toFixed(2)} gal · ~${estCost.toFixed(2)} est. ({ASSUMED_MPG} MPG @ ${ASSUMED_PRICE_PER_GAL.toFixed(2)}/gal)
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: colors.text }]}>Route History</Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : trips.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="car-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No trips yet</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={renderTrip}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  loader: {
    paddingVertical: 40,
  },
  error: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
  fuelHint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 15,
  },
  list: {
    gap: 10,
    paddingBottom: 8,
  },
  tripCard: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  accentBar: {
    width: 4,
  },
  tripContent: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
