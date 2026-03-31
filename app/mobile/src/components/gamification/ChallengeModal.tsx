import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../common/Modal';
import { api } from '../../api/client';

interface Props {
  visible: boolean;
  onClose: () => void;
  targetFriend: { id: string; name: string } | null;
}

const CHALLENGE_TYPES = ['Safest Drive', 'Longest Trip', 'Most Gems Earned'] as const;
const WAGER_OPTIONS = [5, 10, 25] as const;

type ChallengeType = (typeof CHALLENGE_TYPES)[number];

const TYPE_ICONS: Record<ChallengeType, keyof typeof Ionicons.glyphMap> = {
  'Safest Drive': 'shield-checkmark-outline',
  'Longest Trip': 'map-outline',
  'Most Gems Earned': 'diamond-outline',
};

export default function ChallengeModal({ visible, onClose, targetFriend }: Props) {
  const [selectedType, setSelectedType] = useState<ChallengeType>('Safest Drive');
  const [wager, setWager] = useState<number>(10);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!targetFriend) return;
    setSending(true);
    try {
      const res = await api.post('/api/challenges/send', {
        friend_id: targetFriend.id,
        type: selectedType,
        wager,
      });
      if (res.success) {
        Alert.alert('Challenge Sent!', `${targetFriend.name} has been challenged.`);
        onClose();
      } else {
        Alert.alert('Error', res.error || 'Failed to send challenge.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <Text style={styles.title}>
        Challenge {targetFriend?.name ?? 'Friend'}
      </Text>

      <Text style={styles.sectionLabel}>Challenge Type</Text>
      <View style={styles.optionRow}>
        {CHALLENGE_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.typeCard, selectedType === type && styles.typeCardActive]}
            onPress={() => setSelectedType(type)}
          >
            <Ionicons
              name={TYPE_ICONS[type]}
              size={22}
              color={selectedType === type ? '#3B82F6' : '#94a3b8'}
            />
            <Text style={[styles.typeLabel, selectedType === type && styles.typeLabelActive]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Wager</Text>
      <View style={styles.wagerRow}>
        {WAGER_OPTIONS.map((amount) => (
          <TouchableOpacity
            key={amount}
            style={[styles.wagerChip, wager === amount && styles.wagerChipActive]}
            onPress={() => setWager(amount)}
          >
            <Text style={styles.wagerEmoji}>💎</Text>
            <Text style={[styles.wagerText, wager === amount && styles.wagerTextActive]}>
              {amount}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={sending}
      >
        {sending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.sendText}>Send Challenge</Text>
        )}
      </TouchableOpacity>
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 6,
  },
  typeCardActive: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderColor: 'rgba(59,130,246,0.35)',
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
  typeLabelActive: {
    color: '#60a5fa',
  },
  wagerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  wagerChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  wagerChipActive: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderColor: 'rgba(59,130,246,0.35)',
  },
  wagerEmoji: {
    fontSize: 14,
  },
  wagerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94a3b8',
  },
  wagerTextActive: {
    color: '#60a5fa',
  },
  sendBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
