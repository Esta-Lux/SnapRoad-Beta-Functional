import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../common/Modal';
import { api } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';

const CHALLENGE_TYPES = [
  { key: 'safest_drive', label: 'Safest Drive', icon: 'shield-checkmark-outline' as const },
  { key: 'longest_trip', label: 'Longest Trip', icon: 'map-outline' as const },
  { key: 'most_gems_earned', label: 'Most Gems Earned', icon: 'diamond-outline' as const },
] as const;

const DURATION_OPTIONS = [
  { hours: 24, label: '24h' },
  { hours: 72, label: '3d' },
  { hours: 168, label: '7d' },
] as const;

const STAKE_PRESETS = [0, 10, 25, 50, 100, 250, 500] as const;
const CUSTOM_MSG_MAX = 220;

interface Props {
  visible: boolean;
  onClose: () => void;
  targetFriend: { id: string; name: string } | null;
  gemBalance: number;
  onChallenged?: (newGemTotal?: number) => void;
}

export default function ChallengeModal({
  visible,
  onClose,
  targetFriend,
  gemBalance,
  onChallenged,
}: Props) {
  const { colors, isLight } = useTheme();
  const [typeKey, setTypeKey] = useState<(typeof CHALLENGE_TYPES)[number]['key']>('safest_drive');
  const [stake, setStake] = useState<number>(25);
  const [durationHours, setDurationHours] = useState<number>(72);
  const [customMessage, setCustomMessage] = useState('');
  const [step, setStep] = useState<'edit' | 'preview'>('edit');
  const [sending, setSending] = useState(false);

  const stakeChoices = useMemo(() => STAKE_PRESETS.filter((n) => n <= gemBalance), [gemBalance]);

  useEffect(() => {
    if (visible && targetFriend) {
      setStake((prev) => Math.min(prev, gemBalance));
      setStep('edit');
    }
  }, [visible, targetFriend?.id, gemBalance]);

  const reset = useCallback(() => {
    setTypeKey('safest_drive');
    setStake(Math.min(25, gemBalance));
    setDurationHours(72);
    setCustomMessage('');
    setStep('edit');
  }, [gemBalance]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!targetFriend) return;
    if (stake > gemBalance) {
      Alert.alert('Not enough gems', `You need ${stake} gems to stake this amount.`);
      return;
    }
    setSending(true);
    try {
      const res = await api.post<{
        success?: boolean;
        data?: { challenger_gems_remaining?: number };
        message?: string;
        detail?: string;
      }>('/api/challenges', {
        opponent_id: targetFriend.id,
        stake,
        duration_hours: durationHours,
        challenge_type: typeKey,
        custom_message: customMessage.trim() || null,
      });
      if (!res.success) {
        Alert.alert('Challenge', res.error || 'Could not send challenge.');
        return;
      }
      const envelope = res.data as { data?: { challenger_gems_remaining?: number } } | undefined;
      const rem = envelope?.data?.challenger_gems_remaining;
      onChallenged?.(typeof rem === 'number' ? rem : undefined);
      Alert.alert('Challenge sent!', `${targetFriend.name} will see your invite in their challenge history.`);
      handleClose();
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!visible) return null;

  const typeLabel = CHALLENGE_TYPES.find((t) => t.key === typeKey)?.label ?? '';
  const durLabel = DURATION_OPTIONS.find((d) => d.hours === durationHours)?.label ?? `${durationHours}h`;

  return (
    <Modal visible={visible} onClose={handleClose} scrollable>
      <Text style={[styles.title, { color: colors.text }]}>Challenge {targetFriend?.name ?? 'Friend'}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Stake gems (0–{Math.min(10000, gemBalance)} now) and add a short message. Opponent matches your stake when they accept.
      </Text>

      {step === 'edit' ? (
        <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.section, { color: colors.textSecondary }]}>Type</Text>
          <View style={styles.typeRow}>
            {CHALLENGE_TYPES.map((t) => {
              const active = typeKey === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: active ? `${colors.primary}18` : colors.surfaceSecondary,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setTypeKey(t.key)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={t.icon} size={22} color={active ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.typeLabel, { color: active ? colors.primary : colors.textSecondary }]} numberOfLines={2}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.section, { color: colors.textSecondary }]}>Your stake (gems)</Text>
          <View style={styles.stakeWrap}>
            {stakeChoices.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>No stake presets for your balance — use 0 or earn gems.</Text>
            ) : (
              <View style={styles.stakeRow}>
                {stakeChoices.map((n) => {
                  const active = stake === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.stakeChip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? `${colors.primary}16` : colors.surfaceSecondary,
                        },
                      ]}
                      onPress={() => setStake(n)}
                    >
                      <Text style={[styles.stakeChipText, { color: active ? colors.primary : colors.text }]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <Text style={[styles.balanceHint, { color: colors.textSecondary }]}>Balance: {gemBalance} gems</Text>
          </View>

          <Text style={[styles.section, { color: colors.textSecondary }]}>Duration</Text>
          <View style={styles.durRow}>
            {DURATION_OPTIONS.map((d) => {
              const active = durationHours === d.hours;
              return (
                <TouchableOpacity
                  key={d.hours}
                  style={[
                    styles.durChip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? `${colors.primary}16` : colors.surfaceSecondary,
                    },
                  ]}
                  onPress={() => setDurationHours(d.hours)}
                >
                  <Text style={[styles.durChipText, { color: active ? colors.primary : colors.text }]}>{d.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.section, { color: colors.textSecondary }]}>Message to the room (optional)</Text>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
            ]}
            placeholder="What should everyone see? (e.g. “Safest highway merge wins”)"
            placeholderTextColor={colors.textTertiary}
            value={customMessage}
            onChangeText={(t) => setCustomMessage(t.slice(0, CUSTOM_MSG_MAX))}
            multiline
            maxLength={CUSTOM_MSG_MAX}
          />
          <Text style={[styles.count, { color: colors.textTertiary }]}>{customMessage.length}/{CUSTOM_MSG_MAX}</Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => setStep('preview')}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>Preview</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View>
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
              },
            ]}
          >
            <Text style={[styles.previewLine, { color: colors.text }]}>
              <Text style={{ fontWeight: '700' }}>Type: </Text>
              {typeLabel}
            </Text>
            <Text style={[styles.previewLine, { color: colors.text }]}>
              <Text style={{ fontWeight: '700' }}>Stake: </Text>
              {stake} gems each when accepted
            </Text>
            <Text style={[styles.previewLine, { color: colors.text }]}>
              <Text style={{ fontWeight: '700' }}>Duration: </Text>
              {durLabel}
            </Text>
            {customMessage.trim() ? (
              <Text style={[styles.previewMsg, { color: colors.textSecondary }]}>“{customMessage.trim()}”</Text>
            ) : (
              <Text style={[styles.previewMsg, { color: colors.textTertiary }]}>No custom message</Text>
            )}
          </View>
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              onPress={() => setStep('edit')}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1, marginBottom: 0 }]}
              onPress={submit}
              disabled={sending}
            >
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send challenge</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 6, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8, marginTop: 6 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  typeLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  stakeWrap: { marginBottom: 8 },
  stakeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stakeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stakeChipText: { fontSize: 14, fontWeight: '700' },
  balanceHint: { fontSize: 12, marginTop: 8, fontWeight: '500' },
  durRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  durChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  durChipText: { fontSize: 14, fontWeight: '700' },
  input: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 88,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  count: { fontSize: 11, textAlign: 'right', marginTop: 4, marginBottom: 8 },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  previewCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
    gap: 8,
  },
  previewLine: { fontSize: 15, lineHeight: 22 },
  previewMsg: { fontSize: 14, lineHeight: 20, marginTop: 6, fontStyle: 'italic' },
  previewActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  secondaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700' },
});
