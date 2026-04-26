import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Modal from '../common/Modal';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import type { SavedLocation } from '../../types';
import type { GeocodeResult } from '../../lib/directions';
import {
  buildLocalCommuteHits,
  COMMUTE_RECENT_SEARCHES_KEY,
  fetchCommuteAddressSuggestions,
  resolveCommutePlaceCoords,
  type CommuteGeocodeHit,
} from '../../lib/commutePlacesSearch';
import { storage } from '../../utils/storage';
import { registerCommutePushToken } from '../../utils/pushNotifications';

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Mo' },
  { key: 'tue', label: 'Tu' },
  { key: 'wed', label: 'We' },
  { key: 'thu', label: 'Th' },
  { key: 'fri', label: 'Fr' },
  { key: 'sat', label: 'Sa' },
  { key: 'sun', label: 'Su' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  cardBg: string;
  text: string;
  sub: string;
  primary: string;
  border: string;
  places: SavedLocation[];
  originLat: number;
  originLng: number;
  commuteCount: number;
  commuteLimit: number;
  onCreated: () => void;
};

export default function AddCommuteModal({
  visible,
  onClose,
  cardBg,
  text,
  sub,
  primary,
  border,
  places,
  originLat,
  originLng,
  commuteCount,
  commuteLimit,
  onCreated,
}: Props) {
  const [name, setName] = useState('My commute');
  const [leaveBy, setLeaveBy] = useState('08:00');
  const [alertMin, setAlertMin] = useState('120');
  const [monitorMin, setMonitorMin] = useState('180');
  const [notifyEveryMin, setNotifyEveryMin] = useState('30');
  const [maxPushes, setMaxPushes] = useState('3');
  const [dayMap, setDayMap] = useState<Record<string, boolean>>(() =>
    DAYS.reduce((a, d) => ({ ...a, [d.key]: true }), {} as Record<string, boolean>),
  );
  const [saving, setSaving] = useState(false);

  const [originMode, setOriginMode] = useState<'current' | 'address' | 'saved'>('current');
  const [originPlaceId, setOriginPlaceId] = useState<number | null>(null);
  const [originQuery, setOriginQuery] = useState('');
  const [originHits, setOriginHits] = useState<CommuteGeocodeHit[]>([]);
  const [originPick, setOriginPick] = useState<CommuteGeocodeHit | null>(null);
  const [originPickIdx, setOriginPickIdx] = useState<number | null>(null);

  const [destQuery, setDestQuery] = useState('');
  const [destHits, setDestHits] = useState<CommuteGeocodeHit[]>([]);
  const [destPick, setDestPick] = useState<CommuteGeocodeHit | null>(null);
  const [destPickIdx, setDestPickIdx] = useState<number | null>(null);

  const [originSuggestLoading, setOriginSuggestLoading] = useState(false);
  const [destSuggestLoading, setDestSuggestLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<GeocodeResult[]>([]);
  const originTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originGenRef = useRef(0);
  const destTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destGenRef = useRef(0);

  const locOk = useMemo(() => {
    return (
      Number.isFinite(originLat) &&
      Number.isFinite(originLng) &&
      (Math.abs(originLat) > 1e-6 || Math.abs(originLng) > 1e-6)
    );
  }, [originLat, originLng]);

  const prox = useMemo(() => (locOk ? { lat: originLat, lng: originLng } : undefined), [locOk, originLat, originLng]);

  const placesWithCoords = useMemo(
    () => places.filter((p) => p.lat != null && p.lng != null && Number.isFinite(p.lat) && Number.isFinite(p.lng)),
    [places],
  );

  const toggleDay = (key: string) => {
    setDayMap((m) => ({ ...m, [key]: !m[key] }));
  };

  useEffect(() => {
    if (!visible) return;
    const load = async () => {
      let raw = storage.getString(COMMUTE_RECENT_SEARCHES_KEY);
      if (raw == null) raw = await storage.getStringAsync(COMMUTE_RECENT_SEARCHES_KEY);
      if (!raw) {
        setRecentSearches([]);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as unknown;
        setRecentSearches(Array.isArray(parsed) ? (parsed as GeocodeResult[]) : []);
      } catch {
        setRecentSearches([]);
      }
    };
    void load();
  }, [visible]);

  useEffect(() => {
    if (!visible || originMode !== 'address') return;
    if (originTimerRef.current) clearTimeout(originTimerRef.current);
    const q = originQuery.trim();
    if (q.length < 2) {
      setOriginHits(buildLocalCommuteHits(q, places, recentSearches));
      setOriginSuggestLoading(false);
      return;
    }
    setOriginSuggestLoading(true);
    const gen = ++originGenRef.current;
    originTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const hits = await fetchCommuteAddressSuggestions(q, prox, places, recentSearches);
          if (originGenRef.current !== gen) return;
          setOriginPick(null);
          setOriginPickIdx(null);
          setOriginHits(hits);
        } finally {
          if (originGenRef.current === gen) setOriginSuggestLoading(false);
        }
      })();
    }, 280);
    return () => {
      if (originTimerRef.current) clearTimeout(originTimerRef.current);
    };
  }, [visible, originMode, originQuery, prox, places, recentSearches]);

  useEffect(() => {
    if (!visible) return;
    if (destTimerRef.current) clearTimeout(destTimerRef.current);
    const q = destQuery.trim();
    if (q.length < 2) {
      setDestHits(buildLocalCommuteHits(q, places, recentSearches));
      setDestSuggestLoading(false);
      return;
    }
    setDestSuggestLoading(true);
    const gen = ++destGenRef.current;
    destTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const hits = await fetchCommuteAddressSuggestions(q, prox, places, recentSearches);
          if (destGenRef.current !== gen) return;
          setDestPick(null);
          setDestPickIdx(null);
          setDestHits(hits);
        } finally {
          if (destGenRef.current === gen) setDestSuggestLoading(false);
        }
      })();
    }, 280);
    return () => {
      if (destTimerRef.current) clearTimeout(destTimerRef.current);
    };
  }, [visible, destQuery, prox, places, recentSearches]);

  const refreshOriginNow = useCallback(async () => {
    const q = originQuery.trim();
    if (q.length < 2) {
      setOriginHits(buildLocalCommuteHits(q, places, recentSearches));
      return;
    }
    setOriginSuggestLoading(true);
    try {
      const hits = await fetchCommuteAddressSuggestions(q, prox, places, recentSearches);
      setOriginPick(null);
      setOriginPickIdx(null);
      setOriginHits(hits);
    } finally {
      setOriginSuggestLoading(false);
    }
  }, [originQuery, prox, places, recentSearches]);

  const refreshDestNow = useCallback(async () => {
    const q = destQuery.trim();
    if (q.length < 2) {
      setDestHits(buildLocalCommuteHits(q, places, recentSearches));
      return;
    }
    setDestSuggestLoading(true);
    try {
      const hits = await fetchCommuteAddressSuggestions(q, prox, places, recentSearches);
      setDestPick(null);
      setDestPickIdx(null);
      setDestHits(hits);
    } finally {
      setDestSuggestLoading(false);
    }
  }, [destQuery, prox, places, recentSearches]);

  const submit = async () => {
    if (commuteCount >= commuteLimit) {
      Alert.alert(
        'Limit reached',
        `You can save up to ${commuteLimit} commute routes on your plan.`,
      );
      return;
    }

    let oLat: number;
    let oLng: number;
    let oLabel: string;

    if (originMode === 'current') {
      if (!locOk) {
        Alert.alert('Location', 'Enable location for a GPS starting point, or choose a typed address instead.');
        return;
      }
      oLat = originLat;
      oLng = originLng;
      oLabel = 'Current location';
    } else if (originMode === 'saved') {
      const sp = placesWithCoords.find((p) => p.id === originPlaceId);
      if (!sp || sp.lat == null || sp.lng == null) {
        Alert.alert('Starting point', 'Pick a saved place, or switch to typed address.');
        return;
      }
      oLat = sp.lat;
      oLng = sp.lng;
      oLabel = sp.name;
    } else {
      if (!originPick) {
        Alert.alert('Starting point', 'Search and select a starting address.');
        return;
      }
      oLat = originPick.lat;
      oLng = originPick.lng;
      oLabel = originPick.address || originPick.name;
    }

    if (!destPick) {
      Alert.alert('Destination', 'Search and select where you are going.');
      return;
    }

    const days = DAYS.filter((d) => dayMap[d.key]).map((d) => d.key);
    if (!days.length) {
      Alert.alert('Days', 'Select at least one day.');
      return;
    }
    const am = Math.max(5, Math.min(parseInt(alertMin, 10) || 120, 24 * 60));
    const monitor = Math.max(15, Math.min(parseInt(monitorMin, 10) || 180, 12 * 60));
    const every = Math.max(5, Math.min(parseInt(notifyEveryMin, 10) || 30, 240));
    const max = Math.max(1, Math.min(parseInt(maxPushes, 10) || 3, 12));
    let tz = 'America/New_York';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz;
    } catch {
      /* noop */
    }
    setSaving(true);
    try {
      await registerCommutePushToken();
      const res = await api.post('/api/commute-routes', {
        name: name.trim() || 'Commute',
        origin_lat: oLat,
        origin_lng: oLng,
        origin_label: oLabel,
        dest_lat: destPick.lat,
        dest_lng: destPick.lng,
        dest_label: destPick.address || destPick.name,
        leave_by_time: leaveBy.trim(),
        tz,
        alert_minutes_before: am,
        monitoring_duration_minutes: monitor,
        notification_interval_minutes: every,
        max_notifications_per_window: max,
        days_of_week: days,
        notifications_enabled: true,
      });
      if (!res.success) {
        Alert.alert('Could not save', res.error || 'Try again.');
        return;
      }
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} scrollable={false}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        <Text style={[styles.title, { color: text }]}>Commute alert</Text>
        <Text style={[styles.sub, { color: sub }]}>
          Set where you leave, where you need to go, and how aggressively SnapRoad should scan for traffic so the app
          can protect your time, fuel, and road stress.
        </Text>

        <Text style={[styles.label, { color: sub }]}>Commute name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Morning commute"
          placeholderTextColor={sub}
          style={[styles.input, { color: text, borderColor: border, backgroundColor: cardBg }]}
        />

        <Text style={[styles.label, { color: sub }]}>Starting point</Text>
        <View style={[styles.segment, { borderColor: border }]}>
          {(['current', 'address', 'saved'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.segBtn, originMode === m && { backgroundColor: `${primary}22` }]}
              onPress={() => {
                setOriginMode(m);
                setOriginPick(null);
                setOriginHits([]);
              }}
            >
              <Text style={{ color: text, fontSize: 12, fontWeight: '700' }}>
                {m === 'current' ? 'GPS' : m === 'address' ? 'Address' : 'Saved'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {originMode === 'saved' ? (
          <View style={{ gap: 8, marginBottom: 12 }}>
            {placesWithCoords.length === 0 ? (
              <Text style={{ color: sub, fontSize: 13 }}>No saved places with pins. Use Address instead.</Text>
            ) : (
              placesWithCoords.map((p) => {
                const sel = originPlaceId === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setOriginPlaceId(p.id)}
                    style={[
                      styles.destRow,
                      { borderColor: sel ? primary : border, backgroundColor: sel ? `${primary}12` : cardBg },
                    ]}
                  >
                    <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={18} color={primary} />
                    <Text style={{ color: text, flex: 1, marginLeft: 8, fontWeight: '600' }} numberOfLines={2}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : null}

        {originMode === 'address' ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: sub, fontSize: 11, marginBottom: 6 }}>
              Type for suggestions — saved places, recent map picks, then Google/Mapbox results (location-biased when GPS
              is available).
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput
                value={originQuery}
                onChangeText={setOriginQuery}
                placeholder="Starting address"
                placeholderTextColor={sub}
                style={[
                  styles.input,
                  { flex: 1, marginBottom: 0, color: text, borderColor: border, backgroundColor: cardBg },
                ]}
              />
              {originSuggestLoading ? <ActivityIndicator color={primary} /> : null}
              <TouchableOpacity
                onPress={() => void refreshOriginNow()}
                style={[styles.geoIconBtn, { borderColor: border, backgroundColor: cardBg }]}
                accessibilityLabel="Refresh address suggestions"
              >
                <Ionicons name="refresh" size={20} color={primary} />
              </TouchableOpacity>
            </View>
            {originHits.map((h, i) => (
              <TouchableOpacity
                key={`o-${h.place_id || ''}-${h.lat}-${h.lng}-${i}`}
                onPress={async () => {
                  const resolved = await resolveCommutePlaceCoords(h);
                  const latOk =
                    Number.isFinite(resolved.lat) &&
                    Number.isFinite(resolved.lng) &&
                    (Math.abs(resolved.lat) > 1e-6 || Math.abs(resolved.lng) > 1e-6);
                  if (!latOk) {
                    Alert.alert('Location', 'Could not resolve this place. Try another suggestion.');
                    return;
                  }
                  setOriginPickIdx(i);
                  setOriginPick({ ...resolved, fromSavedPlaces: h.fromSavedPlaces });
                }}
                style={[
                  styles.hitRow,
                  { borderColor: originPickIdx === i ? primary : border, backgroundColor: cardBg },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {h.fromSavedPlaces ? (
                    <Ionicons name="bookmark" size={16} color={primary} accessibilityLabel="Saved place" />
                  ) : null}
                  <Text style={{ color: text, fontWeight: '600', flex: 1 }} numberOfLines={2}>
                    {h.address || h.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {originMode === 'current' ? (
          <Text style={{ color: sub, fontSize: 13, marginBottom: 12 }}>
            {locOk ? 'Uses your last GPS fix — open Map for the freshest position.' : 'Waiting for GPS. Switch to Address if needed.'}
          </Text>
        ) : null}

        <Text style={[styles.label, { color: sub }]}>Destination</Text>
        <Text style={{ color: sub, fontSize: 11, marginBottom: 6 }}>
          Same smart suggestions as the map search — type a few letters to see results.
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <TextInput
            value={destQuery}
            onChangeText={setDestQuery}
            placeholder="Work, school, or full address"
            placeholderTextColor={sub}
            style={[
              styles.input,
              { flex: 1, marginBottom: 0, color: text, borderColor: border, backgroundColor: cardBg },
            ]}
          />
          {destSuggestLoading ? <ActivityIndicator color={primary} /> : null}
          <TouchableOpacity
            onPress={() => void refreshDestNow()}
            style={[styles.geoIconBtn, { borderColor: border, backgroundColor: cardBg }]}
            accessibilityLabel="Refresh address suggestions"
          >
            <Ionicons name="refresh" size={20} color={primary} />
          </TouchableOpacity>
        </View>
        {destHits.map((h, i) => (
          <TouchableOpacity
            key={`d-${h.place_id || ''}-${h.lat}-${h.lng}-${i}`}
            onPress={async () => {
              const resolved = await resolveCommutePlaceCoords(h);
              const latOk =
                Number.isFinite(resolved.lat) &&
                Number.isFinite(resolved.lng) &&
                (Math.abs(resolved.lat) > 1e-6 || Math.abs(resolved.lng) > 1e-6);
              if (!latOk) {
                Alert.alert('Location', 'Could not resolve this place. Try another suggestion.');
                return;
              }
              setDestPickIdx(i);
              setDestPick({ ...resolved, fromSavedPlaces: h.fromSavedPlaces });
            }}
            style={[styles.hitRow, { borderColor: destPickIdx === i ? primary : border, backgroundColor: cardBg }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {h.fromSavedPlaces ? (
                <Ionicons name="bookmark" size={16} color={primary} accessibilityLabel="Saved place" />
              ) : null}
              <Text style={{ color: text, fontWeight: '600', flex: 1 }} numberOfLines={2}>
                {h.address || h.name}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={[styles.label, { color: sub }]}>Leave by (24h)</Text>
        <TextInput
          value={leaveBy}
          onChangeText={setLeaveBy}
          placeholder="08:00"
          placeholderTextColor={sub}
          style={[styles.input, { color: text, borderColor: border, backgroundColor: cardBg }]}
        />
        <Text style={[styles.label, { color: sub }]}>Alert minutes before leaving</Text>
        <TextInput
          value={alertMin}
          onChangeText={setAlertMin}
          keyboardType="number-pad"
          placeholder="120"
          placeholderTextColor={sub}
          style={[styles.input, { color: text, borderColor: border, backgroundColor: cardBg }]}
        />
        <View style={styles.gridRow}>
          <View style={styles.gridCell}>
            <Text style={[styles.label, { color: sub }]}>Scan for</Text>
            <TextInput
              value={monitorMin}
              onChangeText={setMonitorMin}
              keyboardType="number-pad"
              placeholder="180"
              placeholderTextColor={sub}
              style={[styles.input, { color: text, borderColor: border, backgroundColor: cardBg }]}
            />
          </View>
          <View style={styles.gridCell}>
            <Text style={[styles.label, { color: sub }]}>Every</Text>
            <TextInput
              value={notifyEveryMin}
              onChangeText={setNotifyEveryMin}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor={sub}
              style={[styles.input, { color: text, borderColor: border, backgroundColor: cardBg }]}
            />
          </View>
          <View style={styles.gridCell}>
            <Text style={[styles.label, { color: sub }]}>Max alerts</Text>
            <TextInput
              value={maxPushes}
              onChangeText={setMaxPushes}
              keyboardType="number-pad"
              placeholder="3"
              placeholderTextColor={sub}
              style={[styles.input, { color: text, borderColor: border, backgroundColor: cardBg }]}
            />
          </View>
        </View>
        <Text style={{ color: sub, fontSize: 12, lineHeight: 16, marginTop: -6, marginBottom: 12 }}>
          Minutes: scan window, alert spacing, and max pushes per commute window.
        </Text>
        <Text style={[styles.label, { color: sub }]}>Days</Text>
        <View style={styles.dayRow}>
          {DAYS.map((d) => (
            <TouchableOpacity
              key={d.key}
              onPress={() => toggleDay(d.key)}
              style={[
                styles.dayChip,
                { borderColor: border, backgroundColor: dayMap[d.key] ? `${primary}22` : cardBg },
              ]}
            >
              <Text style={{ color: dayMap[d.key] ? primary : sub, fontWeight: '800', fontSize: 12 }}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ color: sub, fontSize: 12, marginBottom: 8 }}>
          {commuteCount} of {commuteLimit} saved commutes
        </Text>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: primary, opacity: saving ? 0.7 : 1, marginTop: 8 }]}
          onPress={() => void submit()}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save commute'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '900', marginBottom: 6 },
  sub: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  segment: { flexDirection: 'row', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 10 },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  hitRow: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  gridRow: { flexDirection: 'row', gap: 8 },
  gridCell: { flex: 1, minWidth: 0 },
  geoIconBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
