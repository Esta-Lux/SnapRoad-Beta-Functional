import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

interface Friend {
  id: string;
  name: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  friends: Friend[];
  gems: number;
  initialOpponentId?: string | null;
}

const WAGER_OPTIONS = [10, 25, 50, 100] as const;

/** Disable real API with EXPO_PUBLIC_SNAPRACE_ENABLED=0 (default: enabled). */
const SNAPRACE_API_READY = String(process.env.EXPO_PUBLIC_SNAPRACE_ENABLED || '').toLowerCase() !== '0';

export default function SnapRaceMode({ visible, onClose, userId, friends, gems, initialOpponentId }: Props) {
  void userId;
  const { updateUser } = useAuth();
  const { colors, isLight } = useTheme();
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [wager, setWager] = useState<number>(10);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!visible || !initialOpponentId) return;
    const m = friends.find((f) => f.id === initialOpponentId);
    if (m) setSelectedFriend(m);
  }, [visible, initialOpponentId, friends]);

  const sheetBg = colors.surface;
  const text = colors.text;
  const sub = colors.textSecondary;
  const border = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';

  const handleStartRace = async () => {
    if (!SNAPRACE_API_READY) {
      Alert.alert(
        'SnapRace',
        'Head-to-head drives with friends are almost here. In dev builds you can try the API early.',
      );
      return;
    }
    if (!selectedFriend) {
      Alert.alert('Select Opponent', 'Pick a friend to race against.');
      return;
    }
    if (wager > gems) {
      Alert.alert('Not Enough Gems', `You need ${wager} gems but only have ${gems}.`);
      return;
    }
    setStarting(true);
    try {
      const res = await api.post<{
        success?: boolean;
        data?: { race_id?: string; gems_remaining?: number; wager?: number };
      }>('/api/social/snaprace/start', {
        opponent_id: selectedFriend.id,
        wager,
      });
      if (!res.success) {
        Alert.alert('Error', res.error ?? 'Could not start race');
        return;
      }
      const body = res.data;
      const payload = body?.data;
      if (body?.success && payload) {
        if (typeof payload.gems_remaining === 'number') {
          updateUser({ gems: payload.gems_remaining });
        }
        Alert.alert('Race Started!', `Racing ${selectedFriend.name} for ${wager} gems!`);
        onClose();
      } else {
        Alert.alert('Error', 'Could not start race');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const reset = () => {
    setSelectedFriend(null);
    setWager(10);
    setStarting(false);
  };

  const startDisabled = SNAPRACE_API_READY ? (!selectedFriend || starting) : starting;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => { reset(); onClose(); }}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { reset(); onClose(); }}>
        <View style={[styles.sheet, { backgroundColor: sheetBg, borderColor: border }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.handle, { backgroundColor: sub }]} />

          <View style={styles.titleRow}>
            <Ionicons name="flash" size={22} color="#F59E0B" />
            <Text style={[styles.title, { color: text }]}>SnapRace</Text>
          </View>

          {!SNAPRACE_API_READY && (
            <View style={{ backgroundColor: isLight ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.18)', borderRadius: 12, padding: 10, marginBottom: 12 }}>
              <Text style={{ color: text, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                SnapRace is disabled in this build. Remove EXPO_PUBLIC_SNAPRACE_ENABLED=0 to enable challenges.
              </Text>
            </View>
          )}

          <View style={styles.gemsRow}>
            <Ionicons name="diamond-outline" size={14} color="#A78BFA" />
            <Text style={[styles.gemsText, { color: sub }]}>{gems} gems available</Text>
          </View>

          <Text style={[styles.label, { color: sub }]}>Select Opponent</Text>
          {friends.length === 0 ? (
            <Text style={[styles.emptyText, { color: sub }]}>No friends on the map yet — connect under Social.</Text>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(f) => f.id}
              style={styles.friendList}
              renderItem={({ item }) => {
                const selected = selectedFriend?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.friendRow,
                      { borderColor: border },
                      selected && { backgroundColor: isLight ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.2)' },
                    ]}
                    onPress={() => setSelectedFriend(item)}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{(item.name ?? 'U')[0].toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.friendName, { color: text }]}>{item.name}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <Text style={[styles.label, { marginTop: 16, color: sub }]}>Wager Gems</Text>
          <View style={styles.wagerRow}>
            {WAGER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.wagerChip,
                  { borderColor: border, backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' },
                  wager === opt && { backgroundColor: isLight ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.22)', borderColor: colors.primary },
                ]}
                onPress={() => setWager(opt)}
              >
                <Text style={[styles.wagerChipText, { color: sub }, wager === opt && { color: colors.primary }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.primary }, startDisabled && { opacity: 0.5 }]}
            onPress={handleStartRace}
            disabled={startDisabled}
          >
            {starting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name={SNAPRACE_API_READY ? 'flag' : 'hourglass-outline'} size={18} color="#fff" />
                <Text style={styles.startBtnText}>{SNAPRACE_API_READY ? 'Start Race' : 'Coming soon'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '85%',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  gemsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 20 },
  gemsText: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  friendList: { maxHeight: 180 },
  friendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4, borderWidth: StyleSheet.hairlineWidth },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  friendName: { flex: 1, fontSize: 15, fontWeight: '600' },
  wagerRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  wagerChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  wagerChipText: { fontSize: 16, fontWeight: '700' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 16 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
