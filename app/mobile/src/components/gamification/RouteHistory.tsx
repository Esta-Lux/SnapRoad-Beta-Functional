import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../common/Modal';
import { api } from '../../api/client';

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
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(null);
    api.get<Trip[]>('/api/trips/history')
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setTrips(res.data);
        } else {
          setError(res.error || 'Failed to load history');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [visible]);

  const renderTrip = ({ item }: { item: Trip }) => {
    const color = accentColor(item.safety_score);
    return (
      <View style={styles.tripCard}>
        <View style={[styles.accentBar, { backgroundColor: color }]} />
        <View style={styles.tripContent}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripDate}>{formatDate(item.date)}</Text>
            <View style={[styles.scoreBadge, { backgroundColor: `${color}20` }]}>
              <Ionicons name="shield-checkmark" size={12} color={color} />
              <Text style={[styles.scoreText, { color }]}>{item.safety_score}</Text>
            </View>
          </View>
          <View style={styles.routeRow}>
            <Ionicons name="location" size={14} color="#3B82F6" />
            <Text style={styles.routeText} numberOfLines={1}>{item.origin}</Text>
            <Ionicons name="arrow-forward" size={12} color="#64748b" />
            <Text style={styles.routeText} numberOfLines={1}>{item.destination}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{item.distance.toFixed(1)} mi</Text>
            <View style={styles.dot} />
            <Text style={styles.metaText}>{formatDuration(item.duration)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <Text style={styles.title}>Route History</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : trips.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="car-outline" size={48} color="#64748b" />
          <Text style={styles.emptyText}>No trips yet</Text>
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
    color: '#f87171',
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
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },
  list: {
    gap: 10,
    paddingBottom: 8,
  },
  tripCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
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
    color: '#94a3b8',
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
    color: '#f8fafc',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#64748b',
  },
});
