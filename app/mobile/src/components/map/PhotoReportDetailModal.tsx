import React from 'react';
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
}

function timeAgo(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.round(diff / 60)}h ago`;
}

export default function PhotoReportDetailModal({ visible, report, onClose }: Props) {
  const { colors, isLight } = useTheme();
  const url = report?.photo_url || report?.thumbnail_url;

  async function upvote() {
    if (!report?.id) return;
    const res = await api.post(`/api/photo-reports/${report.id}/upvote`);
    if (!res.success) {
      Alert.alert('Could not upvote', res.error || 'Try again later.');
      return;
    }
    Alert.alert('Thanks', 'Your upvote was recorded.');
  }

  return (
    <Modal visible={visible} onClose={onClose} panDismissible>
      <Text style={[styles.title, { color: colors.text }]}>Reported road condition</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        Community photo — faces and plates are blurred before publishing. Automated processing may miss some details; this is not legal advice.
      </Text>

      {url ? (
        <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="image-outline" size={40} color={colors.textTertiary} />
        </View>
      )}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.type, { color: colors.primary }]}>{report?.type || 'photo'}</Text>
        {!!report?.description && (
          <Text style={[styles.desc, { color: colors.text }]}>{report.description}</Text>
        )}
        {!!report?.created_at && (
          <Text style={[styles.meta, { color: colors.textTertiary }]}>{timeAgo(report.created_at)}</Text>
        )}
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
        <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.primary }]} onPress={upvote}>
          <Ionicons name="thumbs-up-outline" size={18} color="#fff" />
          <Text style={styles.btnPrimaryTxt}>
            Upvote{typeof report?.upvotes === 'number' ? ` (${report.upvotes})` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  sub: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  image: { width: '100%', height: 220, borderRadius: 14, marginBottom: 12 },
  placeholder: { height: 200, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  scroll: { maxHeight: 220 },
  type: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize', marginBottom: 6 },
  desc: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  meta: { fontSize: 13, marginBottom: 12 },
  disclaimer: { fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnTxt: { fontWeight: '600', fontSize: 16 },
  btnPrimary: { flex: 1, flexDirection: 'row', gap: 8, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
