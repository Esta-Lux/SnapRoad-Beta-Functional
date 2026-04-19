import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../common/Modal';
import { useTheme } from '../../contexts/ThemeContext';

function formatPlanLabel(plan?: string): string {
  const p = (plan || 'premium').toLowerCase();
  if (p === 'family') return 'Family';
  return 'Premium';
}

function formatUntil(dateIso?: string): string {
  if (!dateIso || !dateIso.trim()) return '';
  try {
    const d = new Date(dateIso.includes('T') ? dateIso : `${dateIso.slice(0, 10)}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return dateIso.slice(0, 10);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateIso.slice(0, 10);
  }
}

interface Props {
  visible: boolean;
  promotionPlan?: string;
  promotionAccessUntil?: string;
  onMaybeLater: () => void;
  onViewPlans: () => void;
}

/**
 * Shown when an admin has granted time-boxed Premium/Family access.
 * “Maybe later” dismisses for this promo window; “View plans” opens billing.
 */
export default function DriverPromotionWelcomeSheet({
  visible,
  promotionPlan,
  promotionAccessUntil,
  onMaybeLater,
  onViewPlans,
}: Props) {
  const { colors, isLight } = useTheme();
  const label = useMemo(() => formatPlanLabel(promotionPlan), [promotionPlan]);
  const until = useMemo(() => formatUntil(promotionAccessUntil), [promotionAccessUntil]);

  return (
    <Modal visible={visible} onClose={onMaybeLater} scrollable={false}>
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: isLight ? '#EEF2FF' : 'rgba(99,102,241,0.2)' }]}>
          <Ionicons name="gift" size={28} color="#6366F1" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Complimentary access</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          SnapRoad for you is unlocked at the <Text style={{ fontWeight: '800', color: colors.text }}>{label}</Text> level
          {until ? ` through ${until}` : ''}. Enjoy full driver features for this period. When it ends, you can subscribe
          from Profile to keep Premium benefits.
        </Text>
      </View>
      <TouchableOpacity activeOpacity={0.9} onPress={onViewPlans} style={styles.primaryWrap}>
        <LinearGradient
          colors={['#4F46E5', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>View plans & billing</Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity onPress={onMaybeLater} style={styles.secondaryBtn} hitSlop={{ top: 12, bottom: 12 }}>
        <Text style={[styles.secondaryText, { color: colors.primary }]}>Maybe later</Text>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerRow: { alignItems: 'center', paddingBottom: 8 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  sub: { fontSize: 15, lineHeight: 22, textAlign: 'center', paddingHorizontal: 4 },
  primaryWrap: { marginTop: 22 },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { marginTop: 14, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { fontSize: 16, fontWeight: '700' },
});
