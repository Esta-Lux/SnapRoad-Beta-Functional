import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { selectLegalBody, type LegalDocDetailRow } from '../../api/dto/legal';
import { storage } from '../../utils/storage';

const STORAGE_KEY = 'snaproad_legal_accept_v1';

type DocSummary = { id: string; name: string; type?: string; description?: string };

/**
 * First-launch (per install) consent after sign-in when admin marks docs `is_required`,
 * or when any published legal docs exist (fallback so new users always acknowledge policies).
 */
export default function LegalConsentGate() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [docModal, setDocModal] = useState<{ title: string; body: string } | null>(null);
  const [agreed, setAgreed] = useState(false);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      let list: DocSummary[] = [];
      const required = await api.get('/api/legal/documents?required_only=true');
      const rdata = (required.data as { data?: DocSummary[] })?.data;
      if (required.success && Array.isArray(rdata)) list = rdata;
      if (list.length === 0) {
        const all = await api.get('/api/legal/documents');
        const adata = (all.data as { data?: DocSummary[] })?.data;
        if (all.success && Array.isArray(adata)) list = adata;
      }
      setDocs(list);
      if (list.length === 0) {
        storage.set(STORAGE_KEY, new Date().toISOString());
        setVisible(false);
      } else if (!storage.getString(STORAGE_KEY)) {
        setVisible(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (storage.getString(STORAGE_KEY)) return;
    loadDocs();
  }, [isAuthenticated, loadDocs]);

  const openDoc = async (d: DocSummary) => {
    const res = await api.get(`/api/legal/documents/${d.id}`);
    const row = (res.data as { data?: LegalDocDetailRow })?.data;
    setDocModal({ title: d.name, body: selectLegalBody(row) });
  };

  const onAccept = () => {
    if (!agreed) return;
    storage.set(STORAGE_KEY, new Date().toISOString());
    setVisible(false);
  };

  if (!isAuthenticated || !visible) return null;

  return (
    <>
      <Modal visible transparent animationType="fade">
        <View style={[styles.backdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>Before you drive</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>
              Review SnapRoad policies. Required documents from your admin portal are listed below. Tap a title to read the full text, then confirm you agree to continue.
            </Text>
            {loading ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color={colors.primary} />
            ) : (
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {docs.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.docRow, { borderColor: colors.border }]}
                    onPress={() => openDoc(d)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.docName, { color: colors.primary }]}>{d.name}</Text>
                    {d.description ? <Text style={[styles.docDesc, { color: colors.textSecondary }]} numberOfLines={2}>{d.description}</Text> : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.checkRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.8}>
              <View style={[styles.checkbox, { borderColor: colors.border }, agreed && { backgroundColor: colors.primary, borderColor: colors.primary }]} />
              <Text style={[styles.checkLabel, { color: colors.text, marginLeft: 10 }]}>
                I have read and agree to the applicable policies.
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cta, { backgroundColor: agreed ? colors.primary : colors.border }]}
              onPress={onAccept}
              disabled={!agreed}
              activeOpacity={0.9}
            >
              <Text style={styles.ctaText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!docModal} transparent animationType="slide" onRequestClose={() => setDocModal(null)}>
        <View style={[styles.backdrop, { paddingTop: insets.top }]}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{docModal?.title}</Text>
            <ScrollView style={styles.sheetScroll}>
              <Text style={[styles.sheetBody, { color: colors.text }]}>{docModal?.body}</Text>
            </ScrollView>
            <TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary, marginTop: 8 }]} onPress={() => setDocModal(null)}>
              <Text style={styles.ctaText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: { borderRadius: 20, padding: 20, maxHeight: Platform.OS === 'web' ? '80%' as any : '85%' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  sub: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  list: { maxHeight: 220, marginBottom: 12 },
  docRow: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  docName: { fontSize: 15, fontWeight: '700' },
  docDesc: { fontSize: 12, marginTop: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2 },
  checkLabel: { flex: 1, fontSize: 14, lineHeight: 20 },
  cta: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '90%' },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  sheetScroll: { maxHeight: 420 },
  sheetBody: { fontSize: 14, lineHeight: 22 },
});
