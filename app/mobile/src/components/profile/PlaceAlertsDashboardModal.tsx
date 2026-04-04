import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Modal from '../common/Modal';
import { api } from '../../api/client';
import type { SavedLocation } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

const DAY_DEFS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  places: SavedLocation[];
  userLocation: { lat: number; lng: number };
  placeAlerts: {
    id: string;
    name: string;
    address?: string;
    alert_minutes_before: number;
    days_of_week: string[];
    realtime_push?: boolean;
  }[];
  placeAlertLimit: number;
  placeAlertPremium: boolean;
  onRefresh: () => void;
};

function hasCoords(p: SavedLocation): boolean {
  return (
    p.lat != null &&
    p.lng != null &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    (Math.abs(p.lat) > 1e-6 || Math.abs(p.lng) > 1e-6)
  );
}

function validLeaveTime(s: string): boolean {
  const t = s.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return false;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

export default function PlaceAlertsDashboardModal({
  visible,
  onClose,
  places,
  userLocation,
  placeAlerts,
  placeAlertLimit,
  placeAlertPremium,
  onRefresh,
}: Props) {
  const { colors } = useTheme();
  const cardBg = colors.card;
  const text = colors.text;
  const sub = colors.textSecondary;
  const border = colors.border;
  const primary = colors.primary;

  const placesOk = useMemo(() => places.filter(hasCoords), [places]);
  const [destination, setDestination] = useState<SavedLocation | null>(null);
  const [originMode, setOriginMode] = useState<'current' | 'saved'>('current');
  const [originPlace, setOriginPlace] = useState<SavedLocation | null>(null);
  const [leaveTime, setLeaveTime] = useState('08:00');
  const [minutesBefore, setMinutesBefore] = useState('20');
  const [selectedDays, setSelectedDays] = useState<Set<string>>(() => new Set(DAY_DEFS.map((d) => d.key)));
  const [picker, setPicker] = useState<null | 'destination' | 'origin'>(null);
  const [submitting, setSubmitting] = useState(false);

  const locOk =
    Number.isFinite(userLocation.lat) &&
    Number.isFinite(userLocation.lng) &&
    (Math.abs(userLocation.lat) > 1e-6 || Math.abs(userLocation.lng) > 1e-6);

  const toggleDay = useCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const submit = useCallback(async () => {
    if (!destination || !hasCoords(destination)) {
      Alert.alert('Destination required', 'Choose where you are going (a saved place with a map pin).');
      return;
    }
    if (originMode === 'saved' && !originPlace) {
      Alert.alert('Starting point', 'Pick a saved place for where you usually leave from, or use Current location.');
      return;
    }
    if (originMode === 'current' && !locOk) {
      Alert.alert(
        'Starting point',
        'Current location is not available yet. Open the Map tab to get a GPS fix, or choose a saved starting place.',
      );
      return;
    }
    if (!validLeaveTime(leaveTime)) {
      Alert.alert('Leave time', 'Enter a leave time like 08:30 (24-hour).');
      return;
    }
    const days = DAY_DEFS.map((d) => d.key).filter((k) => selectedDays.has(k));
    if (days.length === 0) {
      Alert.alert('Days', 'Select at least one day for this alert.');
      return;
    }
    const mins = Math.max(1, Math.min(24 * 60, parseInt(minutesBefore.replace(/\D/g, ''), 10) || 20));
    if (placeAlerts.length >= placeAlertLimit) {
      Alert.alert(
        'Limit reached',
        placeAlertPremium
          ? `You already have ${placeAlertLimit} place alerts.`
          : `Free plan allows ${placeAlertLimit} alerts. Upgrade for more slots and real-time push.`,
      );
      return;
    }

    const originLabel =
      originMode === 'current' ? 'Current location' : (originPlace?.name ?? 'Saved start');
    const name =
      originMode === 'saved' && originPlace
        ? `${originPlace.name} → ${destination.name}`
        : `To ${destination.name}`;
    const address = [
      `Start: ${originLabel}.`,
      `Leave by ${leaveTime.trim()}.`,
      destination.address ? `Arrive: ${destination.address}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    setSubmitting(true);
    try {
      const res = await api.post('/api/place-alerts', {
        name,
        address,
        lat: destination.lat,
        lng: destination.lng,
        alert_minutes_before: mins,
        days_of_week: days,
        time_of_day: leaveTime.trim(),
      });
      if (!res.success) {
        Alert.alert('Could not save', res.error || 'Try again.');
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDestination(null);
      setOriginPlace(null);
      setOriginMode('current');
      setLeaveTime('08:00');
      setMinutesBefore('20');
      setSelectedDays(new Set(DAY_DEFS.map((d) => d.key)));
      onRefresh();
    } catch {
      Alert.alert('Error', 'Could not create this alert right now.');
    } finally {
      setSubmitting(false);
    }
  }, [
    destination,
    originMode,
    originPlace,
    leaveTime,
    minutesBefore,
    selectedDays,
    placeAlerts.length,
    placeAlertLimit,
    placeAlertPremium,
    locOk,
    onRefresh,
  ]);

  const deleteAlert = useCallback(
    (id: string, label: string) => {
      Alert.alert('Delete alert', `Remove alert for ${label}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void api.delete(`/api/place-alerts/${id}`).then(() => {
              onRefresh();
            });
          },
        },
      ]);
    },
    [onRefresh],
  );

  return (
    <Modal visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: text }]}>Place alerts</Text>
      <Text style={[styles.sub, { color: sub }]}>
        {`Using ${placeAlerts.length} of ${placeAlertLimit} alerts.`}
        {placeAlertPremium ? ' Premium includes real-time push when traffic changes.' : ' Free plan uses scheduled notifications.'}
      </Text>

      <Text style={[styles.sectionLbl, { color: sub }]}>Where you&apos;re leaving from</Text>
      <View style={[styles.segment, { borderColor: border }]}>
        <TouchableOpacity
          style={[styles.segBtn, originMode === 'current' && { backgroundColor: `${primary}22` }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setOriginMode('current');
            setPicker(null);
          }}
        >
          <Text style={[styles.segTxt, { color: text }]}>Current location</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, originMode === 'saved' && { backgroundColor: `${primary}22` }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setOriginMode('saved');
            setPicker(null);
          }}
        >
          <Text style={[styles.segTxt, { color: text }]}>Saved place</Text>
        </TouchableOpacity>
      </View>
      {originMode === 'saved' ? (
        <>
          <TouchableOpacity
            style={[styles.pickRow, { backgroundColor: cardBg, borderColor: border }]}
            onPress={() => setPicker(picker === 'origin' ? null : 'origin')}
          >
            <Text style={{ color: sub, fontSize: 12, fontWeight: '600' }}>Starting place</Text>
            <Text style={{ color: text, fontSize: 15, fontWeight: '700', marginTop: 4 }}>
              {originPlace?.name ?? 'Tap to choose'}
            </Text>
          </TouchableOpacity>
          {picker === 'origin' && (
            <ScrollView
              style={{ maxHeight: 160, marginBottom: 10 }}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {placesOk.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.listRow, { borderBottomColor: border }]}
                  onPress={() => {
                    setOriginPlace(item);
                    setPicker(null);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={{ color: text, fontWeight: '600' }}>{item.name}</Text>
                  <Text style={{ color: sub, fontSize: 12 }} numberOfLines={1}>
                    {item.address}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      ) : (
        <Text style={[styles.hint, { color: sub }]}>
          We&apos;ll use your live position when the alert runs (open Map for best GPS).
        </Text>
      )}

      <Text style={[styles.sectionLbl, { color: sub, marginTop: 6 }]}>Destination</Text>
      <TouchableOpacity
        style={[styles.pickRow, { backgroundColor: cardBg, borderColor: border }]}
        onPress={() => setPicker(picker === 'destination' ? null : 'destination')}
      >
        <Text style={{ color: sub, fontSize: 12, fontWeight: '600' }}>Where you need to be</Text>
        <Text style={{ color: text, fontSize: 15, fontWeight: '700', marginTop: 4 }}>
          {destination?.name ?? 'Tap to choose a saved place'}
        </Text>
      </TouchableOpacity>
      {picker === 'destination' && (
        <ScrollView
          style={{ maxHeight: 180, marginBottom: 10 }}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {placesOk.length === 0 ? (
            <Text style={{ color: sub, padding: 12 }}>
              Save places in Profile first so they appear here.
            </Text>
          ) : (
            placesOk.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.listRow, { borderBottomColor: border }]}
                onPress={() => {
                  setDestination(item);
                  setPicker(null);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={{ color: text, fontWeight: '600' }}>{item.name}</Text>
                <Text style={{ color: sub, fontSize: 12 }} numberOfLines={1}>
                  {item.address}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <Text style={[styles.sectionLbl, { color: sub }]}>Time you need to leave</Text>
      <TextInput
        value={leaveTime}
        onChangeText={setLeaveTime}
        placeholder="08:30"
        placeholderTextColor={sub}
        keyboardType="numbers-and-punctuation"
        style={[styles.input, { color: text, borderColor: border, backgroundColor: cardBg }]}
      />

      <Text style={[styles.sectionLbl, { color: sub }]}>Alert me this many minutes before</Text>
      <TextInput
        value={minutesBefore}
        onChangeText={setMinutesBefore}
        keyboardType="number-pad"
        style={[styles.input, { color: text, borderColor: border, backgroundColor: cardBg }]}
      />

      <Text style={[styles.sectionLbl, { color: sub }]}>Repeat on</Text>
      <View style={styles.dayRow}>
        {DAY_DEFS.map((d) => {
          const on = selectedDays.has(d.key);
          return (
            <TouchableOpacity
              key={d.key}
              onPress={() => toggleDay(d.key)}
              style={[
                styles.dayChip,
                {
                  borderColor: border,
                  backgroundColor: on ? `${primary}28` : cardBg,
                },
              ]}
            >
              <Text style={{ color: on ? primary : sub, fontSize: 12, fontWeight: '700' }}>{d.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.cta, { backgroundColor: primary, opacity: submitting ? 0.7 : 1 }]}
        disabled={submitting}
        onPress={() => void submit()}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>Save alert</Text>
        )}
      </TouchableOpacity>

      <Text style={[styles.sectionLbl, { color: sub, marginTop: 16 }]}>Your alerts</Text>
      {placeAlerts.length === 0 ? (
        <Text style={{ color: sub, fontSize: 14, lineHeight: 20, marginBottom: 8 }}>No alerts yet.</Text>
      ) : (
        placeAlerts.map((a) => (
          <View
            key={a.id}
            style={[styles.alertRow, { backgroundColor: cardBg, borderColor: border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: text, fontWeight: '700' }}>{a.name}</Text>
              <Text style={{ color: sub, fontSize: 12, marginTop: 2 }}>
                {a.alert_minutes_before >= 60
                  ? `${Math.round(a.alert_minutes_before / 60)}h before`
                  : `${a.alert_minutes_before} min before`}
                {' · '}
                {a.realtime_push ? 'Real-time' : 'Scheduled'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => deleteAlert(a.id, a.name)} hitSlop={10}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))
      )}

      {!placeAlertPremium && placeAlerts.length >= 5 ? (
        <View style={[styles.footerBox, { borderColor: border, backgroundColor: cardBg }]}>
          <Ionicons name="diamond-outline" size={20} color={primary} style={{ marginBottom: 6 }} />
          <Text style={{ color: text, fontWeight: '700', marginBottom: 4 }}>Upgrade for more</Text>
          <Text style={{ color: sub, fontSize: 13, lineHeight: 18 }}>
            Premium expands to 20 alerts and enables pushes when live traffic shifts your ETA.
          </Text>
        </View>
      ) : null}

      <View style={[styles.footerBox, { borderColor: border, backgroundColor: cardBg, marginTop: 12 }]}>
        <Ionicons name="navigate-circle-outline" size={22} color={primary} style={{ marginBottom: 6 }} />
        <Text style={{ color: text, fontWeight: '800', marginBottom: 6 }}>How this helps</Text>
        <Text style={{ color: sub, fontSize: 13, lineHeight: 19 }}>
          Place alerts watch the route ahead and your schedule. When congestion, incidents, or slowdowns stack up,
          SnapRoad can warn you earlier so you still leave on time. Premium adds real-time push so updates track
          live driving conditions—not only a fixed clock.
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  sub: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  sectionLbl: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
  segment: { flexDirection: 'row', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 10 },
  segBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  segTxt: { fontSize: 13, fontWeight: '700' },
  pickRow: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 8 },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 12 },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  dayChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  cta: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  listRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  footerBox: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 8 },
});
