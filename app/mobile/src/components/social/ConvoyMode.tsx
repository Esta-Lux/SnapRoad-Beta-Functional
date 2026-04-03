import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';

interface Member {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
}

interface Destination {
  name: string;
  lat: number;
  lng: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  onStartConvoy: (destination: Destination) => void;
}

export default function ConvoyMode({ visible, onClose, members, onStartConvoy }: Props) {
  const { colors, isLight } = useTheme();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [destName, setDestName] = useState('');
  const [destLat, setDestLat] = useState('');
  const [destLng, setDestLng] = useState('');
  const [starting, setStarting] = useState(false);

  const sheetBg = colors.surface;
  const text = colors.text;
  const sub = colors.textSecondary;
  const border = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';

  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStart = async () => {
    if (selected.size === 0) {
      Alert.alert('Select Members', 'Pick at least one friend for the convoy.');
      return;
    }
    if (!destName.trim()) {
      Alert.alert('Enter Destination', 'Give the destination a name.');
      return;
    }
    const lat = parseFloat(destLat.trim());
    const lng = parseFloat(destLng.trim());
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      Alert.alert('Coordinates', 'Enter valid latitude and longitude (decimal degrees).');
      return;
    }
    if (Math.abs(lat) < 1e-5 && Math.abs(lng) < 1e-5) {
      Alert.alert('Coordinates', 'Destination coordinates cannot be zero — use the real lat/lng.');
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Coordinates', 'Latitude must be −90…90 and longitude −180…180.');
      return;
    }
    const destination = { name: destName.trim(), lat, lng };
    setStarting(true);
    try {
      const res = await api.post<{ success?: boolean; data?: { convoy_id?: string | null; destination?: Destination } }>(
        '/api/social/convoy/start',
        {
          member_ids: Array.from(selected),
          destination_name: destination.name,
          destination_lat: lat,
          destination_lng: lng,
        },
      );
      if (!res.success) {
        Alert.alert('Convoy', res.error ?? 'Could not start convoy. Try again.');
        return;
      }
      const body = res.data;
      if (!body?.success) {
        Alert.alert('Convoy', 'Could not start convoy.');
        return;
      }
      const dest = body.data?.destination ?? destination;
      onStartConvoy(dest);
      reset();
      onClose();
    } catch {
      Alert.alert('Convoy', 'Network error. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const reset = () => {
    setSelected(new Set());
    setDestName('');
    setDestLat('');
    setDestLng('');
    setStarting(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => { reset(); onClose(); }}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { reset(); onClose(); }}>
        <View style={[styles.sheet, { backgroundColor: sheetBg, borderColor: border }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.handle, { backgroundColor: sub }]} />

          <View style={styles.titleRow}>
            <Ionicons name="car-sport" size={22} color={colors.primary} />
            <Text style={[styles.title, { color: text }]}>Friend Convoy</Text>
          </View>

          <Text style={[styles.label, { color: sub }]}>Select Members</Text>
          {members.length === 0 ? (
            <Text style={[styles.emptyText, { color: sub }]}>No friends on the map yet — connect under Social.</Text>
          ) : (
            <FlatList
              data={members}
              keyExtractor={(m) => m.id}
              style={styles.memberList}
              renderItem={({ item }) => {
                const isSelected = selected.has(item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.memberRow,
                      { borderColor: border },
                      isSelected && { backgroundColor: isLight ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.2)' },
                    ]}
                    onPress={() => toggleMember(item.id)}
                  >
                    <View style={[styles.checkbox, { borderColor: sub }, isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.memberName, { color: text }]}>{item.name}</Text>
                      {item.lat != null && item.lng != null && (
                        <Text style={[styles.memberCoord, { color: sub }]}>
                          {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                        </Text>
                      )}
                    </View>
                    {isSelected && <Ionicons name="navigate" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <Text style={[styles.label, { marginTop: 16, color: sub }]}>Destination</Text>
          <TextInput
            style={[styles.input, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', color: text, borderColor: border }]}
            placeholder="Destination name"
            placeholderTextColor={sub}
            value={destName}
            onChangeText={setDestName}
          />
          <View style={styles.coordRow}>
            <TextInput
              style={[styles.input, styles.coordInput, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', color: text, borderColor: border }]}
              placeholder="Lat"
              placeholderTextColor={sub}
              value={destLat}
              onChangeText={setDestLat}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              style={[styles.input, styles.coordInput, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', color: text, borderColor: border }]}
              placeholder="Lng"
              placeholderTextColor={sub}
              value={destLng}
              onChangeText={setDestLng}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <Text style={[styles.selectedCount, { color: sub }]}>
            {selected.size} member{selected.size !== 1 ? 's' : ''} selected · Shared route starts after you confirm on the map
          </Text>

          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.primary }, (selected.size === 0 || !destName.trim() || starting) && { opacity: 0.5 }]}
            onPress={handleStart}
            disabled={selected.size === 0 || !destName.trim() || starting}
          >
            {starting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={styles.startBtnText}>Start Convoy</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '85%',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  memberList: { maxHeight: 200 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberCoord: { fontSize: 11, marginTop: 2 },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth },
  coordRow: { flexDirection: 'row', gap: 10 },
  coordInput: { flex: 1 },
  selectedCount: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 16 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
