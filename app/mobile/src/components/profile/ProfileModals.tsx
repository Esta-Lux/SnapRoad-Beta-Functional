import React, { useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import SheetModal from '../common/Modal';
import { PLANS } from '../../constants/plans';
import { fetchPublicLegalDocument } from '../../api/legalDocuments';
import type { PublicLegalSlug } from '../../api/dto/legal';
import type { PlanTier } from '../../types';
import { FAMILY_MODE_LAUNCH_ENABLED } from '../../config/launchFlags';
export function LevelProgressModal({
  visible,
  onClose,
  cardBg,
  text,
  sub,
  level,
  totalXp,
}: {
  visible: boolean;
  onClose: () => void;
  cardBg: string;
  text: string;
  sub: string;
  level: number;
  totalXp: number;
}) {
  const levelXpCap = level * 2500;
  const levelXpFloor = Math.max(0, (level - 1) * 2500);
  const levelProgress = Math.max(0, Math.min(1, (totalXp - levelXpFloor) / Math.max(1, levelXpCap - levelXpFloor)));
  const toNext = Math.max(0, levelXpCap - totalXp);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: text, marginBottom: 2 }]}>Level & XP</Text>
          <Text style={{ color: sub, fontSize: 12, textAlign: 'center', marginBottom: 12 }}>Track your progress</Text>
          <LinearGradient colors={['#1E3A8A', '#0F172A']} style={styles.levelHero}>
            <View style={styles.levelRing}><Text style={styles.levelRingText}>{level}</Text></View>
            <Text style={styles.levelTotalXp}>Total XP: {totalXp.toLocaleString()}</Text>
            <Text style={styles.levelRange}>{`${levelXpFloor.toLocaleString()} / ${levelXpCap.toLocaleString()} XP`}</Text>
            <View style={styles.levelTrack}><View style={[styles.levelFill, { width: `${levelProgress * 100}%` }]} /></View>
            <Text style={styles.levelNext}>{toNext.toLocaleString()} XP to next level</Text>
          </LinearGradient>

          <Text style={[styles.modalSectionTitle, { color: text }]}>How to Earn XP</Text>
          {[
            { label: 'Post road report', value: '+500 XP', color: '#F59E0B', icon: 'megaphone-outline' },
            { label: 'Redeem an offer', value: '+700 XP', color: '#34D399', icon: 'gift-outline' },
            { label: 'Safe drive', value: '+1000 XP', color: '#60A5FA', icon: 'car-outline' },
            { label: '3 safe drives streak', value: '+500 XP', color: '#F59E0B', icon: 'flame-outline' },
            { label: 'Safety score drops', value: '-500 XP', color: '#F87171', icon: 'warning-outline' },
          ].map((row) => (
            <View key={row.label} style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Ionicons name={row.icon as any} size={15} color={row.color} />
                <Text style={[styles.infoRowLabel, { color: text }]}>{row.label}</Text>
              </View>
              <Text style={[styles.infoRowValue, { color: row.color }]}>{row.value}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function IncidentReportModal({ visible, onClose, onTakePhoto, onPickGallery }: { visible: boolean; onClose: () => void; onTakePhoto: () => void; onPickGallery: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalSheet, { backgroundColor: '#1E293B' }]} onStartShouldSetResponder={() => true}>
          <View style={styles.incidentHeader}>
            <TouchableOpacity onPress={onClose}><Text style={styles.incidentHeaderText}>Close</Text></TouchableOpacity>
            <Text style={styles.incidentHeaderText}>Report incident</Text>
            <Text style={styles.incidentHeaderText}> </Text>
          </View>
          <View style={styles.incidentCameraBox}>
            <Ionicons name="camera-outline" size={28} color="#64748B" />
            <Text style={styles.incidentCameraSub}>Take or select a photo</Text>
          </View>
          <View style={styles.incidentActions}>
            <TouchableOpacity style={styles.incidentPrimaryBtn} onPress={onTakePhoto}>
              <Ionicons name="camera-outline" size={16} color="#fff" />
              <Text style={styles.incidentPrimaryText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.incidentSecondaryBtn} onPress={onPickGallery}>
              <Ionicons name="images-outline" size={16} color="#fff" />
              <Text style={styles.incidentPrimaryText}>Gallery</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={onClose}><Text style={styles.incidentCancel}>Cancel</Text></TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function PlanModal(props: {
  visible: boolean;
  onClose: () => void;
  cardBg: string;
  text: string;
  sub: string;
  currentPlan: PlanTier;
  onSelectPlan: (tier: PlanTier) => void;
  isLight?: boolean;
  /** Required by Apple; wired by ProfileScreen to call `restoreApplePurchases`. */
  onRestorePurchases?: () => void;
  /** Tapping these opens the public legal pages (web URL or in-app sheet). */
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  /** True while a restore is in flight so the link can show a spinner state. */
  restoreInFlight?: boolean;
}) {
  const {
    visible,
    onClose,
    cardBg,
    text,
    sub,
    currentPlan,
    onSelectPlan,
    isLight,
    onRestorePurchases,
    onOpenTerms,
    onOpenPrivacy,
    restoreInFlight,
  } = props;
  const [selected, setSelected] = useState<PlanTier | null>(null);
  const [legalModal, setLegalModal] = useState<{ title: string; body: string } | null>(null);
  const [legalLoading, setLegalLoading] = useState<PublicLegalSlug | null>(null);

  const handleContinue = () => {
    if (selected) { onSelectPlan(selected); }
  };

  const openLegal = async (slug: PublicLegalSlug, fallback?: () => void) => {
    setLegalLoading(slug);
    try {
      const doc = await fetchPublicLegalDocument(slug);
      setLegalModal({ title: doc.title, body: doc.body });
    } catch {
      fallback?.();
    } finally {
      setLegalLoading(null);
    }
  };

  const PLAN_ICONS: Record<PlanTier, string> = { basic: 'shield-outline', premium: 'flash-outline', family: 'people-outline' };
  const PLAN_COLORS: Record<PlanTier, string> = { basic: '#007AFF', premium: '#FF9500', family: '#7C3AED' };
  const isIosPaidSelected =
    Platform.OS === 'ios' && (selected === 'premium' || selected === 'family');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.planModalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHandle} />
          <TouchableOpacity
            style={[styles.planCloseButton, { backgroundColor: isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.08)' }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close plan selection"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color={sub} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="sparkles" size={18} color="#FF9500" />
            <Text style={{ color: '#FF9500', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 4, textTransform: 'uppercase' }}>Choose your plan</Text>
            <Text style={[styles.modalTitle, { color: text, marginBottom: 0, marginTop: 4 }]}>Start your journey</Text>
            <Text style={{ color: sub, fontSize: 13, marginTop: 4 }}>Drive safer. Earn rewards. Privacy guaranteed.</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {(Object.entries(PLANS) as [PlanTier, typeof PLANS.basic][])
              .filter(([tier]) => FAMILY_MODE_LAUNCH_ENABLED || tier !== 'family')
              .map(([tier, plan]) => {
              const isSel = selected === tier;
              const isCurrent = currentPlan === tier;
              const accent = PLAN_COLORS[tier as PlanTier];
              const isComingSoon = !!(plan as any).comingSoon;
              const isPopular = !!(plan as any).popular;

              return (
                <TouchableOpacity
                  key={tier}
                  activeOpacity={isComingSoon ? 1 : 0.7}
                  onPress={() => { if (!isComingSoon) setSelected(tier as PlanTier); }}
                  style={[
                    styles.planCardNew,
                    { borderColor: isSel ? accent : isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)', backgroundColor: isLight ? '#fff' : 'rgba(255,255,255,0.04)' },
                    isSel && { borderWidth: 2, backgroundColor: isLight ? `${accent}08` : `${accent}15` },
                    isComingSoon && { opacity: 0.55 },
                  ]}
                >
                  {isPopular && (
                    <LinearGradient colors={['#FF9500', '#FF6B00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>Most popular</Text>
                    </LinearGradient>
                  )}
                  {isComingSoon && (
                    <View style={[styles.popularBadge, { backgroundColor: '#7C3AED' }]}>
                      <Text style={styles.popularBadgeText}>Coming Soon</Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name={PLAN_ICONS[tier as PlanTier] as any} size={16} color={accent} />
                        <Text style={{ color: accent, fontSize: 16, fontWeight: '800' }}>{plan.name}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        <Text style={{ color: text, fontSize: 26, fontWeight: '900' }}>{plan.price.split('/')[0]}</Text>
                        {plan.price.includes('/') && <Text style={{ color: sub, fontSize: 13 }}>/{plan.price.split('/')[1]}</Text>}
                      </View>
                      {plan.compareAtPrice ? (
                        <Text style={{ color: sub, fontSize: 13, marginTop: 4, textDecorationLine: 'line-through' }}>
                          Regular {plan.compareAtPrice}
                        </Text>
                      ) : null}
                      {plan.savingsHint ? (
                        <Text style={{ color: '#22C55E', fontSize: 12, fontWeight: '600', marginTop: 4 }}>{plan.savingsHint}</Text>
                      ) : null}
                      {(plan as any).foundersNote && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Ionicons name="star" size={10} color="#FF9500" />
                          <Text style={{ color: '#FF9500', fontSize: 10, fontWeight: '600' }}>{(plan as any).foundersNote}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.radioCircle, isSel && { backgroundColor: accent, borderColor: accent }]}>
                      {isSel && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                  </View>

                  <View style={{ marginTop: 10, gap: 4 }}>
                    {plan.features.slice(0, tier === 'premium' ? 8 : 4).map((f, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name={tier === 'premium' ? 'checkmark-circle' : 'checkmark'} size={13} color={tier === 'premium' ? '#FF9500' : sub} />
                        <Text style={{ color: tier === 'premium' ? (isLight ? '#374151' : '#d1d5db') : sub, fontSize: 12 }}>{f}</Text>
                      </View>
                    ))}
                  </View>
                  {isCurrent && <Text style={{ color: accent, fontSize: 11, fontWeight: '700', marginTop: 8 }}>Current plan</Text>}
                </TouchableOpacity>
              );
              })}
          </ScrollView>

          <View style={{ paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }}>
            <TouchableOpacity
              activeOpacity={selected ? 0.8 : 1}
              onPress={handleContinue}
              disabled={!selected}
              style={{ opacity: selected ? 1 : 0.4 }}
              accessibilityRole="button"
              accessibilityLabel={selected === 'premium' ? 'Continue with Premium' : 'Continue with selected plan'}
            >
              <LinearGradient
                colors={selected === 'premium' ? ['#FF9500', '#FF6B00'] : ['#007AFF', '#0055CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.planContinueBtn}
              >
                {selected === 'premium' && <Ionicons name="flash" size={16} color="#fff" />}
                <Text style={styles.planContinueBtnText}>
                  {selected === 'premium' ? 'Continue with Premium' : selected === 'basic' ? 'Choose Basic' : selected ? 'Select Plan' : 'Select a plan'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Apple-mandated auto-renewal disclosure within ~50px of the
                purchase CTA. Shown for paid iOS tiers only (Basic = no
                purchase, web/Android use Stripe + Play Store boilerplate). */}
            {isIosPaidSelected ? (
              <Text style={[styles.iapDisclosure, { color: sub }]}
                accessibilityLabel="Auto-renewal disclosure"
              >
                Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period. You can manage subscriptions in Settings.
              </Text>
            ) : (
              <Text style={{ color: sub, fontSize: 11, textAlign: 'center', marginTop: 8 }}>No contracts · Cancel anytime</Text>
            )}

            {/* Required Apple links: Restore Purchases + Terms + Privacy.
                Always visible on iOS so reviewers find them on the paywall;
                shown on Android/web too because pointing users at the
                published policies is universally good practice. */}
            <View style={styles.iapLinkRow}>
              {Platform.OS === 'ios' && onRestorePurchases ? (
                <TouchableOpacity
                  onPress={onRestorePurchases}
                  disabled={!!restoreInFlight}
                  accessibilityRole="button"
                  accessibilityLabel="Restore purchases"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.iapLinkText, { color: sub, opacity: restoreInFlight ? 0.5 : 1 }]}>
                    {restoreInFlight ? 'Restoring…' : 'Restore Purchases'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {Platform.OS === 'ios' && onRestorePurchases && (onOpenTerms || onOpenPrivacy) ? (
                <Text style={[styles.iapLinkSep, { color: sub }]}>·</Text>
              ) : null}
              {onOpenTerms ? (
                <TouchableOpacity
                  onPress={() => void openLegal('terms-of-service', onOpenTerms)}
                  accessibilityRole="link"
                  accessibilityLabel="Terms of Service"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.iapLinkText, { color: sub }]}>Terms</Text>
                </TouchableOpacity>
              ) : null}
              {onOpenTerms && onOpenPrivacy ? (
                <Text style={[styles.iapLinkSep, { color: sub }]}>·</Text>
              ) : null}
              {onOpenPrivacy ? (
                <TouchableOpacity
                  onPress={() => void openLegal('privacy-policy', onOpenPrivacy)}
                  accessibilityRole="link"
                  accessibilityLabel="Privacy Policy"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.iapLinkText, { color: sub }]}>Privacy</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <Modal visible={!!legalModal || !!legalLoading} transparent animationType="fade" onRequestClose={() => setLegalModal(null)}>
            <View style={styles.legalOverlay}>
              <View style={[styles.legalCard, { backgroundColor: cardBg }]}>
                <View style={styles.legalHeader}>
                  <Text style={[styles.legalTitle, { color: text }]}>
                    {legalModal?.title || (legalLoading === 'privacy-policy' ? 'Privacy Policy' : 'Terms of Service')}
                  </Text>
                  <TouchableOpacity onPress={() => setLegalModal(null)} accessibilityRole="button" accessibilityLabel="Close legal document">
                    <Ionicons name="close" size={20} color={sub} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator>
                  <Text style={[styles.legalBody, { color: sub }]}>
                    {legalModal?.body || 'Loading...'}
                  </Text>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function AddPlaceModal(props: { visible: boolean; onClose: () => void; cardBg: string; isLight: boolean; text: string; sub: string; newPlaceName: string; setNewPlaceName: (v: string) => void; newPlaceAddress: string; setNewPlaceAddress: (v: string) => void; onSave: () => void }) {
  const { visible, onClose, isLight, text, sub, newPlaceName, setNewPlaceName, newPlaceAddress, setNewPlaceAddress, onSave } = props;
  return (
    <SheetModal visible={visible} onClose={onClose}>
      <Text style={[styles.modalTitle, { color: text }]}>Add Place</Text>
      <TextInput style={[styles.modalInput, { color: text, backgroundColor: isLight ? '#f5f5f7' : '#2a2a3e' }]} placeholder="Name" placeholderTextColor={sub} value={newPlaceName} onChangeText={setNewPlaceName} />
      <TextInput style={[styles.modalInput, { color: text, backgroundColor: isLight ? '#f5f5f7' : '#2a2a3e' }]} placeholder="Address" placeholderTextColor={sub} value={newPlaceAddress} onChangeText={setNewPlaceAddress} />
      <TouchableOpacity style={styles.upgradeBtn} onPress={onSave}>
        <Text style={styles.upgradeBtnText}>Save Place</Text>
      </TouchableOpacity>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '85%' },
  modalHandle: { width: 36, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  planModalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 24, maxHeight: '92%' },
  planCloseButton: { position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  planCardNew: { borderRadius: 18, borderWidth: 1.5, padding: 16, marginBottom: 12, overflow: 'hidden', position: 'relative' as const },
  popularBadge: { position: 'absolute' as const, top: 0, right: 0, borderBottomLeftRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  popularBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(128,128,128,0.3)', alignItems: 'center' as const, justifyContent: 'center' as const },
  planContinueBtn: { borderRadius: 16, paddingVertical: 16, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6 },
  planContinueBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  /** Apple-mandated auto-renewal disclosure copy. Sits within 50px of the CTA. */
  iapDisclosure: { fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 10, paddingHorizontal: 4 },
  iapLinkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  iapLinkText: { fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  iapLinkSep: { fontSize: 12 },
  legalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  legalCard: { width: '100%', maxHeight: '72%', borderRadius: 20, padding: 16 },
  legalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  legalTitle: { flex: 1, fontSize: 18, fontWeight: '900' },
  legalBody: { fontSize: 13, lineHeight: 20 },
  upgradeBtn: { backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  upgradeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalInput: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 12 },
  levelHero: { borderRadius: 14, padding: 14, marginBottom: 10, alignItems: 'center' },
  levelRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: '#4F7CFF', alignItems: 'center', justifyContent: 'center' },
  levelRingText: { color: '#fff', fontSize: 34, fontWeight: '900' },
  levelTotalXp: { color: '#fff', marginTop: 8, fontSize: 16, fontWeight: '800' },
  levelRange: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  levelTrack: { width: '100%', height: 8, borderRadius: 6, backgroundColor: 'rgba(148,163,184,0.28)', marginTop: 10, overflow: 'hidden' },
  levelFill: { height: '100%', backgroundColor: '#4F7CFF' },
  levelNext: { color: '#CBD5E1', fontSize: 11, marginTop: 4 },
  modalSectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
  infoRow: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(148,163,184,0.22)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoRowLabel: { fontSize: 13, fontWeight: '600' },
  infoRowValue: { fontSize: 12, fontWeight: '800' },
  recapBanner: { borderRadius: 12, padding: 12, marginBottom: 10 },
  recapBannerLabel: { color: 'rgba(255,255,255,0.86)', fontSize: 10, fontWeight: '900' },
  recapBannerText: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 4 },
  recapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recapTile: { width: '48%' as any, borderRadius: 10, padding: 10, backgroundColor: '#0F172A' },
  recapVal: { color: '#4F7CFF', fontSize: 20, fontWeight: '900' },
  recapLbl: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  inlineUpsell: { marginTop: 10, backgroundColor: 'rgba(37,99,235,0.12)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(59,130,246,0.4)' },
  inlineUpsellTitle: { color: '#BFDBFE', fontSize: 13, fontWeight: '800' },
  inlineUpsellSub: { color: '#CBD5E1', fontSize: 12, marginTop: 4 },
  inlineUpsellBtn: { marginTop: 8, backgroundColor: '#2563EB', borderRadius: 8, alignItems: 'center', paddingVertical: 9 },
  inlineUpsellBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeTile: { width: '31%' as any, borderRadius: 10, padding: 10, backgroundColor: 'rgba(15,23,42,0.7)', alignItems: 'center' },
  badgeName: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  historyHeader: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  historyStatsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  historyStat: { flexGrow: 1, flexBasis: '22%', minWidth: 72, borderRadius: 12, alignItems: 'center', paddingVertical: 10 },
  historyStatVal: { fontSize: 17, fontWeight: '800' },
  historyStatLbl: { fontSize: 10, marginTop: 2, fontWeight: '600' },
  monthChipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingBottom: 4 },
  monthChip: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(148,163,184,0.22)' },
  monthChipActive: { backgroundColor: '#fff' },
  monthChipText: { color: '#DBEAFE', fontSize: 12, fontWeight: '700' },
  monthChipTextActive: { color: '#1E40AF' },
  historyItem: { flexDirection: 'row', borderRadius: 12, backgroundColor: '#1E293B', borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)', padding: 12, marginBottom: 8 },
  historyItemDate: { color: '#94A3B8', fontSize: 12 },
  historyItemRoute: { color: '#E2E8F0', fontSize: 16, fontWeight: '700', marginTop: 4 },
  historyItemMeta: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  historyScoreChip: { borderRadius: 12, backgroundColor: 'rgba(52,211,153,0.2)', paddingHorizontal: 10, paddingVertical: 4 },
  historyScoreChipText: { color: '#6EE7B7', fontSize: 14, fontWeight: '900' },
  historyGemText: { color: '#6EE7B7', fontSize: 18, fontWeight: '900' },
  gemHeader: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gemTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  gemFilterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 10, marginTop: 8 },
  gemFilterChip: { flex: 1, borderRadius: 10, backgroundColor: '#1E293B', alignItems: 'center', paddingVertical: 9 },
  gemFilterChipActive: { backgroundColor: '#6EE7B7' },
  gemFilterText: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
  gemFilterTextActive: { color: '#0F172A' },
  gemItem: { borderRadius: 12, backgroundColor: '#1E293B', padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  gemItemTitle: { color: '#E2E8F0', fontSize: 16, fontWeight: '800' },
  gemItemDate: { color: '#94A3B8', fontSize: 12, marginTop: 3 },
  gemItemAmount: { fontSize: 22, fontWeight: '900' },
  scoreDetailCard: { borderRadius: 14, padding: 14 },
  scoreRingWrap: { alignItems: 'center', marginBottom: 6 },
  scoreRing: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  scoreRingVal: { color: '#fff', fontSize: 34, fontWeight: '900' },
  scoreRingLbl: { color: '#94A3B8', fontSize: 11, marginTop: -2 },
  scoreMetricTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  scoreMetricTrack: { height: 7, borderRadius: 5, backgroundColor: '#334155', overflow: 'hidden' },
  scoreMetricFill: { height: '100%' },
  incidentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  incidentHeaderText: { color: '#E2E8F0', fontSize: 13, fontWeight: '700' },
  incidentCameraBox: { borderRadius: 12, backgroundColor: '#0F172A', borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)', alignItems: 'center', justifyContent: 'center', height: 140, marginBottom: 10 },
  incidentCameraSub: { color: '#64748B', marginTop: 6, fontSize: 12 },
  incidentActions: { flexDirection: 'row', gap: 8 },
  incidentPrimaryBtn: { flex: 1, borderRadius: 10, backgroundColor: '#4F7CFF', paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  incidentSecondaryBtn: { flex: 1, borderRadius: 10, backgroundColor: '#334155', paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  incidentPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  incidentCancel: { color: '#94A3B8', textAlign: 'center', marginTop: 12 },
});
