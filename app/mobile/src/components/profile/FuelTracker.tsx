import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SheetModal from '../common/Modal';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface FillUp {
  id: string;
  date: string;
  gallons: number;
  price_per_gallon: number;
  odometer: number | null;
  mpg?: number;
  station?: string;
  isFullTank?: boolean;
  odometerSource?: string;
  tripsMilesUsed?: number | null;
}

interface FuelSuggestion {
  tripsMiles: number | null;
  suggested: number | null;
  lastFill: number | null;
  canAuto: boolean;
}

function parseStatsBody(res: { success: boolean; data?: unknown; error?: string }): FuelSuggestion {
  if (!res.success || res.data == null) {
    return { tripsMiles: null, suggested: null, lastFill: null, canAuto: false };
  }
  const body = res.data as Record<string, unknown>;
  const d = (body.data as Record<string, unknown>) ?? body;
  return {
    tripsMiles: d.trips_miles_since_last_fill != null ? Number(d.trips_miles_since_last_fill) : null,
    suggested: d.suggested_odometer_mi != null ? Number(d.suggested_odometer_mi) : null,
    lastFill: d.last_fill_odometer_mi != null ? Number(d.last_fill_odometer_mi) : null,
    canAuto: Boolean(d.can_auto_odometer),
  };
}

function normalizeFillUp(raw: Record<string, unknown>): FillUp {
  const dateStr = String(raw.date ?? raw.created_at ?? '');
  const oRaw = raw.odometer;
  let odometer: number | null = null;
  if (oRaw != null && oRaw !== '') {
    const n = Number(oRaw);
    if (Number.isFinite(n) && n > 0) odometer = n;
  }
  const st = raw.station_name ?? raw.station;
  const tm = raw.trips_miles_used;
  return {
    id: String(raw.id ?? ''),
    date: dateStr,
    gallons: Number(raw.gallons ?? 0),
    price_per_gallon: Number(raw.price_per_gallon ?? 0),
    odometer,
    mpg: raw.mpg != null && raw.mpg !== '' ? Number(raw.mpg) : undefined,
    station: typeof st === 'string' && st.trim() ? st.trim() : undefined,
    isFullTank: raw.is_full_tank !== false,
    odometerSource: typeof raw.odometer_source === 'string' ? raw.odometer_source : undefined,
    tripsMilesUsed: tm != null && tm !== '' ? Number(tm) : undefined,
  };
}

function unwrapFuelItems(res: { success: boolean; data?: unknown; error?: string }): FillUp[] {
  if (!res.success || res.data == null) return [];
  const body = res.data as Record<string, unknown>;
  const payload = (body.data as Record<string, unknown> | undefined) ?? body;
  const items = payload.items;
  if (!Array.isArray(items)) return [];
  return items.map((x) => normalizeFillUp(x as Record<string, unknown>));
}

