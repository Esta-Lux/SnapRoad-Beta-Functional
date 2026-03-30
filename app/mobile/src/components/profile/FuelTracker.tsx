import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
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
  odometer: number;
  mpg?: number;
}

function normalizeFillUp(raw: Record<string, unknown>): FillUp {
  return {
    id: String(raw.id ?? ''),
    date: String(raw.date ?? ''),
    gallons: Number(raw.gallons ?? 0),
    price_per_gallon: Number(raw.price_per_gallon ?? 0),
    odometer: Number(raw.odometer ?? 0),
    mpg: raw.mpg != null && raw.mpg !== '' ? Number(raw.mpg) : undefined,
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

/** Same bottom-sheet + theme tokens as SubmitConcern / Driver snapshot. */
export default function FuelTracker({ visible, onClose }: Props) {
  const { colors, spacing, radius, typography } = useTheme();
  const [tab, setTab] = useState<'history' | 'log'>('history');
  const [gallons, setGallons] = useState('');
  const [price, setPrice] = useState('');
  const [odometer, setOdometer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<FillUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    }
  }, [visible, fetchHistory]);

  const handleSubmit = async () => {
    const g = parseFloat(gallons);
    const p = parseFloat(price);
    const o = parseFloat(odometer);
    if (!Number.isFinite(g) || !Number.isFinite(p) || !Number.isFinite(o) || g <= 0 || p < 0 || o < 0) {
      Alert.alert('Missing fields', 'Please fill in gallons, price, and odometer with valid numbers.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/fuel/logs', {
        gallons: g,
        price_per_gallon: p,
        odometer: o,
      });
      if (res.success) {
        setGallons('');
        setPrice('');
        setOdometer('');
        fetchHistory();
        setTab('history');
        Alert.alert('Logged', 'Fill-up saved.');
      } else {
        Alert.alert('Error', res.error || 'Failed to log fill-up');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderFillUp = ({ item }: { item: FillUp }) => {
    const total = (item.gallons * item.price_per_gallon).toFixed(2);
    const mpgText = item.mpg != null ? item.mpg.toFixed(1) : '—';
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
        {item.odometer > 0 ? (
          <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
            Odometer {item.odometer.toLocaleString()} mi
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <SheetModal visible={visible} onClose={onClose}>
      <View style={[styles.headerRow, { marginBottom: spacing.md }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
          <Ionicons name="car-sport-outline" size={24} color={colors.primary} />
          <Text style={[typography.h2, { color: colors.text }]}>Fuel tracker</Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Done">
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.primary }}>Done</Text>
        </TouchableOpacity>
      </View>

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
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
              renderItem={renderFillUp}
              scrollEnabled={false}
              contentContainerStyle={{ paddingTop: spacing.md, gap: spacing.sm }}
            />
          )}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6, marginTop: spacing.sm }]}>Odometer (mi)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="0"
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
              onPress={handleSubmit}
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
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  fillUpCard: { borderRadius: 12, padding: 14, borderWidth: StyleSheet.hairlineWidth },
  fillUpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
});
