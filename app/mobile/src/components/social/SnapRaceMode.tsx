import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';

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
}

const WAGER_OPTIONS = [10, 25, 50, 100] as const;

export default function SnapRaceMode({ visible, onClose, userId, friends, gems }: Props) {
  // Backend route /api/social/snaprace/start does not exist yet — hide until built
  if (!__DEV__) return null;
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [wager, setWager] = useState<number>(10);
  const [starting, setStarting] = useState(false);

  const handleStartRace = async () => {
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
      const res = await api.post('/api/social/snaprace/start', {
        opponent_id: selectedFriend.id,
        wager,
      });
      if (res.success) {
        Alert.alert('Race Started!', `Racing ${selectedFriend.name} for ${wager} gems!`);
        onClose();
      } else {
        Alert.alert('Error', (res as any).error ?? 'Could not start race');
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => { reset(); onClose(); }}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { reset(); onClose(); }}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Ionicons name="flash" size={22} color="#F59E0B" />
            <Text style={styles.title}>SnapRace</Text>
          </View>

          <View style={styles.gemsRow}>
            <Ionicons name="diamond-outline" size={14} color="#A78BFA" />
            <Text style={styles.gemsText}>{gems} gems available</Text>
          </View>

          <Text style={styles.label}>Select Opponent</Text>
          {friends.length === 0 ? (
            <Text style={styles.emptyText}>No friends available to race</Text>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(f) => f.id}
              style={styles.friendList}
              renderItem={({ item }) => {
                const selected = selectedFriend?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.friendRow, selected && styles.friendRowSelected]}
                    onPress={() => setSelectedFriend(item)}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{(item.name ?? 'U')[0].toUpperCase()}</Text>
                    </View>
                    <Text style={styles.friendName}>{item.name}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <Text style={[styles.label, { marginTop: 16 }]}>Wager Gems</Text>
          <View style={styles.wagerRow}>
            {WAGER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.wagerChip, wager === opt && styles.wagerChipActive]}
                onPress={() => setWager(opt)}
              >
                <Text style={[styles.wagerChipText, wager === opt && styles.wagerChipTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.startBtn, (!selectedFriend || starting) && { opacity: 0.5 }]}
            onPress={handleStartRace}
            disabled={!selectedFriend || starting}
          >
            {starting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="flag" size={18} color="#fff" />
                <Text style={styles.startBtnText}>Start Race</Text>
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
  sheet: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '85%' },
  handle: { width: 36, height: 4, backgroundColor: '#475569', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: '#f8fafc', textAlign: 'center' },
  gemsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 20 },
  gemsText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  friendList: { maxHeight: 180 },
  friendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  friendRowSelected: { backgroundColor: 'rgba(59,130,246,0.15)' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  friendName: { flex: 1, color: '#f8fafc', fontSize: 15, fontWeight: '600' },
  wagerRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  wagerChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(148,163,184,0.1)', borderWidth: 1.5, borderColor: 'transparent' },
  wagerChipActive: { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: '#3B82F6' },
  wagerChipText: { color: '#94a3b8', fontSize: 16, fontWeight: '700' },
  wagerChipTextActive: { color: '#3B82F6' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3B82F6', borderRadius: 14, paddingVertical: 16 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
