import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';

interface Member {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  is_sharing?: boolean;
  speed_mph?: number;
  sos_active?: boolean;
  role?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  isLight?: boolean;
}

let MapboxGL: any = null;
let isMapAvailable: () => boolean = () => false;
try {
  const mbx = require('../../utils/mapbox');
  MapboxGL = mbx.default;
  isMapAvailable = mbx.isMapAvailable;
} catch {}

export default function FamilyCommandCenter({ visible, onClose, userId, isLight }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bg = isLight ? '#f5f5f7' : '#0f172a';
  const cardBg = isLight ? '#fff' : '#1e293b';
  const text = isLight ? '#1a1a1a' : '#f8fafc';
  const sub = isLight ? '#6a6a7a' : '#94a3b8';

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>('/api/family/members');
      const raw = (res.data as any)?.data ?? res.data;
      const mems = Array.isArray(raw) ? raw : (raw as any)?.members ?? [];
      setMembers(mems);
    } catch {
      setError('Failed to load family members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) loadMembers();
  }, [visible, loadMembers]);

  const handleGeofence = () => {
    Alert.alert('Coming Soon', 'Geofence alerts will be available in a future update.');
  };

  const sharingMembers = members.filter((m) => m.lat != null && m.lng != null);
  const centerCoord: [number, number] = sharingMembers.length > 0
    ? [sharingMembers[0].lng!, sharingMembers[0].lat!]
    : [-82.9988, 39.9612];

  const renderMemberItem = ({ item }: { item: Member }) => {
    const online = item.is_sharing !== false && item.lat != null;
    const initial = (item.name ?? 'U')[0].toUpperCase();
    return (
      <View style={[styles.memberCard, { backgroundColor: cardBg }]}>
        <View style={[styles.avatar, item.sos_active && { backgroundColor: '#EF4444' }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.memberName, { color: text }]}>{item.name}</Text>
          <Text style={{ color: sub, fontSize: 12 }}>
            {item.sos_active ? 'SOS ACTIVE' : online ? `Online${(item.speed_mph ?? 0) > 3 ? ` · ${Math.round(item.speed_mph!)} mph` : ''}` : 'Offline'}
          </Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: item.sos_active ? '#EF4444' : online ? '#22C55E' : '#64748b' }]} />
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={26} color={text} />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Ionicons name="radio-outline" size={20} color="#3B82F6" />
            <Text style={[styles.headerTitle, { color: text }]}>Command Center</Text>
          </View>
          <TouchableOpacity onPress={loadMembers} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="refresh" size={22} color={sub} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={[styles.loadingText, { color: sub }]}>Loading members...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="warning-outline" size={40} color="#EF4444" />
            <Text style={[styles.errorText, { color: text }]}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadMembers}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Map area */}
            <View style={[styles.mapContainer, { backgroundColor: cardBg }]}>
              {isMapAvailable() && MapboxGL ? (
                <MapboxGL.MapView
                  style={styles.map}
                  styleURL={MapboxGL.StyleURL.Street}
                  logoEnabled={false}
                  attributionEnabled={false}
                >
                  <MapboxGL.Camera zoomLevel={11} centerCoordinate={centerCoord} />
                  {sharingMembers.map((m) => {
                    const MBPointAnnotation = MapboxGL!.PointAnnotation;
                    return (
                      <MBPointAnnotation key={m.id} id={`cc-${m.id}`} coordinate={[m.lng!, m.lat!]}>
                        <View style={[styles.mapDot, m.sos_active && { backgroundColor: '#EF4444' }]}>
                          <Text style={styles.mapDotText}>{(m.name ?? 'U')[0]}</Text>
                        </View>
                      </MBPointAnnotation>
                    );
                  })}
                </MapboxGL.MapView>
              ) : (
                <View style={[styles.map, styles.mapFallback]}>
                  <Ionicons name="map-outline" size={32} color="#475569" />
                  <Text style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>Map requires dev build</Text>
                  {sharingMembers.map((m) => (
                    <Text key={m.id} style={{ color: '#3B82F6', fontSize: 11, marginTop: 4 }}>
                      {m.name}: {m.lat?.toFixed(4)}, {m.lng?.toFixed(4)}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {/* Members list */}
            <View style={{ flex: 1 }}>
              <View style={styles.sectionRow}>
                <Text style={[styles.sectionTitle, { color: text }]}>
                  Members ({members.length})
                </Text>
                <TouchableOpacity style={styles.geofenceBtn} onPress={handleGeofence}>
                  <Ionicons name="location-outline" size={16} color="#3B82F6" />
                  <Text style={styles.geofenceBtnText}>Geofence</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={members}
                keyExtractor={(m) => m.id}
                renderItem={renderMemberItem}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
              />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, marginTop: 8 },
  errorText: { fontSize: 16, fontWeight: '600' },
  retryBtn: { backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  mapContainer: { margin: 16, borderRadius: 16, overflow: 'hidden', height: 240, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  map: { flex: 1 },
  mapFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  mapDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  mapDotText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  geofenceBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(59,130,246,0.12)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  geofenceBtnText: { color: '#3B82F6', fontSize: 13, fontWeight: '600' },
  memberCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  memberName: { fontSize: 15, fontWeight: '700' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
});