export default function FuelTracker({ visible, onClose }: Props) {
  const { colors, spacing, radius, typography } = useTheme();
  const [tab, setTab] = useState<'history' | 'log'>('history');
  const [gallons, setGallons] = useState('');
  const [price, setPrice] = useState('');
  const [odometer, setOdometer] = useState('');
  const [station, setStation] = useState('');
  const [fullTank, setFullTank] = useState(true);
  const [suggestion, setSuggestion] = useState<FuelSuggestion>({
    tripsMiles: null,
    suggested: null,
    lastFill: null,
    canAuto: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<FillUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevTabRef = useRef<'history' | 'log'>(tab);
  const historyRef = useRef(history);
  historyRef.current = history;

  const fetchHistory = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<unknown>('/api/fuel/history?limit=30')
      .then((res) => {
        if (res.success) {
          setHistory(unwrapFuelItems(res));
        } else {
          setError(res.error || 'Failed to load history');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (visible) {
      fetchHistory();
      setTab('history');
      prevTabRef.current = 'history';
      setFullTank(true);
    }
  }, [visible, fetchHistory]);

  useEffect(() => {
    const enteredLog = visible && tab === 'log' && prevTabRef.current !== 'log';
    prevTabRef.current = tab;
    if (!enteredLog) return;
    void (async () => {
      const statsRes = await api.get<unknown>('/api/fuel/stats');
      const sug = parseStatsBody(statsRes);
      setSuggestion(sug);
      const h = historyRef.current;
      const lastOdom = h[0]?.odometer ?? null;
      let next = '';
      if (sug.suggested != null && Number.isFinite(sug.suggested)) {
        next = String(Math.round(sug.suggested));
      } else if (lastOdom != null) {
        next = String(Math.round(lastOdom));
      }
      setOdometer(next);
    })();
  }, [visible, tab]);

  const lastLoggedOdometer = history.length > 0 ? history[0].odometer : null;

  const submitFillUp = async (
    g: number,
    p: number,
    odom: number | undefined,
    opts?: { useAutoOdometer?: boolean },
  ) => {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        gallons: g,
        price_per_gallon: p,
        station: station.trim() || 'Unknown',
        is_full_tank: fullTank,
      };
      if (opts?.useAutoOdometer) {
        body.use_auto_odometer = true;
      } else if (odom !== undefined) {
        body.odometer = odom;
      }
      const res = await api.post<Record<string, unknown>>('/api/fuel/logs', body);
      if (!res.success) {
        Alert.alert('Error', res.error || 'Failed to log fill-up');
        return;
      }
      const top = res.data as Record<string, unknown> | undefined;
      const row = (top?.data as Record<string, unknown> | undefined) ?? top;
      const mpgFill = row?.mpg_this_fill;
      const src = row?.odometer_source;
      const mpgText =
        mpgFill != null && mpgFill !== '' && Number.isFinite(Number(mpgFill))
          ? ` About ${Number(mpgFill)} MPG this tank.`
          : '';
      const autoNote = src === 'auto_trips' ? ' Used SnapRoad trip miles for odometer.' : '';
      setGallons('');
      setPrice('');
      setStation('');
      setOdometer('');
      setFullTank(true);
      fetchHistory();
      void api.get<unknown>('/api/fuel/stats').then((r) => setSuggestion(parseStatsBody(r)));
      setTab('history');
      Alert.alert('Logged', `Fill-up saved.${mpgText}${autoNote}`);
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const g = parseFloat(gallons);
    const p = parseFloat(price);
    if (!Number.isFinite(g) || !Number.isFinite(p) || g <= 0 || p < 0) {
      Alert.alert('Missing fields', 'Enter gallons and price per gallon.');
      return;
    }
    const oTrim = odometer.trim();
    const o = oTrim === '' ? NaN : parseFloat(oTrim);
    const odomPayload = Number.isFinite(o) && o >= 0 ? o : undefined;

    if (odomPayload === undefined) {
      if (suggestion.canAuto) {
        Alert.alert(
          'Odometer empty',
          'Enter your dash reading, or log with SnapRoad trip miles only (below).',
          [{ text: 'OK' }],
        );
      } else {
        Alert.alert('Odometer required', 'Enter your current odometer for your first fill-up, or after a prior log without mileage.');
      }
      return;
    }

    if (lastLoggedOdometer != null && odomPayload <= lastLoggedOdometer) {
      Alert.alert(
        'Odometer check',
        `Last log was ${lastLoggedOdometer.toLocaleString()} mi. New reading should be higher unless you replaced your odometer. Save anyway?`,
        [
          { text: 'Edit', style: 'cancel' },
          { text: 'Save', onPress: () => void submitFillUp(g, p, odomPayload) },
        ],
      );
      return;
    }
    await submitFillUp(g, p, odomPayload);
  };

  const handleLogAuto = () => {
    const g = parseFloat(gallons);
    const p = parseFloat(price);
    if (!Number.isFinite(g) || !Number.isFinite(p) || g <= 0 || p < 0) {
      Alert.alert('Missing fields', 'Enter gallons and price per gallon first.');
      return;
    }
    if (!suggestion.canAuto) {
      Alert.alert('Not available', 'Log at least one fill-up with odometer before using trip estimates.');
      return;
    }
    const tm = suggestion.tripsMiles ?? 0;
    const detail =
      tm > 0
        ? `We will use last fill + ${tm.toFixed(1)} mi from SnapRoad trips. If you drove more off-app, use the field above.`
        : 'No qualifying SnapRoad trips since your last fill — odometer will match your last log. Prefer your real dash reading if you drove off-app.';
    Alert.alert('Log with SnapRoad miles?', detail, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log', onPress: () => void submitFillUp(g, p, undefined, { useAutoOdometer: true }) },
    ]);
  };

  const renderFillUp = ({ item, index }: { item: FillUp; index: number }) => {
    const total = (item.gallons * item.price_per_gallon).toFixed(2);
    const older = history[index + 1];
    let intervalMpg: number | undefined;
    const prevFull = older?.isFullTank !== false;
    const currFull = item.isFullTank !== false;
    if (
      prevFull &&
      currFull &&
      older?.odometer != null &&
      item.odometer != null &&
      item.odometer > older.odometer &&
      item.gallons > 0
    ) {
      intervalMpg = (item.odometer - older.odometer) / item.gallons;
    }
    const mpgText =
      item.mpg != null ? item.mpg.toFixed(1) : intervalMpg != null ? intervalMpg.toFixed(1) : '—';
    const partial = item.isFullTank === false;
    return (
      <View
        style={[
          styles.fillUpCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.fillUpRow}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{new Date(item.date).toLocaleDateString()}</Text>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>{mpgText} MPG</Text>
        </View>
        <View style={styles.fillUpRow}>
          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
            {item.gallons.toFixed(2)} gal @ ${item.price_per_gallon.toFixed(2)}
          </Text>
          <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>${total}</Text>
        </View>
        {partial ? (
          <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>Partial fill · MPG hidden</Text>
        ) : null}
        {item.station ? (
          <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>{item.station}</Text>
        ) : null}
        {item.odometer != null ? (
          <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
            Odometer {item.odometer.toLocaleString()} mi
            {item.odometerSource === 'auto_trips' ? ' · auto (trips)' : ''}
          </Text>
        ) : null}
        {item.tripsMilesUsed != null && item.tripsMilesUsed > 0 ? (
          <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>
            +{item.tripsMilesUsed.toFixed(1)} mi SnapRoad at log time
          </Text>
        ) : null}
      </View>
    );
  };

  const sug = suggestion;

  return (
    <SheetModal visible={visible} onClose={onClose} scrollable={false}>
      <View style={[styles.headerRow, { marginBottom: spacing.md }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
          <Ionicons name="car-sport-outline" size={24} color={colors.primary} />
          <Text style={[typography.h2, { color: colors.text }]}>Fuel tracker</Text>
        </View>
      </View>

      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm, lineHeight: 18 }]}>
        SnapRoad can add trip miles since your last fill to suggest odometer (on-app miles). Use your real dash for taxes;
        adjust if you drove off-app.
      </Text>

      <View style={[styles.segment, { backgroundColor: colors.surfaceSecondary }]}>
        {(['history', 'log'] as const).map((t) => {
          const on = tab === t;
          return (
            <TouchableOpacity
              key={t}
              style={[
                styles.segmentChip,
                on && {
                  backgroundColor: colors.card,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setTab(t)}
              activeOpacity={0.85}
            >
              <Text style={[typography.body, { fontWeight: '700', color: on ? colors.text : colors.textSecondary }]}>
                {t === 'history' ? 'History' : 'Log fill-up'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'history' ? (
        <ScrollView
          style={{ maxHeight: 400 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ paddingVertical: spacing.lg }} />
          ) : error ? (
            <Text style={{ color: colors.danger, textAlign: 'center', paddingVertical: spacing.lg }}>{error}</Text>
          ) : history.length === 0 ? (
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg }]}>
              No fill-ups yet. Switch to Log fill-up to add one.
            </Text>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => renderFillUp({ item, index })}
              scrollEnabled={false}
              contentContainerStyle={{ paddingTop: spacing.md, gap: spacing.sm }}
            />
          )}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingBottom: 12 }}
        >
          {sug.canAuto && (sug.tripsMiles != null || sug.suggested != null) ? (
            <View
              style={[
                styles.formCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.primary + '44',
                  marginBottom: spacing.sm,
                },
              ]}
            >
              <Text style={[typography.caption, { color: colors.text, fontWeight: '700', marginBottom: 6 }]}>Trip estimate</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
                SnapRoad trips since last fill:{' '}
                <Text style={{ fontWeight: '800', color: colors.text }}>
                  {sug.tripsMiles != null ? `${sug.tripsMiles.toFixed(1)} mi` : '0 mi'}
                </Text>
                {sug.lastFill != null ? (
                  <>
                    {' '}· Last fill {sug.lastFill.toLocaleString()} mi
                  </>
                ) : null}
              </Text>
              {sug.suggested != null ? (
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 6, lineHeight: 18 }]}>
                  Suggested odometer:{' '}
                  <Text style={{ fontWeight: '800', color: colors.primary }}>{Math.round(sug.suggested).toLocaleString()} mi</Text>
                  {(sug.tripsMiles ?? 0) <= 0 ? ' — no in-app trips; use your dash if you drove off-app.' : ''}
                </Text>
              ) : null}
              {sug.suggested != null ? (
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: colors.border, marginTop: spacing.sm }]}
                  onPress={() => setOdometer(String(Math.round(sug.suggested!)))}
                >
                  <Text style={[typography.body, { fontWeight: '700', color: colors.primary }]}>Apply to field</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <View
            style={[
              styles.formCard,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
            ]}
          >
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>Gallons</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              value={gallons}
              onChangeText={setGallons}
            />
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6, marginTop: spacing.sm }]}>Price per gallon ($)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
            />
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6, marginTop: spacing.sm }]}>Station (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. Costco, Shell"
              placeholderTextColor={colors.textTertiary}
              value={station}
              onChangeText={setStation}
            />

            <View style={[styles.rowBetween, { marginTop: spacing.md, marginBottom: 6 }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[typography.caption, { color: colors.text, fontWeight: '700' }]}>Full tank</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2, lineHeight: 16 }]}>
                  Turn off for a top-off (interval MPG skipped).
                </Text>
              </View>
              <Switch value={fullTank} onValueChange={setFullTank} />
            </View>

            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6, marginTop: spacing.sm }]}>Odometer (mi)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder={
                lastLoggedOdometer != null
                  ? `Was ${lastLoggedOdometer.toLocaleString()} — today's dash or Apply above`
                  : 'First fill: enter dash reading'
              }
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              value={odometer}
              onChangeText={setOdometer}
            />

            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1, marginTop: spacing.md, borderRadius: radius.md, minHeight: 48 },
              ]}
              onPress={() => void handleSubmit()}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Log fill-up</Text>
                </>
              )}
            </TouchableOpacity>

            {suggestion.canAuto ? (
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  { borderColor: colors.primary + '66', marginTop: spacing.sm, opacity: submitting ? 0.6 : 1 },
                ]}
                onPress={() => void handleLogAuto()}
                disabled={submitting}
              >
                <Ionicons name="navigate-outline" size={18} color={colors.primary} />
                <Text style={[typography.body, { fontWeight: '700', color: colors.primary }]}>Log with SnapRoad miles only</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 16, gap: 4 },
  segmentChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10 },
  formCard: { borderRadius: 16, padding: 16, marginTop: 4, borderWidth: StyleSheet.hairlineWidth },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: StyleSheet.hairlineWidth },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  fillUpCard: { borderRadius: 12, padding: 14, borderWidth: StyleSheet.hairlineWidth },
  fillUpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
});
