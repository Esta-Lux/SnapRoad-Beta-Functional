import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../common/Modal';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import type { PhotoReport } from './PhotoReportMarkers';

interface Props {
  visible: boolean;
  report: PhotoReport | null;
  onClose: () => void;
  /** After vote, parent can refetch pins or remove dismissed items */
  onVotesChanged?: () => void;
}

function timeAgo(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.round(diff / 60)}h ago`;
}

export default function PhotoReportDetailModal({ visible, report, onClose, onVotesChanged }: Props) {
  const { colors, isLight } = useTheme();
  const url = report?.photo_url || report?.thumbnail_url;
  const [netVotes, setNetVotes] = useState(report?.upvotes ?? 0);

  useEffect(() => {
    setNetVotes(report?.upvotes ?? 0);
  }, [report?.id, report?.upvotes]);

  async function upvote() {
    if (!report?.id) return;
    const res = await api.post<{ upvotes?: number }>(`/api/photo-reports/${report.id}/upvote`);
    if (!res.success) {
      Alert.alert('Could not upvote', res.error || 'Try again later.');
      return;
    }
    const u = (res.data as { upvotes?: number })?.upvotes;
    if (typeof u === 'number') setNetVotes(u);
    onVotesChanged?.();
    const rr = (res.data as {
      reporter_reward?: { gems_awarded?: number; xp_result?: { leveled_up?: boolean; new_level?: number; xp_gained?: number } };
    })?.reporter_reward;
    const xp = rr?.xp_result;
    if (rr?.gems_awarded) {
      const lvl = xp?.leveled_up && typeof xp?.new_level === 'number' ? ` They reached level ${xp.new_level}.` : '';
      Alert.alert('Thanks', `Confirmed. The reporter earned ${rr.gems_awarded} gems and ${xp?.xp_gained ?? 15} XP.${lvl}`);
    } else {
      Alert.alert('Thanks', 'Your upvote was recorded.');
    }
  }

  async function downvote() {
    if (!report?.id) return;
    const res = await api.post<{ upvotes?: number; removed?: boolean }>(`/api/photo-reports/${report.id}/downvote`);
    if (!res.success) {
      Alert.alert('Could not downvote', res.error || 'Try again later.');
      return;
    }
    const d = res.data as { upvotes?: number; removed?: boolean };
    if (typeof d?.upvotes === 'number') setNetVotes(d.upvotes);
    onVotesChanged?.();
    if (d?.removed) {
      Alert.alert('Removed from map', 'Enough community votes indicate this pin is no longer useful here.', [
        { text: 'OK', onPress: onClose },
      ]);
      return;
    }
    Alert.alert('Recorded', 'Thanks — we\'ve adjusted confidence on this pin.');
  }

  return (
    <Modal visible={visible} onClose={onClose} panDismissible scrollable={false}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text, flex: 1 }]} numberOfLines={2}>
          Reported road condition
        </Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close-circle" size={32} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        Community photo — faces and plates are blurred before publishing. Automated processing may miss some details; this is not legal advice.
      </Text>

      {url ? (
        <Image source={{ uri: url }} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="image-outline" size={40} color={colors.textTertiary} />
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.type, { color: colors.primary }]}>{report?.type || 'photo'}</Text>
        {!!report?.description && (
          <Text style={[styles.desc, { color: colors.text }]}>{report.description}</Text>
        )}
        {!!report?.created_at && (
          <Text style={[styles.meta, { color: colors.textTertiary }]}>{timeAgo(report.created_at)}</Text>
        )}
        <Text style={[styles.netRow, { color: colors.textSecondary }]}>
          Community net score: <Text style={{ fontWeight: '800', color: colors.text }}>{netVotes}</Text>
          {' '}· If the score goes below zero, this pin is hidden for everyone until it expires (~3–4 h).
        </Text>
        <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
          Map data and reports may be incomplete or mistaken. Always obey posted speed limits and drive for conditions.
        </Text>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)' }]}
          onPress={onClose}
        >
          <Text style={[styles.btnTxt, { color: colors.text }]}>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnVote, { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.4)' }]}
          onPress={downvote}
        >
          <Ionicons name="thumbs-down-outline" size={18} color="#EF4444" />
          <Text style={styles.btnVoteTxt}>Downvote</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.primary }]} onPress={upvote}>
          <Ionicons name="thumbs-up-outline" size={18} color="#fff" />
          <Text style={styles.btnPrimaryTxt}>Upvote</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  sub: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  image: { width: '100%', height: 280, borderRadius: 16, marginBottom: 12 },
  placeholder: { height: 200, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  scroll: { maxHeight: 220 },
  type: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize', marginBottom: 6 },
  desc: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  meta: { fontSize: 13, marginBottom: 12 },
  netRow: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  disclaimer: { fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  btn: { flexGrow: 1, minWidth: '28%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnTxt: { fontWeight: '600', fontSize: 15 },
  btnVote: {
    flexGrow: 1,
    minWidth: '28%',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnVoteTxt: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
  btnPrimary: { flexGrow: 1, minWidth: '28%', flexDirection: 'row', gap: 8, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
