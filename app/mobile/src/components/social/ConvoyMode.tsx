import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [destName, setDestName] = useState('');
  const [destLat, setDestLat] = useState('');
  const [destLng, setDestLng] = useState('');

  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStart = () => {
    if (selected.size === 0) {
      Alert.alert('Select Members', 'Pick at least one family member for the convoy.');
      return;
    }
    if (!destName.trim()) {
      Alert.alert('Enter Destination', 'Give the destination a name.');
      return;
    }
    const lat = parseFloat(destLat) || 0;
    const lng = parseFloat(destLng) || 0;
    onStartConvoy({ name: destName.trim(), lat, lng });
    reset();
    onClose();
  };

  const reset = () => {
    setSelected(new Set());
    setDestName('');
    setDestLat('');
    setDestLng('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => { reset(); onClose(); }}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { reset(); onClose(); }}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Ionicons name="car-sport" size={22} color="#3B82F6" />
            <Text style={styles.title}>Family Convoy</Text>
          </View>

          <Text style={styles.label}>Select Members</Text>
          {members.length === 0 ? (
            <Text style={styles.emptyText}>No family members found</Text>
          ) : (
            <FlatList
              data={members}
              keyExtractor={(m) => m.id}
              style={styles.memberList}
              renderItem={({ item }) => {
                const isSelected = selected.has(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.memberRow, isSelected && styles.memberRowSelected]}
                    onPress={() => toggleMember(item.id)}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.memberName}>{item.name}</Text>
                      {item.lat != null && item.lng != null && (
                        <Text style={styles.memberCoord}>
                          {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                        </Text>
                      )}
                    </View>
                    {isSelected && <Ionicons name="navigate" size={16} color="#3B82F6" />}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <Text style={[styles.label, { marginTop: 16 }]}>Destination</Text>
          <TextInput
            style={styles.input}
            placeholder="Destination name"
            placeholderTextColor="#64748b"
            value={destName}
            onChangeText={setDestName}
          />
          <View style={styles.coordRow}>
            <TextInput
              style={[styles.input, styles.coordInput]}
              placeholder="Lat"
              placeholderTextColor="#64748b"
              value={destLat}
              onChangeText={setDestLat}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.coordInput]}
              placeholder="Lng"
              placeholderTextColor="#64748b"
              value={destLng}
              onChangeText={setDestLng}
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.selectedCount}>
            {selected.size} member{selected.size !== 1 ? 's' : ''} selected
          </Text>

          <TouchableOpacity
            style={[styles.startBtn, (selected.size === 0 || !destName.trim()) && { opacity: 0.5 }]}
            onPress={handleStart}
            disabled={selected.size === 0 || !destName.trim()}
          >
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.startBtnText}>Start Convoy</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '85%' },
  handle: { width: 36, height: 4, backgroundColor: '#475569', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#f8fafc' },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  memberList: { maxHeight: 200 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  memberRowSelected: { backgroundColor: 'rgba(59,130,246,0.12)' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#475569', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  memberName: { color: '#f8fafc', fontSize: 15, fontWeight: '600' },
  memberCoord: { color: '#64748b', fontSize: 11, marginTop: 2 },
  input: { backgroundColor: 'rgba(148,163,184,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#f8fafc', fontSize: 15, marginBottom: 10 },
  coordRow: { flexDirection: 'row', gap: 10 },
  coordInput: { flex: 1 },
  selectedCount: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3B82F6', borderRadius: 14, paddingVertical: 16 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
