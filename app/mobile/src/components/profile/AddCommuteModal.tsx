import React, { useCallback, useMemo, useState } from 'react';
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
import { forwardGeocode, type GeocodeResult } from '../../lib/directions';

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
  const [dayMap, setDayMap] = useState<Record<string, boolean>>(() =>
    DAYS.reduce((a, d) => ({ ...a, [d.key]: true }), {} as Record<string, boolean>),
  );
  const [saving, setSaving] = useState(false);

  const [originMode, setOriginMode] = useState<'current' | 'address' | 'saved'>('current');
  const [originPlaceId, setOriginPlaceId] = useState<number | null>(null);
  const [originQuery, setOriginQuery] = useState('');
  const [originHits, setOriginHits] = useState<GeocodeResult[]>([]);
  const [originPick, setOriginPick] = useState<GeocodeResult | null>(null);
  const [originPickIdx, setOriginPickIdx] = useState<number | null>(null);

  const [destQuery, setDestQuery] = useState('');
  const [destHits, setDestHits] = useState<GeocodeResult[]>([]);
  const [destPick, setDestPick] = useState<GeocodeResult | null>(null);
  const [destPickIdx, setDestPickIdx] = useState<number | null>(null);

  const [geBusy, setGeBusy] = useState<null | 'origin' | 'dest'>(null);

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

  const searchOrigin = useCallback(async () => {
    const q = originQuery.trim();
    if (q.length < 3) {
      Alert.alert('Address', 'Enter at least 3 characters for the starting point.');
      return;
    }
    setGeBusy('origin');
    try {
      const hits = await forwardGeocode(q, prox, 8);
      setOriginPick(null);
      setOriginPickIdx(null);
      setOriginHits(hits);
      if (hits.length === 0) Alert.alert('No matches', 'Try a fuller street address or city.');
    } finally {
      setGeBusy(null);
    }
  }, [originQuery, prox]);

  const searchDest = useCallback(async () => {
    const q = destQuery.trim();
    if (q.length < 3) {
      Alert.alert('Address', 'Enter at least 3 characters for the destination.');
      return;
    }
    setGeBusy('dest');
    try {
      const hits = await forwardGeocode(q, prox, 8);
      setDestPick(null);
      setDestPickIdx(null);
      setDestHits(hits);
      if (hits.length === 0) Alert.alert('No matches', 'Try a fuller street address or city.');
    } finally {
      setGeBusy(null);
    }
  }, [destQuery, prox]);

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
    let tz = 'America/New_York';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz;
    } catch {
      /* noop */
    }
    setSaving(true);
    try {
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
          Name your commute and set start and destination with addresses (no map favorites required). Premium gets
          richer commute pushes when it is time to leave.
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
              <TouchableOpacity
                onPress={() => void searchOrigin()}
                style={[styles.geoBtn, { backgroundColor: primary }]}
                disabled={geBusy === 'origin'}
              >
                {geBusy === 'origin' ? <ActivityIndicator color="#fff" /> : <Text style={styles.geoBtnText}>Search</Text>}
              </TouchableOpacity>
            </View>
            {originHits.map((h, i) => (
              <TouchableOpacity
                key={`${h.lat}-${h.lng}-${i}`}
                onPress={() => {
                  setOriginPickIdx(i);
                  setOriginPick(h);
                }}
                style={[
                  styles.hitRow,
                  { borderColor: originPickIdx === i ? primary : border, backgroundColor: cardBg },
                ]}
              >
                <Text style={{ color: text, fontWeight: '600' }} numberOfLines={2}>
                  {h.address || h.name}
                </Text>
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
          <TouchableOpacity
            onPress={() => void searchDest()}
            style={[styles.geoBtn, { backgroundColor: primary }]}
            disabled={geBusy === 'dest'}
          >
            {geBusy === 'dest' ? <ActivityIndicator color="#fff" /> : <Text style={styles.geoBtnText}>Search</Text>}
          </TouchableOpacity>
        </View>
        {destHits.map((h, i) => (
          <TouchableOpacity
            key={`d-${h.lat}-${h.lng}-${i}`}
            onPress={() => {
              setDestPickIdx(i);
              setDestPick(h);
            }}
            style={[styles.hitRow, { borderColor: destPickIdx === i ? primary : border, backgroundColor: cardBg }]}
          >
            <Text style={{ color: text, fontWeight: '600' }} numberOfLines={2}>
              {h.address || h.name}
            </Text>
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
  geoBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  geoBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
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
