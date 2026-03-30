import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../common/Modal';
import { api } from '../../api/client';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface Analytics {
  total_miles: number;
  total_trips: number;
  avg_safety_score: number;
  total_gems: number;
}

interface StatItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}

export default function TripAnalytics({ visible, onClose }: Props) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(null);
    api.get<Analytics>('/api/trips/analytics')
      .then((res) => {
        if (res.success) {
          setData(res.data ?? null);
        } else {
          setError(res.error || 'Failed to load analytics');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [visible]);

  const stats: StatItem[] = data
    ? [
        { icon: 'speedometer-outline', label: 'Total Miles', value: `${data.total_miles.toFixed(1)}`, color: '#3B82F6' },
        { icon: 'car-outline', label: 'Total Trips', value: `${data.total_trips}`, color: '#8B5CF6' },
        { icon: 'leaf-outline', label: 'CO₂ Saved', value: `${(data.total_miles * 0.2).toFixed(1)} kg`, color: '#22C55E' },
        { icon: 'cash-outline', label: 'Fuel Saved', value: `$${((data.total_miles / 25) * 3.5).toFixed(2)}`, color: '#F59E0B' },
        { icon: 'shield-checkmark-outline', label: 'Avg Safety', value: `${data.avg_safety_score.toFixed(0)}/100`, color: '#06B6D4' },
        { icon: 'diamond-outline', label: 'Gems Earned', value: `${data.total_gems}`, color: '#EC4899' },
      ]
    : [];

  return (
    <Modal visible={visible} onClose={onClose}>
      <Text style={styles.title}>Trip Analytics</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <View style={styles.grid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.card}>
              <View style={[styles.iconBg, { backgroundColor: `${s.color}20` }]}>
                <Ionicons name={s.icon} size={22} color={s.color} />
              </View>
              <Text style={styles.value}>{s.value}</Text>
              <Text style={styles.label}>{s.label}</Text>
            </View>
          ))}
        </View>
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
    marginBottom: 20,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
});
