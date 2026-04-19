import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import SheetModal from '../common/Modal';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import type {
  ProfileBadgeItem,
  ProfileGemTxItem,
  ProfileTripHistoryItem,
  ProfileWeeklyRecap,
} from './types';

export type TimeRangePreset = 'day' | 'week' | 'month' | 'custom';

type FuelSummary = {
  monthlyEstimate: number | null;
  avgMpg: number | null;
  costPerMile: number | null;
  lastOdometerMi: number | null;
  milesSinceLastFill: number | null;
};

type DrivingMetric = {
  id: string;
  name: string;
  score: number;
  trend: string;
  description: string;
};

type OrionTip = { id: string; metric: string; tip: string; priority: string };

function startOfDayMs(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function getPresetRange(
  preset: TimeRangePreset,
  customStart: string,
  customEnd: string,
): { start: number; end: number } {
  const now = Date.now();
  if (preset === 'day') {
    return { start: startOfDayMs(new Date()), end: now };
  }
  if (preset === 'week') {
    return { start: now - 7 * 24 * 60 * 60 * 1000, end: now };
  }
  if (preset === 'month') {
    return { start: now - 30 * 24 * 60 * 60 * 1000, end: now };
  }
  const s = Date.parse(`${customStart}T00:00:00`);
  const e = Date.parse(`${customEnd}T23:59:59.999`);
  if (!Number.isFinite(s) || !Number.isFinite(e) || s > e) {
    return { start: now - 7 * 24 * 60 * 60 * 1000, end: now };
  }
  return { start: s, end: e };
}

function tripTimeMs(t: ProfileTripHistoryItem): number {
  if (t.tripEndedAtIso) {
    const ms = Date.parse(t.tripEndedAtIso);
    if (Number.isFinite(ms)) return ms;
  }
  return 0;
}

function txTimeMs(dateStr: string): number {
  const ms = Date.parse(dateStr);
  return Number.isFinite(ms) ? ms : 0;
}

function categoryIcon(cat: string): keyof typeof Ionicons.glyphMap {
  const c = (cat || '').toLowerCase();
  if (c === 'distance') return 'navigate-outline';
  if (c === 'trips') return 'car-outline';
  if (c === 'gems') return 'diamond-outline';
  if (c === 'safety') return 'shield-checkmark-outline';
  if (c === 'streak') return 'flame-outline';
  if (c === 'level') return 'trending-up-outline';
  return 'ribbon-outline';
}

type Props = {
  visible: boolean;
  onClose: () => void;
  weeklyRecap: ProfileWeeklyRecap;
  tripHistoryRows: ProfileTripHistoryItem[];
  gemTxRows: ProfileGemTxItem[];
  badgeRows: ProfileBadgeItem[];
  fuelSummary: FuelSummary;
  isPremium: boolean;
  onUpgrade: () => void;
  onOpenFuelTracker: () => void;
};

export default function ProfileInsightsDashboard({
  visible,
  onClose,
  weeklyRecap,
  tripHistoryRows,
  gemTxRows,
  badgeRows,
  fuelSummary,
  isPremium,
  onUpgrade,
  onOpenFuelTracker,
}: Props) {
  const { colors, spacing, typography, radius } = useTheme();
  const winH = Dimensions.get('window').height;
  const [preset, setPreset] = useState<TimeRangePreset>('week');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [tripsOpen, setTripsOpen] = useState(true);
  const [gemsOpen, setGemsOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(true);
  const [tripDetail, setTripDetail] = useState<ProfileTripHistoryItem | null>(null);

  const [drivingLoading, setDrivingLoading] = useState(false);
  const [drivingMetrics, setDrivingMetrics] = useState<DrivingMetric[]>([]);
  const [orionTips, setOrionTips] = useState<OrionTip[]>([]);
  const [drivingError, setDrivingError] = useState<string | null>(null);

  const range = useMemo(() => getPresetRange(preset, customStart, customEnd), [preset, customStart, customEnd]);

  const filteredTrips = useMemo(() => {
    return tripHistoryRows.filter((t) => {
      const ms = tripTimeMs(t);
      if (ms <= 0) return false;
      return ms >= range.start && ms <= range.end;
    });
  }, [tripHistoryRows, range.start, range.end]);

  const filteredGemTx = useMemo(() => {
    return gemTxRows.filter((g) => {
      const ms = txTimeMs(g.date);
      return ms >= range.start && ms <= range.end;
    });
  }, [gemTxRows, range.start, range.end]);

  const kpis = useMemo(() => {
    const n = filteredTrips.length;
    const miles = filteredTrips.reduce((s, t) => s + Number(t.distance_miles ?? 0), 0);
    const gemsTrip = filteredTrips.reduce((s, t) => s + Number(t.gems_earned ?? 0), 0);
    const avg =
      n > 0 ? filteredTrips.reduce((s, t) => s + Number(t.safety_score ?? 0), 0) / n : 0;
    return {
      trips: n,
      miles,
      avgSafety: avg,
      gemsFromTrips: gemsTrip,
    };
  }, [filteredTrips]);

  /** Week view: server weekly total can include trips not yet in the recent-history list. */
  const kpiMilesDisplay = useMemo(() => {
    let m = kpis.miles;
    if (preset === 'week' && isPremium && weeklyRecap.totalMiles > 0) {
      m = Math.max(m, weeklyRecap.totalMiles);
    }
    return m;
  }, [kpis.miles, preset, isPremium, weeklyRecap.totalMiles]);

  const badgesByCategory = useMemo(() => {
    const m = new Map<string, ProfileBadgeItem[]>();
    for (const b of badgeRows) {
      const cat = b.category || 'Other';
      if (!m.has(cat)) m.set(cat, []);
      m.get(cat)!.push(b);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [badgeRows]);

  const earnedCount = badgeRows.filter((b) => b.earned).length;

  const loadDrivingScore = useCallback(async () => {
    if (!isPremium) {
      setDrivingMetrics([]);
      setOrionTips([]);
      setDrivingError(null);
      return;
    }
    setDrivingLoading(true);
    setDrivingError(null);
    try {
      const res = await api.get<{
        data?: {
          metrics?: DrivingMetric[];
          orion_tips?: OrionTip[];
          no_data?: boolean;
        };
      }>('/api/driving-score');
      if (!res.success) {
        setDrivingError(res.error || 'Could not load coaching');
        setDrivingMetrics([]);
        setOrionTips([]);
        return;
      }
      const body = res.data as { data?: { metrics?: DrivingMetric[]; orion_tips?: OrionTip[] } };
      const d = body?.data ?? (res.data as any)?.data;
      setDrivingMetrics(Array.isArray(d?.metrics) ? d.metrics : []);
      setOrionTips(Array.isArray(d?.orion_tips) ? d.orion_tips : []);
    } catch {
      setDrivingError('Could not load coaching');
      setDrivingMetrics([]);
      setOrionTips([]);
    } finally {
      setDrivingLoading(false);
    }
  }, [isPremium]);

  useEffect(() => {
    if (!visible) return;
    void loadDrivingScore();
  }, [visible, loadDrivingScore]);

  useEffect(() => {
    if (!visible) setTripDetail(null);
  }, [visible]);

  const chip = (id: TimeRangePreset, label: string) => (
    <TouchableOpacity
      key={id}
      onPress={() => setPreset(id)}
      style={[
        styles.chip,
        {
          backgroundColor: preset === id ? colors.primary : colors.surfaceSecondary,
          borderColor: preset === id ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '800',
          color: preset === id ? '#fff' : colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (visible && !isPremium) {
    return (
      <SheetModal visible={visible} onClose={onClose} scrollable={false}>
        <View style={{ paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md }}>
            <Text style={[typography.h2, { color: colors.text, flex: 1 }]}>Insights & Recap</Text>
          </View>
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Ionicons name="lock-closed" size={40} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 16, textAlign: 'center' }}>
              Premium only
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                marginTop: 10,
                textAlign: 'center',
                lineHeight: 20,
                paddingHorizontal: 8,
              }}
            >
              Weekly recap, range filters, and Orion coaching are part of SnapRoad Premium. You still keep
              your trips, miles, and gems on the free plan.
            </Text>
            <TouchableOpacity
              onPress={onUpgrade}
              style={{
                marginTop: 22,
                backgroundColor: colors.primary,
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 28,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Upgrade to Premium</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SheetModal>
    );
  }

  const kpiTile = (icon: keyof typeof Ionicons.glyphMap, val: string, lbl: string) => (
    <View
      key={lbl}
      style={[
        styles.kpiTile,
        { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
      ]}
    >
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.kpiVal, { color: colors.text }]}>{val}</Text>
      <Text style={[styles.kpiLbl, { color: colors.textSecondary }]}>{lbl}</Text>
    </View>
  );

  return (
    <SheetModal visible={visible} onClose={onClose} scrollable={false}>
      {/* Single RN Modal only (SheetModal). Trip detail is an in-sheet overlay so touches are not lost to nested Modals. */}
      <View style={[styles.insightsSheetBody, { height: winH * 0.88 }]}>
      <ScrollView
        style={styles.insightsScroll}
        contentContainerStyle={tripDetail ? styles.insightsScrollDimmed : undefined}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!tripDetail}
      >
        <View style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'flex-start' }}>
          <Text style={[typography.h2, { color: colors.text, flex: 1 }]}>Insights & Recap</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.primary }}>Done</Text>
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={['#1D4ED8', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>TRACKING</Text>
          <Text style={styles.heroTitle}>Trips · Safety · Gems · Fuel</Text>
          <Text style={styles.heroSub}>
            {preset === 'day'
              ? 'Today'
              : preset === 'week'
                ? 'Last 7 days'
                : preset === 'month'
                  ? 'Last 30 days'
                  : 'Custom range'}
          </Text>
        </LinearGradient>

        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          Time range
        </Text>
        <View style={styles.chipRow}>
          {chip('day', 'Day')}
          {chip('week', 'Week')}
          {chip('month', 'Month')}
          {chip('custom', 'Custom')}
        </View>

        {preset === 'custom' ? (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Start (YYYY-MM-DD)</Text>
              <TextInput
                value={customStart}
                onChangeText={setCustomStart}
                placeholder="2026-01-01"
                placeholderTextColor={colors.textTertiary}
                style={{
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: 10,
                  color: colors.text,
                  backgroundColor: colors.card,
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>End</Text>
              <TextInput
                value={customEnd}
                onChangeText={setCustomEnd}
                placeholder="2026-01-15"
                placeholderTextColor={colors.textTertiary}
                style={{
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: 10,
                  color: colors.text,
                  backgroundColor: colors.card,
                }}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.kpiGrid}>
          {kpiTile('car-outline', String(kpis.trips), 'Trips')}
          {kpiTile('location-outline', kpiMilesDisplay.toFixed(1), 'Miles')}
          {kpiTile('shield-checkmark-outline', kpis.trips > 0 ? kpis.avgSafety.toFixed(0) : '—', 'Avg safety')}
          {kpiTile('diamond-outline', String(kpis.gemsFromTrips), 'Gems (trips)')}
        </View>
        <Text
          style={[typography.caption, { color: colors.textTertiary, marginTop: 6, marginBottom: spacing.sm, lineHeight: 18 }]}
        >
          Miles and trips reflect qualifying drives in this range. Totals align with your profile as trips finish syncing.
        </Text>

        {weeklyRecap.highlights && weeklyRecap.highlights.length > 0 ? (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 6 }}>This week (server)</Text>
            {weeklyRecap.highlights.map((h) => (
              <Text key={h} style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
                • {h}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 8 }}>Orion insights</Text>
          {!isPremium ? (
            <View style={[styles.lockBox, { borderColor: `${colors.primary}44` }]}>
              <Ionicons name="lock-closed" size={24} color={colors.primary} style={{ marginBottom: 8 }} />
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>
                Premium unlocks coaching from your real trip patterns (speeding and braking signals) plus personalized tips.
              </Text>
              <TouchableOpacity
                onPress={onUpgrade}
                style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.ctaBtnText}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          ) : drivingLoading ? (
            <Text style={{ color: colors.textSecondary }}>Loading coaching…</Text>
          ) : drivingError ? (
            <Text style={{ color: colors.textSecondary }}>{drivingError}</Text>
          ) : (
            <>
              {weeklyRecap.orionCommentary ? (
                <LinearGradient
                  colors={['#1E3A8A', '#312E81']}
                  style={{ borderRadius: radius.md, padding: 12, marginBottom: spacing.sm }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '800', marginBottom: 6 }}>
                    ORION RECAP
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 14, lineHeight: 20 }}>{weeklyRecap.orionCommentary}</Text>
                </LinearGradient>
              ) : weeklyRecap.behavior &&
                (weeklyRecap.behavior.hard_braking_events_total > 0 ||
                  weeklyRecap.behavior.speeding_events_total > 0) ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: spacing.sm }}>
                  This week: {weeklyRecap.behavior.hard_braking_events_total} hard braking segments ·{' '}
                  {weeklyRecap.behavior.speeding_events_total} speeding events (from synced trips).
                </Text>
              ) : !weeklyRecap.orionCommentary && isPremium ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: spacing.sm }}>
                  Deeper Orion commentary appears when your weekly recap sync includes behavior signals and the AI service
                  is configured on the server.
                </Text>
              ) : null}
              {orionTips.map((tip) => (
                <View
                  key={tip.id}
                  style={[
                    styles.tipRow,
                    { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="sparkles" size={16} color="#F59E0B" />
                  <Text style={{ color: colors.text, flex: 1, marginLeft: 8, fontSize: 13 }}>{tip.tip}</Text>
                </View>
              ))}
              {drivingMetrics.length > 0 ? (
                <View style={{ marginTop: spacing.sm }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>Metric scores (recent trips)</Text>
                  {drivingMetrics.map((m) => (
                    <View key={m.id} style={{ marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.text, fontSize: 12 }}>{m.name}</Text>
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{m.score}</Text>
                      </View>
                      <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 4 }}>
                        <View
                          style={{
                            width: `${Math.min(100, m.score)}%`,
                            height: '100%',
                            borderRadius: 2,
                            backgroundColor: colors.primary,
                          }}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 8 }}>
            Fuel (lifetime / recent logs — not filtered by range above)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Text style={{ color: colors.text, fontSize: 13 }}>
              Est. monthly:{' '}
              {fuelSummary.monthlyEstimate != null ? `$${fuelSummary.monthlyEstimate}` : '—'}
            </Text>
            <Text style={{ color: colors.text, fontSize: 13 }}>
              MPG: {fuelSummary.avgMpg != null ? `${fuelSummary.avgMpg}` : '—'}
            </Text>
            <Text style={{ color: colors.text, fontSize: 13 }}>
              $/mi: {fuelSummary.costPerMile != null ? fuelSummary.costPerMile.toFixed(2) : '—'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onOpenFuelTracker}
            style={[styles.ctaBtn, { backgroundColor: '#2563EB', marginTop: 12 }]}
          >
            <Ionicons name="water-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.ctaBtnText}>Log fill-up</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setTripsOpen(!tripsOpen)}
          style={styles.sectionHeader}
        >
          <Text style={{ color: colors.text, fontWeight: '800' }}>
            Trips in range ({filteredTrips.length})
          </Text>
          <Ionicons name={tripsOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        {tripsOpen ? (
          filteredTrips.length === 0 ? (
            <Text style={{ color: colors.textSecondary, paddingVertical: 12 }}>
              No trips in this range yet.
            </Text>
          ) : (
            filteredTrips.slice(0, 25).map((trip, idx) => (
              <TouchableOpacity
                key={`${trip.id}-${idx}`}
                activeOpacity={0.85}
                onPress={() => setTripDetail(trip)}
                style={[
                  styles.tripRow,
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>
                    {trip.date} · {trip.time}
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }} numberOfLines={2}>
                    {trip.origin} › {trip.destination}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                    {Number(trip.distance_miles ?? 0).toFixed(1)} mi · {trip.duration_minutes ?? 0} min
                    {typeof trip.gems_earned === 'number' && trip.gems_earned > 0
                      ? ` · ${trip.gems_earned} gems`
                      : ''}
                  </Text>
                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                    Tap for details
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[styles.scoreChip, { backgroundColor: `${colors.success}22` }]}>
                    <Text style={{ color: colors.success, fontWeight: '800' }}>{trip.safety_score ?? 0}</Text>
                  </View>
                  <Text style={{ color: colors.textTertiary, fontSize: 10, marginTop: 4 }}>Safety</Text>
                </View>
              </TouchableOpacity>
            ))
          )
        ) : null}

        <TouchableOpacity onPress={() => setGemsOpen(!gemsOpen)} style={styles.sectionHeader}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>
            Gem transactions ({filteredGemTx.length})
          </Text>
          <Ionicons name={gemsOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        {gemsOpen ? (
          filteredGemTx.length === 0 ? (
            <Text style={{ color: colors.textSecondary, paddingVertical: 12 }}>No gem activity in this range.</Text>
          ) : (
            filteredGemTx.slice(0, 20).map((row) => (
              <View
                key={row.id}
                style={[
                  styles.gemRow,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text }} numberOfLines={2}>
                    {row.source}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                    {new Date(row.date).toLocaleString()}
                  </Text>
                </View>
                <Text
                  style={{
                    color: row.type === 'spent' ? colors.danger : colors.success,
                    fontWeight: '800',
                  }}
                >
                  {row.type === 'spent' ? '-' : '+'}
                  {row.amount}
                </Text>
              </View>
            ))
          )
        ) : null}

        <TouchableOpacity onPress={() => setBadgesOpen(!badgesOpen)} style={styles.sectionHeader}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>
            Badges ({earnedCount}/{badgeRows.length})
          </Text>
          <Ionicons name={badgesOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        {badgesOpen ? (
          <View style={{ marginBottom: spacing.lg }}>
            {badgesByCategory.map(([cat, items]) => (
              <View key={cat} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name={categoryIcon(cat)} size={16} color={colors.primary} />
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{cat}</Text>
                </View>
                {items.map((b) => (
                  <View
                    key={String(b.id)}
                    style={[
                      styles.badgeRow,
                      { borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
                    ]}
                  >
                    <View
                      style={[
                        styles.badgeIconWrap,
                        { backgroundColor: b.earned ? `${colors.primary}22` : colors.border },
                      ]}
                    >
                      <Ionicons
                        name={b.earned ? 'trophy' : 'lock-closed-outline'}
                        size={20}
                        color={b.earned ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={2}>
                        {b.name}
                      </Text>
                      {!!b.description && (
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={2}>
                          {b.description}
                        </Text>
                      )}
                      {!b.earned && typeof b.progress === 'number' ? (
                        <View style={{ marginTop: 6 }}>
                          <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border }}>
                            <View
                              style={{
                                width: `${Math.min(100, b.progress)}%`,
                                height: '100%',
                                backgroundColor: colors.primary,
                                borderRadius: 2,
                              }}
                            />
                          </View>
                          <Text style={{ color: colors.textTertiary, fontSize: 10, marginTop: 4 }}>
                            {b.progress}% to unlock
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {tripDetail ? (
        <View
          style={[
            styles.tripDetailLayer,
            Platform.OS === 'android' ? { elevation: 30 } : null,
          ]}
          pointerEvents="box-none"
        >
          <Pressable
            style={styles.tripOverlayInner}
            onPress={() => setTripDetail(null)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss trip detail"
          />
          <View style={[styles.tripDetailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.h2, { color: colors.text, marginBottom: 8 }]}>Trip detail</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
              {tripDetail.date} · {tripDetail.time}
            </Text>
            <View style={styles.tripDetailRow}>
              <Ionicons name="navigate-outline" size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>From</Text>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{tripDetail.origin}</Text>
              </View>
            </View>
            <View style={styles.tripDetailRow}>
              <Ionicons name="flag-outline" size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>To</Text>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{tripDetail.destination}</Text>
              </View>
            </View>
            <View style={[styles.tripStatGrid, { borderColor: colors.border }]}>
              <View style={styles.tripStatCell}>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Distance</Text>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>
                  {Number(tripDetail.distance_miles ?? 0).toFixed(1)} mi
                </Text>
              </View>
              <View style={styles.tripStatCell}>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Duration</Text>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>
                  {tripDetail.duration_minutes ?? 0} min
                </Text>
              </View>
              <View style={styles.tripStatCell}>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Safety</Text>
                <Text style={{ color: colors.success, fontSize: 18, fontWeight: '900' }}>
                  {tripDetail.safety_score ?? 0}
                </Text>
              </View>
              <View style={styles.tripStatCell}>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Gems</Text>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>
                  {tripDetail.gems_earned ?? 0}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setTripDetail(null)}
              style={[styles.tripDetailClose, { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  heroEyebrow: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 17, fontWeight: '900', marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpiTile: {
    width: '48%',
    borderRadius: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  kpiVal: { fontSize: 20, fontWeight: '900', marginTop: 6 },
  kpiLbl: { fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  leaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
  },
  lockBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  ctaBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  tripRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 8,
  },
  scoreChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  gemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  badgeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightsSheetBody: {
    position: 'relative',
    width: '100%',
  },
  insightsScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  insightsScrollDimmed: {
    opacity: 0.35,
  },
  tripDetailLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 12,
    zIndex: 50,
  },
  tripOverlayInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  tripDetailCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  tripDetailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  tripStatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    marginTop: 8,
    gap: 12,
  },
  tripStatCell: { width: '47%' },
  tripDetailClose: { marginTop: 18, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
});
