import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Modal from '../common/Modal';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { Ionicons } from '@expo/vector-icons';

type Row = {
  id: string;
  opponent_name?: string;
  stake?: number;
  duration_hours?: number;
  status: string;
  raw_status?: string;
  can_accept?: boolean;
  pending_outgoing?: boolean;
  your_score?: number;
  opponent_score?: number;
};

type Stats = {
  wins: number;
  losses: number;
  draws?: number;
  win_rate?: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called after accept with updated gem balance from the API. */
  onGemsUpdated?: (gems: number) => void;
};

function unwrapChallengeAcceptPayload(
  data: unknown,
): { opponent_gems_remaining?: number } | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const top = data as { data?: unknown };
  if (top.data && typeof top.data === 'object') {
    return top.data as { opponent_gems_remaining?: number };
  }
  return undefined;
}

export default function FriendChallengeHistoryModal({ visible, onClose, onGemsUpdated }: Props) {
  const { colors, isLight } = useTheme();
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{
        success?: boolean;
        data?: { challenges?: Row[]; stats?: Stats };
      }>('/api/challenges/history?limit=100');
      if (!res.success || res.data == null) {
        setRows([]);
        setStats(null);
        return;
      }
      const body = res.data as { success?: boolean; data?: { challenges?: Row[]; stats?: Stats } };
      const pack = body?.data;
      setRows(Array.isArray(pack?.challenges) ? pack.challenges : []);
      setStats(pack?.stats ?? null);
    } catch {
      setRows([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const acceptChallenge = useCallback(
    async (challengeId: string) => {
      setAcceptingId(challengeId);
      try {
        const res = await api.post(`/api/challenges/${encodeURIComponent(challengeId)}/accept`);
        if (!res.success) {
          Alert.alert('Challenge', res.error || 'Could not accept this challenge.');
          return;
        }
        const rem = unwrapChallengeAcceptPayload(res.data)?.opponent_gems_remaining;
        if (typeof rem === 'number' && Number.isFinite(rem)) {
          onGemsUpdated?.(Math.max(0, Math.floor(rem)));
        }
        Alert.alert('Challenge accepted', 'Good luck — your best safety score during the window counts.');
        await load();
      } catch {
        Alert.alert('Error', 'Something went wrong. Try again.');
      } finally {
        setAcceptingId(null);
      }
    },
    [load, onGemsUpdated],
  );

  const label = (item: Row) => {
    const raw = item.raw_status ?? item.status;
    if (raw === 'pending') {
      if (item.can_accept) return 'Needs your response';
      if (item.pending_outgoing) return 'Waiting for friend';
      return 'Pending';
    }
    switch (item.status) {
      case 'won':
        return 'Victory';
      case 'lost':
        return 'Defeat';
      case 'draw':
        return 'Draw';
      case 'active':
        return 'In progress';
      case 'cancelled':
        return 'Cancelled';
      default:
        return item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : '—';
    }
  };

  const statusIcon = (item: Row): { name: React.ComponentProps<typeof Ionicons>['name']; color: string } => {
    const raw = item.raw_status ?? item.status;
    if (raw === 'pending') {
      if (item.can_accept) return { name: 'hand-left-outline', color: '#D97706' };
      if (item.pending_outgoing) return { name: 'hourglass-outline', color: colors.textSecondary };
      return { name: 'ellipsis-horizontal-circle-outline', color: colors.primary };
    }
    if (item.status === 'won') return { name: 'trophy', color: '#10B981' };
    if (item.status === 'lost') return { name: 'close-circle', color: '#EF4444' };
    if (item.status === 'draw') return { name: 'remove-outline', color: colors.textSecondary };
    return { name: 'flash-outline', color: colors.primary };
  };

  return (
    <Modal visible={visible} onClose={onClose} scrollable={false}>
      <Text style={[styles.title, { color: colors.text }]}>Friend challenges</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        Best safety score during the challenge window wins when it ends. Friends still appear on the map while driving when they share location.
      </Text>

      {stats ? (
        <View style={styles.statRow}>
          <View style={[styles.statCell, { backgroundColor: isLight ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.2)' }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{stats.wins}</Text>
            <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Wins</Text>
          </View>
          <View style={[styles.statCell, { backgroundColor: isLight ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.18)' }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{stats.losses}</Text>
            <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Losses</Text>
          </View>
          <View style={[styles.statCell, { backgroundColor: isLight ? 'rgba(100,116,139,0.1)' : 'rgba(100,116,139,0.2)' }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{stats.draws ?? 0}</Text>
            <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Draws</Text>
          </View>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginVertical: 20 }} color={colors.primary} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.id)}
          style={{ maxHeight: 320, marginTop: 8 }}
          ListEmptyComponent={
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 16 }}>
              No duels yet. Open a friend and tap Challenge.
            </Text>
          }
          renderItem={({ item }) => {
            const icon = statusIcon(item);
            const showAccept = item.can_accept === true && (item.raw_status ?? item.status) === 'pending';
            const busy = acceptingId === item.id;
            return (
              <View
                style={[
                  styles.row,
                  {
                    borderColor: colors.border,
                    backgroundColor: isLight ? '#fff' : colors.surfaceSecondary,
                  },
                ]}
              >
                <View style={styles.rowTop}>
                  <Ionicons name={icon.name} size={18} color={icon.color} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.opp, { color: colors.text }]} numberOfLines={1}>
                      vs {item.opponent_name ?? 'Friend'}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                      {item.duration_hours ?? '—'}h · {label(item)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.scores, { color: colors.textSecondary }]}>
                  You {item.your_score ?? 0} · Them {item.opponent_score ?? 0}
                  {typeof item.stake === 'number' && item.stake > 0 ? ` · ${item.stake} gems staked` : ''}
                </Text>
                {showAccept ? (
                  <TouchableOpacity
                    style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                    onPress={() => void acceptChallenge(String(item.id))}
                    disabled={busy}
                    activeOpacity={0.88}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.acceptBtnText}>Accept challenge</Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 12, textAlign: 'center', lineHeight: 17, marginBottom: 12 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statCell: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLbl: { fontSize: 10, marginTop: 2 },
  row: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  opp: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 11, marginTop: 2 },
  scores: { fontSize: 12, marginTop: 8 },
  acceptBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
