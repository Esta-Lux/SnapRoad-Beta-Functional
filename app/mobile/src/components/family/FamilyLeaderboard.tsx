import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';

interface LeaderboardEntry {
  id: string;
  name: string;
  safety_score: number;
  gems: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  isLight?: boolean;
}

const MEDAL_COLORS = ['#F59E0B', '#94a3b8', '#CD7F32'] as const;

export default function FamilyLeaderboard({ visible, onClose, isLight }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bg = isLight ? '#f5f5f7' : '#0f172a';
  const cardBg = isLight ? '#fff' : '#1e293b';
  const text = isLight ? '#1a1a1a' : '#f8fafc';
  const sub = isLight ? '#6a6a7a' : '#94a3b8';

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>('/api/family/leaderboard');
      if (res.success) {
        const data = (res.data as any)?.data ?? res.data;
        setEntries(Array.isArray(data) ? data : []);
      } else {
        setError((res as any).error ?? 'Failed to load leaderboard');
      }
    } catch {
      setError('Network error loading leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) loadLeaderboard();
  }, [visible, loadLeaderboard]);

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isTop3 = index < 3;
    const position = index + 1;
    const initial = (item.name ?? 'U')[0].toUpperCase();

    return (
      <View style={[styles.entryCard, { backgroundColor: cardBg }, isTop3 && styles.entryCardTop3]}>
        {/* Rank */}
        <View style={[styles.rankBadge, isTop3 && { backgroundColor: `${MEDAL_COLORS[index]}20` }]}>
          {isTop3 ? (
            <Ionicons name="trophy" size={16} color={MEDAL_COLORS[index]} />
          ) : (
            <Text style={[styles.rankText, { color: sub }]}>{position}</Text>
          )}
        </View>

        {/* Avatar */}
        <View style={[styles.avatar, isTop3 && { borderColor: MEDAL_COLORS[index], borderWidth: 2 }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.entryName, { color: text }]}>{item.name}</Text>
          <View style={styles.entryMeta}>
            <Ionicons name="shield-checkmark" size={12} color="#22C55E" />
            <Text style={[styles.entryScore, { color: sub }]}>{item.safety_score}</Text>
          </View>
        </View>

        {/* Gems */}
        <View style={styles.gemsContainer}>
          <Ionicons name="diamond" size={14} color="#A78BFA" />
          <Text style={styles.gemsText}>{item.gems}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: isLight ? '#fff' : '#1e293b' }]} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Ionicons name="podium" size={22} color="#F59E0B" />
            <Text style={[styles.title, { color: text }]}>Family Leaderboard</Text>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={[styles.loadingText, { color: sub }]}>Loading leaderboard...</Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
              <Text style={[styles.errorText, { color: text }]}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadLeaderboard}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="people-outline" size={40} color={sub} />
              <Text style={[styles.emptyText, { color: text }]}>No leaderboard data yet</Text>
              <Text style={{ color: sub, fontSize: 13 }}>Complete trips to earn rankings!</Text>
            </View>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(e) => e.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '85%' },
  handle: { width: 36, height: 4, backgroundColor: '#475569', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800' },
  centered: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  loadingText: { fontSize: 14 },
  errorText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  retryBtn: { backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyText: { fontSize: 17, fontWeight: '700' },
  entryCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  entryCardTop3: { borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  rankBadge: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(148,163,184,0.1)' },
  rankText: { fontSize: 14, fontWeight: '800' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  entryName: { fontSize: 15, fontWeight: '700' },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  entryScore: { fontSize: 12, fontWeight: '600' },
  gemsContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gemsText: { color: '#A78BFA', fontSize: 14, fontWeight: '700' },
});
