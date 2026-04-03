import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Modal from '../common/Modal';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import type { SavedLocation } from '../../types';

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
  onCreated,
}: Props) {
  const [name, setName] = useState('My commute');
  const [leaveBy, setLeaveBy] = useState('08:00');
  const [alertMin, setAlertMin] = useState('120');
  const [dayMap, setDayMap] = useState<Record<string, boolean>>(() =>
    DAYS.reduce((a, d) => ({ ...a, [d.key]: true }), {} as Record<string, boolean>),
  );
  const [destId, setDestId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const destOptions = useMemo(
    () => places.filter((p) => p.lat != null && p.lng != null && Number.isFinite(p.lat) && Number.isFinite(p.lng)),
    [places],
  );

  const toggleDay = (key: string) => {
    setDayMap((m) => ({ ...m, [key]: !m[key] }));
  };

  const submit = async () => {
    const dest = destOptions.find((p) => p.id === destId);
    if (!dest || dest.lat == null || dest.lng == null) {
      Alert.alert('Destination required', 'Pick a saved place with a map pin (add it from the map first).');
      return;
    }
    if (Math.abs(originLat) < 1e-6 && Math.abs(originLng) < 1e-6) {
      Alert.alert('Location', 'We need your current location for the starting point. Enable location and try again.');
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
        origin_lat: originLat,
        origin_lng: originLng,
        origin_label: 'Starting point',
        dest_lat: dest.lat,
        dest_lng: dest.lng,
        dest_label: dest.name,
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
    <Modal visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: text }]}>Commute alert</Text>
      <Text style={[styles.sub, { color: sub }]}>
        Starting point uses your current GPS. Pick a saved destination, leave-by time, and days.
      </Text>
      <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, { color: sub }]}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Morning commute"
          placeholderTextColor={sub}
          style={[styles.input, { color: text, borderColor: border, backgroundColor: cardBg }]}
        />
        <Text style={[styles.label, { color: sub }]}>Destination (saved place)</Text>
        <View style={{ gap: 8, marginBottom: 12 }}>
          {destOptions.length === 0 ? (
            <Text style={{ color: sub, fontSize: 13 }}>Add a favorite or place from the map first.</Text>
          ) : (
            destOptions.map((p) => {
              const sel = destId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setDestId(p.id)}
                  style={[
                    styles.destRow,
                    { borderColor: sel ? primary : border, backgroundColor: sel ? `${primary}12` : cardBg },
                  ]}
                >
                  <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={18} color={primary} />
                  <Text style={{ color: text, flex: 1, marginLeft: 8, fontWeight: '600' }} numberOfLines={1}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
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
          {DAYS.map((d, i) => (
            <TouchableOpacity
              key={`${d.key}-${i}`}
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
      </ScrollView>
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: primary, opacity: saving ? 0.7 : 1 }]}
        onPress={() => void submit()}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save commute'}</Text>
      </TouchableOpacity>
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
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
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
