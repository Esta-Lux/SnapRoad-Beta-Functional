import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { fetchPublicLegalDocument } from '../../api/legalDocuments';
import { storage } from '../../utils/storage';
import { openLegalDocumentExternally } from '../../utils/openLegalDocument';
import type { LegalDocSlug } from '../../utils/legalUrls';

const STORAGE_KEY = 'snaproad_legal_accept_v1';

/** Same policies linked from IAP paywalls and Profile → Settings → About. */
const CONSENT_POLICIES: { slug: LegalDocSlug; label: string; description: string }[] = [
  {
    slug: 'terms-of-service',
    label: 'Terms of Service',
    description: 'Rules for using SnapRoad, subscriptions, and driver features.',
  },
  {
    slug: 'privacy-policy',
    label: 'Privacy Policy',
    description: 'How we collect, use, and protect your data.',
  },
  {
    slug: 'community-guidelines',
    label: 'Community Guidelines',
    description: 'Safe driving, reports, and respectful community behavior.',
  },
];

/**
 * First-launch (per install) consent after sign-in. Policy links open the same
 * public documents as the rest of the app (in-app browser), with an API-backed
 * in-app reader fallback when offline or the browser cannot open.
 */
export default function LegalConsentGate() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [docModal, setDocModal] = useState<{ title: string; body: string } | null>(null);
  const [openingSlug, setOpeningSlug] = useState<LegalDocSlug | null>(null);
  const [agreed, setAgreed] = useState(false);

  const loadGate = useCallback(async () => {
    if (storage.getString(STORAGE_KEY)) {
      setVisible(false);
      return;
    }
    setLoading(true);
    try {
      setVisible(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (storage.getString(STORAGE_KEY)) return;
    void loadGate();
  }, [isAuthenticated, loadGate]);

  const openPolicy = async (slug: LegalDocSlug, label: string) => {
    setOpeningSlug(slug);
    try {
      const openedExternally = await openLegalDocumentExternally(slug);
      if (openedExternally) return;
      const doc = await fetchPublicLegalDocument(slug);
      setDocModal({ title: doc.title || label, body: doc.body });
    } catch {
      Alert.alert(
        label,
        'Could not open this policy right now. Check your connection and try again.',
      );
    } finally {
      setOpeningSlug(null);
    }
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
              Review SnapRoad policies before your first trip. Tap a policy to read the full document, then confirm you agree to continue.
            </Text>
            {loading ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color={colors.primary} />
            ) : (
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {CONSENT_POLICIES.map((policy) => (
                  <TouchableOpacity
                    key={policy.slug}
                    style={[styles.docRow, { borderColor: colors.border }]}
                    onPress={() => { void openPolicy(policy.slug, policy.label); }}
                    activeOpacity={0.75}
                    disabled={openingSlug === policy.slug}
                  >
                    <Text style={[styles.docName, { color: colors.primary }]}>{policy.label}</Text>
                    <Text style={[styles.docDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {policy.description}
                    </Text>
                    {openingSlug === policy.slug ? (
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 6 }} />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.checkRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.8}>
              <View style={[styles.checkbox, { borderColor: colors.border }, agreed && { backgroundColor: colors.primary, borderColor: colors.primary }]} />
              <Text style={[styles.checkLabel, { color: colors.text, marginLeft: 10 }]}>
                I have read and agree to the Terms of Service, Privacy Policy, and Community Guidelines.
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
  list: { maxHeight: 260, marginBottom: 12 },
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
