import React, { useMemo, useState } from 'react';
import { Dimensions, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import SheetModal from '../common/Modal';
import { useTheme } from '../../contexts/ThemeContext';
import { PLANS } from '../../constants/plans';
import type { PlanTier, User } from '../../types';
import { computeSnapRoadScoreBreakdown } from '../../utils/profileScore';
import type {
  ProfileBadgeItem,
  ProfileGemTxItem,
  ProfileLeaderboardEntry,
  ProfileTripHistoryItem,
  ProfileWeeklyRecap,
} from './types';

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

export function WeeklyRecapModal({
  visible,
  onClose,
  cardBg,
  text,
  sub,
  recap,
  isPremium,
  onUpgrade,
}: {
  visible: boolean;
  onClose: () => void;
  cardBg: string;
  text: string;
  sub: string;
  recap: ProfileWeeklyRecap;
  isPremium: boolean;
  onUpgrade: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: text, marginBottom: 2 }]}>Weekly Recap</Text>
          <Text style={{ color: sub, fontSize: 12, textAlign: 'center', marginBottom: 12 }}>Your driving summary powered by Orion</Text>
          <LinearGradient colors={['#1D4ED8', '#3730A3']} style={styles.recapBanner}>
            <Text style={styles.recapBannerLabel}>ORION WEEKLY SUMMARY</Text>
            <Text style={styles.recapBannerText}>{`You've driven ${recap.totalMiles.toFixed(1)} miles this week with an average safety score of ${recap.avgSafetyScore.toFixed(1)}.`}</Text>
          </LinearGradient>
          <View style={styles.recapGrid}>
            <View style={styles.recapTile}><Text style={styles.recapVal}>{recap.totalTrips}</Text><Text style={styles.recapLbl}>Trips</Text></View>
            <View style={styles.recapTile}><Text style={styles.recapVal}>{recap.totalMiles.toFixed(1)}</Text><Text style={styles.recapLbl}>Miles</Text></View>
            <View style={styles.recapTile}><Text style={styles.recapVal}>{recap.gemsEarnedWeek}</Text><Text style={styles.recapLbl}>Gems earned</Text></View>
            <View style={styles.recapTile}><Text style={styles.recapVal}>{recap.avgSafetyScore.toFixed(1)}</Text><Text style={styles.recapLbl}>Safety avg</Text></View>
          </View>
          {isPremium ? (
            !!recap.aiTip && <Text style={{ color: sub, fontSize: 12, marginTop: 8 }}>{recap.aiTip}</Text>
          ) : (
            <View style={styles.inlineUpsell}>
              <Text style={styles.inlineUpsellTitle}>Premium recap</Text>
              <Text style={styles.inlineUpsellSub}>Unlock deeper AI analysis and personalized weekly coaching.</Text>
              <TouchableOpacity style={styles.inlineUpsellBtn} onPress={onUpgrade}>
                <Text style={styles.inlineUpsellBtnText}>Choose Plan</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function LeaderboardModal({
  visible,
  onClose,
  cardBg,
  text,
  sub,
  myRank,
  entries,
}: {
  visible: boolean;
  onClose: () => void;
  cardBg: string;
  text: string;
  sub: string;
  myRank: number;
  entries: ProfileLeaderboardEntry[];
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: text, marginBottom: 2 }]}>Rank & Leaderboard</Text>
          <Text style={{ color: sub, fontSize: 12, textAlign: 'center', marginBottom: 10 }}>{`Current rank #${myRank || '--'}`}</Text>
          {entries.slice(0, 8).map((e) => (
            <View key={`${e.rank}-${e.name}`} style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Text style={{ color: '#60A5FA', fontWeight: '900', width: 26 }}>{`#${e.rank}`}</Text>
                <Text style={[styles.infoRowLabel, { color: text }]}>{e.name}</Text>
              </View>
              <Text style={{ color: sub, fontSize: 12, fontWeight: '700' }}>{`${e.safetyScore} · L${e.level}`}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function DrivingScoreModal({
  visible,
  onClose,
  user,
  isPremium,
  onUpgrade,
}: {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  isPremium: boolean;
  onUpgrade: () => void;
}) {
  const { colors, radius, spacing } = useTheme();
  const b = useMemo(() => computeSnapRoadScoreBreakdown(user), [user]);

  const coachingMetrics = [
    { label: 'Speed discipline', value: Math.min(100, Math.round((user?.safetyScore ?? 0) * 0.92)), color: colors.success },
    { label: 'Smooth braking', value: Math.min(100, Math.round((user?.safetyScore ?? 0) * 0.85)), color: colors.warning },
    { label: 'Acceleration', value: Math.min(100, Math.round((user?.safetyScore ?? 0) * 0.88)), color: colors.warning },
    { label: 'Focus / phone use', value: Math.min(100, Math.round((user?.safetyScore ?? 0) * 0.78)), color: '#F59E0B' },
  ];

  const rows = [
    {
      key: 'safety',
      title: 'Safety score',
      sub: `${b.safety.toFixed(0)} avg`,
      earned: b.safetyPts,
      cap: 300,
      accent: '#3B82F6',
      hint: `${b.safety.toFixed(0)}/100 avg safety. Drive smoother to improve.`,
    },
    {
      key: 'streak',
      title: 'Streak bonus',
      sub: `${b.streak} day streak`,
      earned: b.streakPts,
      cap: 200,
      accent: '#F97316',
      hint: `${b.streak} day streak. Keep it going.`,
    },
    {
      key: 'miles',
      title: 'Miles driven',
      sub: `${Math.round(b.miles)} miles`,
      earned: b.milesPts,
      cap: 200,
      accent: '#38BDF8',
      hint: `${Math.round(b.miles)} total miles logged.`,
    },
    {
      key: 'gems',
      title: 'Gems earned',
      sub: `${b.gems} gems`,
      earned: b.gemsPts,
      cap: 200,
      accent: '#A855F7',
      hint: `${b.gems} total gems. Redeem offers to earn more.`,
    },
  ];

  return (
    <SheetModal visible={visible} onClose={onClose}>
      <ScrollView
        style={{ maxHeight: Dimensions.get('window').height * 0.72 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 4 }]}>Your SnapRoad Score</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 8 }}>out of 1,000</Text>
        <Text style={{ color: colors.primary, fontSize: 44, fontWeight: '900', textAlign: 'center' }}>{b.total}</Text>
        <View style={{ alignItems: 'center', marginBottom: 10 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: colors.surfaceSecondary,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: radius.pill,
            }}
          >
            <Ionicons name="ribbon-outline" size={14} color={colors.textSecondary} />
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '800' }}>{b.tier}</Text>
          </View>
        </View>
        <View style={{ height: 6, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden', marginHorizontal: spacing.md, marginBottom: 8 }}>
          <View style={{ width: `${(b.total / 1000) * 100}%`, height: '100%', backgroundColor: colors.primary }} />
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: spacing.md }}>
          {b.toPerfect} points to perfect score
        </Text>

        <Text style={[styles.modalSectionTitle, { color: colors.text, marginHorizontal: spacing.sm }]}>Score breakdown</Text>
        {rows.map((r) => {
          const pct = r.cap > 0 ? Math.min(1, r.earned / r.cap) : 0;
          return (
            <View
              key={r.key}
              style={{
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.sm,
                marginHorizontal: spacing.sm,
                backgroundColor: colors.surfaceSecondary,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ width: 36, alignItems: 'center', paddingTop: 2 }}>
                  <Ionicons
                    name={
                      r.key === 'safety'
                        ? 'shield-checkmark-outline'
                        : r.key === 'streak'
                          ? 'flame-outline'
                          : r.key === 'miles'
                            ? 'navigate-outline'
                            : 'diamond-outline'
                    }
                    size={22}
                    color={r.accent}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{r.title}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800' }}>
                      <Text style={{ color: r.accent }}>{r.earned}</Text>
                      <Text style={{ color: colors.textSecondary }}>{` / ${r.cap}`}</Text>
                    </Text>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{r.sub}</Text>
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginTop: 8 }}>
                    <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: r.accent }} />
                  </View>
                  <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 8, lineHeight: 15 }}>{r.hint}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {isPremium ? (
          <>
            <Text style={[styles.modalSectionTitle, { color: colors.text, marginHorizontal: spacing.sm, marginTop: 4 }]}>
              Orion coaching (Premium)
            </Text>
            <View
              style={{
                borderRadius: radius.md,
                padding: spacing.md,
                marginHorizontal: spacing.sm,
                marginBottom: spacing.sm,
                backgroundColor: colors.surfaceSecondary,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
              }}
            >
              {coachingMetrics.map((m, i) => (
                <View key={m.label} style={{ marginTop: i === 0 ? 0 : 12 }}>
                  <View style={styles.scoreMetricTop}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{m.label}</Text>
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{m.value}</Text>
                  </View>
                  <View style={[styles.scoreMetricTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.scoreMetricFill, { width: `${m.value}%`, backgroundColor: m.color }]} />
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={[styles.inlineUpsell, { marginHorizontal: spacing.sm, borderColor: colors.primary }]}>
            <Text style={[styles.inlineUpsellTitle, { color: colors.primary }]}>Premium coaching</Text>
            <Text style={[styles.inlineUpsellSub, { color: colors.textSecondary }]}>
              Unlock Orion’s per-trip coaching metrics and personalized tips.
            </Text>
            <TouchableOpacity style={[styles.inlineUpsellBtn, { backgroundColor: colors.primary }]} onPress={onUpgrade}>
              <Text style={styles.inlineUpsellBtnText}>Choose Plan</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SheetModal>
  );
}

export function BadgesModal({ visible, onClose, cardBg, text, sub, badges }: { visible: boolean; onClose: () => void; cardBg: string; text: string; sub: string; badges: ProfileBadgeItem[] }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: text, marginBottom: 2 }]}>Achievements</Text>
          <Text style={{ color: sub, fontSize: 12, textAlign: 'center', marginBottom: 10 }}>{`${badges.filter((b) => b.earned).length}/${badges.length} badges earned`}</Text>
          <View style={styles.badgesGrid}>
            {badges.slice(0, 24).map((b) => (
              <View key={String(b.id)} style={[styles.badgeTile, { opacity: b.earned ? 1 : 0.45 }]}>
                <Text style={{ fontSize: 20 }}>{b.earned ? '🏆' : '🔒'}</Text>
                <Text style={[styles.badgeName, { color: text }]} numberOfLines={1}>{b.name}</Text>
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function TripHistoryModal({
  visible,
  onClose,
  trips,
}: {
  visible: boolean;
  onClose: () => void;
  trips: ProfileTripHistoryItem[];
}) {
  const { colors, spacing, typography } = useTheme();
  const winH = Dimensions.get('window').height;
  const totalTrips = trips.length;
  const totalMiles = trips.reduce((sum, t) => sum + Number(t.distance_miles ?? 0), 0);
  const avgScore = totalTrips > 0 ? trips.reduce((sum, t) => sum + Number(t.safety_score ?? 0), 0) / totalTrips : 0;
  const totalGems = trips.reduce((sum, t) => sum + Number(t.gems_earned ?? 0), 0);
  const listMax = Math.min(420, winH * 0.48);
  return (
    <SheetModal visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Text style={[typography.h2, { color: colors.text, flex: 1 }]}>Trip history</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Done">
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.primary }}>Done</Text>
        </TouchableOpacity>
      </View>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Recent trips</Text>
      <View style={styles.historyStatsRow}>
        {(
          [
            { v: totalTrips, l: 'Trips' },
            { v: totalMiles.toFixed(1), l: 'Miles' },
            { v: avgScore.toFixed(0), l: 'Avg' },
            { v: totalGems, l: 'Gems' },
          ] as const
        ).map((s) => (
          <View key={s.l} style={[styles.historyStat, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.historyStatVal, { color: colors.text }]}>{s.v}</Text>
            <Text style={[styles.historyStatLbl, { color: colors.textSecondary }]}>{s.l}</Text>
          </View>
        ))}
      </View>
      <ScrollView
        style={{ maxHeight: listMax }}
        contentContainerStyle={{ paddingBottom: spacing.sm }}
        showsVerticalScrollIndicator={false}
      >
        {trips.length === 0 ? (
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg }]}>
            No trips yet.
          </Text>
        ) : (
          trips.slice(0, 40).map((trip) => (
            <View
              key={trip.id}
              style={[styles.historyItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <Text style={[styles.historyItemDate, { color: colors.textSecondary }]} numberOfLines={1}>{`${trip.date} · ${trip.time}`}</Text>
                <Text style={[styles.historyItemRoute, { color: colors.text }]} numberOfLines={2}>
                  {`${trip.origin} › ${trip.destination}`}
                </Text>
                <Text style={[styles.historyItemMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {`${Number(trip.distance_miles ?? 0).toFixed(1)} mi · ${trip.duration_minutes ?? 0} min`}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <View style={[styles.historyScoreChip, { backgroundColor: `${colors.success}22` }]}>
                  <Text style={[styles.historyScoreChipText, { color: colors.success }]}>{trip.safety_score ?? 0}</Text>
                </View>
                <Text style={[styles.historyGemText, { color: colors.success }]}>{`+${trip.gems_earned ?? 0}`}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SheetModal>
  );
}

export function GemHistoryModal({
  visible,
  onClose,
  tx,
}: {
  visible: boolean;
  onClose: () => void;
  tx: ProfileGemTxItem[];
}) {
  const { colors, spacing, typography } = useTheme();
  const winH = Dimensions.get('window').height;
  const [filter, setFilter] = useState<'all' | 'earned' | 'spent'>('all');
  const filtered = useMemo(() => (filter === 'all' ? tx : tx.filter((t) => t.type === filter)), [filter, tx]);
  const listMax = Math.min(440, winH * 0.5);

  return (
    <SheetModal visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Text style={[typography.h2, { color: colors.text, flex: 1 }]}>Gem history</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Done">
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.primary }}>Done</Text>
        </TouchableOpacity>
      </View>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Transactions</Text>
      <View style={[styles.gemFilterRow, { marginBottom: spacing.sm }]}>
        {([
          { id: 'all', label: 'All' },
          { id: 'earned', label: 'Earned' },
          { id: 'spent', label: 'Spent' },
        ] as const).map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.gemFilterChip,
              { backgroundColor: colors.surfaceSecondary },
              filter === f.id && {
                backgroundColor: colors.card,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setFilter(f.id)}
          >
            <Text
              style={[
                styles.gemFilterText,
                { color: colors.textSecondary },
                filter === f.id && { color: colors.text, fontWeight: '800' },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={{ maxHeight: listMax }} contentContainerStyle={{ paddingBottom: spacing.sm }} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg }]}>
            No transactions yet.
          </Text>
        ) : (
          filtered.map((row) => (
            <View
              key={row.id}
              style={[styles.gemItem, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }]}
            >
              <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <Text style={[styles.gemItemTitle, { color: colors.text }]} numberOfLines={2}>
                  {row.source}
                </Text>
                <Text style={[styles.gemItemDate, { color: colors.textSecondary }]} numberOfLines={1}>
                  {new Date(row.date).toLocaleString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.gemItemAmount,
                  { color: row.type === 'spent' ? colors.danger : colors.success, flexShrink: 0 },
                ]}
              >
                {row.type === 'spent' ? '-' : '+'}
                {row.amount}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SheetModal>
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

export function PlanModal(props: { visible: boolean; onClose: () => void; cardBg: string; text: string; sub: string; currentPlan: PlanTier; onSelectPlan: (tier: PlanTier) => void; isLight?: boolean }) {
  const { visible, onClose, cardBg, text, sub, currentPlan, onSelectPlan, isLight } = props;
  const [selected, setSelected] = useState<PlanTier | null>(null);

  const handleContinue = () => {
    if (selected) { onSelectPlan(selected); }
  };

  const PLAN_ICONS: Record<PlanTier, string> = { basic: 'shield-outline', premium: 'flash-outline', family: 'people-outline' };
  const PLAN_COLORS: Record<PlanTier, string> = { basic: '#007AFF', premium: '#FF9500', family: '#7C3AED' };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.planModalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHandle} />
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="sparkles" size={18} color="#FF9500" />
            <Text style={{ color: '#FF9500', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 4, textTransform: 'uppercase' }}>Choose your plan</Text>
            <Text style={[styles.modalTitle, { color: text, marginBottom: 0, marginTop: 4 }]}>Start your journey</Text>
            <Text style={{ color: sub, fontSize: 13, marginTop: 4 }}>Drive safer. Earn rewards. Privacy guaranteed.</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {(Object.entries(PLANS) as [PlanTier, typeof PLANS.basic][]).map(([tier, plan]) => {
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
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                        <Text style={{ color: text, fontSize: 26, fontWeight: '900' }}>{plan.price.split('/')[0]}</Text>
                        {plan.price.includes('/') && <Text style={{ color: sub, fontSize: 13 }}>/{plan.price.split('/')[1]}</Text>}
                      </View>
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
            <Text style={{ color: sub, fontSize: 11, textAlign: 'center', marginTop: 8 }}>No contracts · Cancel anytime</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function AddPlaceModal(props: { visible: boolean; onClose: () => void; cardBg: string; isLight: boolean; text: string; sub: string; newPlaceName: string; setNewPlaceName: (v: string) => void; newPlaceAddress: string; setNewPlaceAddress: (v: string) => void; onSave: () => void }) {
  const { visible, onClose, cardBg, isLight, text, sub, newPlaceName, setNewPlaceName, newPlaceAddress, setNewPlaceAddress, onSave } = props;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: text }]}>Add Place</Text>
          <TextInput style={[styles.modalInput, { color: text, backgroundColor: isLight ? '#f5f5f7' : '#2a2a3e' }]} placeholder="Name" placeholderTextColor={sub} value={newPlaceName} onChangeText={setNewPlaceName} />
          <TextInput style={[styles.modalInput, { color: text, backgroundColor: isLight ? '#f5f5f7' : '#2a2a3e' }]} placeholder="Address" placeholderTextColor={sub} value={newPlaceAddress} onChangeText={setNewPlaceAddress} />
          <TouchableOpacity style={styles.upgradeBtn} onPress={onSave}>
            <Text style={styles.upgradeBtnText}>Save Place</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '85%' },
  modalHandle: { width: 36, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  planModalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 24, maxHeight: '92%' },
  planCardNew: { borderRadius: 18, borderWidth: 1.5, padding: 16, marginBottom: 12, overflow: 'hidden', position: 'relative' as const },
  popularBadge: { position: 'absolute' as const, top: 0, right: 0, borderBottomLeftRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  popularBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(128,128,128,0.3)', alignItems: 'center' as const, justifyContent: 'center' as const },
  planContinueBtn: { borderRadius: 16, paddingVertical: 16, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6 },
  planContinueBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
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
