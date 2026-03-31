import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Share, Modal,
} from 'react-native';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import MemberCard from './MemberCard';
import ActivityFeed from './ActivityFeed';
import Skeleton from '../common/Skeleton';
import type { FamilyMember, FamilyEvent, FamilyGroup } from '../../types';

interface Props {
  userId: string;
  isLight: boolean;
}

export default function FamilyDashboard({ userId, isLight }: Props) {
  const [group, setGroup] = useState<FamilyGroup | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [memberTrips, setMemberTrips] = useState<any[]>([]);
  const [memberStats, setMemberStats] = useState<any>(null);
  // Teen controls
  const [speedThreshold, setSpeedThreshold] = useState(70);
  const [curfewTime, setCurfewTime] = useState('22:00');
  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState(true);
  const bg = isLight ? '#f5f5f7' : '#0a0a0f';
  const cardBg = isLight ? '#fff' : '#1a1a24';
  const text = isLight ? '#1a1a1a' : '#fff';
  const sub = isLight ? '#6a6a7a' : '#a0a0b0';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<any>('/api/family/members');
      const raw = (res.data as any)?.data ?? res.data;
      if (raw && typeof raw === 'object') {
        const gid = (raw as any).group_id ?? (raw as any).id;
        const mems = Array.isArray(raw) ? raw : (raw as any).members ?? [];
        setMembers(mems);
        if (gid) {
          setGroup({ id: gid, name: (raw as any).group_name ?? 'My Family', invite_code: (raw as any).invite_code ?? '', created_by: (raw as any).created_by ?? '', members: mems });
          try {
            const evRes = await api.get<any>(`/api/family/group/${gid}/events?limit=20`);
            const evData = (evRes.data as any)?.data ?? evRes.data;
            setEvents(Array.isArray(evData) ? evData : []);
          } catch {
            setEvents([]);
          }
        }
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const refreshEvents = useCallback(async () => {
    if (!group?.id) return;
    setEventsLoading(true);
    const res = await api.get<any>(`/api/family/group/${group.id}/events?limit=20`);
    const data = (res.data as any)?.data ?? res.data;
    setEvents(Array.isArray(data) ? data : []);
    setEventsLoading(false);
  }, [group?.id]);

  const handleSOS = useCallback(async () => {
    Alert.alert('SOS Alert', 'Send emergency alert to all family members?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send SOS', style: 'destructive', onPress: async () => {
        await api.post('/api/family/sos', { lat: 0, lng: 0 });
        Alert.alert('SOS Sent', 'All family members have been alerted.');
      }},
    ]);
  }, []);

  const handleCheckIn = useCallback(async () => {
    await api.post('/api/family/checkin');
    Alert.alert('Checked In', "Your family knows you're OK.");
  }, []);

  const handleShareCode = useCallback(async () => {
    if (!group?.invite_code) return;
    await Share.share({ message: `Join my SnapRoad family! Code: ${group.invite_code}` });
  }, [group?.invite_code]);

  const openMemberDetail = useCallback(async (m: FamilyMember) => {
    setSelectedMember(m);
    setMemberTrips([]);
    setMemberStats(null);
    try {
      const [tripRes, statsRes] = await Promise.all([
        api.get<any>(`/api/family/member/${m.id}/trips?date=today`),
        api.get<any>(`/api/family/member/${m.id}/stats`),
      ]);
      setMemberTrips(Array.isArray((tripRes.data as any)?.data) ? (tripRes.data as any).data : []);
      setMemberStats((statsRes.data as any)?.data ?? statsRes.data ?? null);
    } catch {}
  }, []);

  const handleUpdateTeenControls = useCallback(async (memberId: string) => {
    await api.put(`/api/family/member/${memberId}/notifications`, {
      speed_threshold_mph: speedThreshold,
      curfew_time: curfewTime,
      weekly_report: weeklyReportEnabled,
    });
    Alert.alert('Saved', 'Teen controls updated.');
  }, [speedThreshold, curfewTime, weeklyReportEnabled]);

  if (loading) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <Skeleton width="60%" height={20} />
        <Skeleton width="100%" height={120} borderRadius={12} />
        <Skeleton width="100%" height={80} borderRadius={12} />
      </View>
    );
  }

  if (!group) return null;

  const isAdmin = group.created_by === userId || members.some((m) => m.id === userId && m.role === 'admin');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBg }]}>
        <View>
          <Text style={[styles.groupName, { color: text }]}>{group.name}</Text>
          <Text style={[styles.memberCount, { color: sub }]}>{members.length} members</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity onPress={handleShareCode} style={styles.inviteBtn}>
            <Ionicons name="person-add-outline" size={16} color="#3B82F6" />
            <Text style={styles.inviteBtnText}>Invite</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Live map */}
      <View style={[styles.mapCard, { backgroundColor: cardBg }]}>
        <Text style={[styles.sectionTitle, { color: text }]}>Live Locations</Text>
        <View style={styles.mapContainer}>
          {isMapAvailable() && MapboxGL ? (
            <MapboxGL.MapView style={styles.miniMap} styleURL={MapboxGL.StyleURL.Street} logoEnabled={false} attributionEnabled={false} scrollEnabled={false} zoomEnabled={false}>
              <MapboxGL.Camera zoomLevel={11} centerCoordinate={[
                members.find((m) => m.lng)?.lng ?? -82.9988,
                members.find((m) => m.lat)?.lat ?? 39.9612,
              ]} />
              {members.filter((m) => m.lat && m.lng && m.is_sharing).map((m) => {
                const MBPointAnnotation = MapboxGL!.PointAnnotation;
                return (
                  <MBPointAnnotation key={m.id} id={`fam-${m.id}`} coordinate={[m.lng!, m.lat!]}>
                    <View style={[styles.mapDot, { backgroundColor: m.sos_active ? '#EF4444' : '#3B82F6' }]}>
                      <Text style={styles.mapDotText}>{(m.name ?? 'U')[0]}</Text>
                    </View>
                  </MBPointAnnotation>
                );
              })}
            </MapboxGL.MapView>
          ) : (
            <View style={[styles.miniMap, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }]}>
              <Text style={{ color: '#888', fontSize: 13, textAlign: 'center' }}>Map requires dev build</Text>
              {members.filter((m) => m.lat && m.lng && m.is_sharing).map((m) => (
                <Text key={m.id} style={{ color: '#3B82F6', fontSize: 11, marginTop: 4 }}>{m.name}: sharing</Text>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Member cards */}
      <Text style={[styles.sectionTitle, { color: text, paddingHorizontal: 16, marginTop: 16 }]}>Members</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberScroll}>
        {members.map((m) => <MemberCard key={m.id} member={m} onPress={openMemberDetail} isLight={isLight} />)}
      </ScrollView>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.sosBtn]} onPress={handleSOS}>
          <Ionicons name="shield-outline" size={18} color="#fff" />
          <Text style={styles.sosBtnText}>SOS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.checkinBtn]} onPress={handleCheckIn}>
          <Text style={styles.checkinBtnText}>Check In</Text>
        </TouchableOpacity>
      </View>

      {/* Teen controls (admin only) */}
      {isAdmin && (
        <View style={[styles.teenSection, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: text }]}>Teen Controls</Text>
          <View style={styles.teenRow}>
            <Text style={[styles.teenLabel, { color: text }]}>Speed alert: {speedThreshold} mph</Text>
            <TextInput style={[styles.teenInput, { color: text, borderColor: sub }]}
              value={String(speedThreshold)} onChangeText={(v) => setSpeedThreshold(Number(v) || 70)}
              keyboardType="numeric" />
          </View>
          <View style={styles.teenRow}>
            <Text style={[styles.teenLabel, { color: text }]}>Curfew time</Text>
            <TextInput style={[styles.teenInput, { color: text, borderColor: sub }]}
              value={curfewTime} onChangeText={setCurfewTime} />
          </View>
          <View style={styles.teenRow}>
            <Text style={[styles.teenLabel, { color: text }]}>Weekly driving report</Text>
            <TouchableOpacity onPress={() => setWeeklyReportEnabled(!weeklyReportEnabled)}>
              <Text style={{ color: weeklyReportEnabled ? '#22C55E' : '#EF4444', fontWeight: '700' }}>
                {weeklyReportEnabled ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
          {members.filter((m) => m.role === 'teen').map((m) => (
            <TouchableOpacity key={m.id} style={styles.teenSaveBtn} onPress={() => handleUpdateTeenControls(m.id)}>
              <Text style={styles.teenSaveBtnText}>Save for {m.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Activity feed */}
      <View style={[styles.feedSection, { backgroundColor: cardBg }]}>
        <Text style={[styles.sectionTitle, { color: text }]}>Activity</Text>
        <ActivityFeed events={events} isLoading={eventsLoading} onRefresh={refreshEvents} isLight={isLight} />
      </View>

      {/* Member detail modal */}
      <Modal visible={!!selectedMember} animationType="slide" transparent onRequestClose={() => setSelectedMember(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedMember(null)}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            {selectedMember && (
              <>
                <Text style={[styles.modalName, { color: text }]}>{selectedMember.name}</Text>
                <Text style={[styles.modalRole, { color: sub }]}>{selectedMember.role ?? 'Member'}</Text>
                <Text style={[styles.modalSection, { color: text }]}>Today's Trips</Text>
                {memberTrips.length === 0 ? (
                  <Text style={{ color: sub, fontSize: 13, paddingVertical: 8 }}>No trips today</Text>
                ) : (
                  memberTrips.slice(0, 5).map((t: any, i: number) => (
                    <View key={i} style={styles.tripRow}>
                      <Text style={{ color: text, fontSize: 13 }}>{t.origin ?? 'Start'} {'→'} {t.destination ?? 'End'}</Text>
                      <Text style={{ color: sub, fontSize: 11 }}>{t.distance_miles?.toFixed(1)} mi · {t.duration_minutes} min</Text>
                    </View>
                  ))
                )}
                <Text style={[styles.modalSection, { color: text }]}>7-Day Stats</Text>
                {memberStats ? (
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}><Text style={{ color: text, fontWeight: '800', fontSize: 18 }}>{memberStats.total_miles?.toFixed(0) ?? 0}</Text><Text style={{ color: sub, fontSize: 11 }}>Miles</Text></View>
                    <View style={styles.statBox}><Text style={{ color: text, fontWeight: '800', fontSize: 18 }}>{memberStats.total_trips ?? 0}</Text><Text style={{ color: sub, fontSize: 11 }}>Trips</Text></View>
                    <View style={styles.statBox}><Text style={{ color: '#22C55E', fontWeight: '800', fontSize: 18 }}>{memberStats.avg_safety_score ?? '--'}</Text><Text style={{ color: sub, fontSize: 11 }}>Safety</Text></View>
                  </View>
                ) : (
                  <Skeleton width="100%" height={60} borderRadius={12} />
                )}
                <Text style={[styles.modalSection, { color: text }]}>Notifications</Text>
                {[
                  { key: 'notify_arrival_home', label: 'Arrives at Home' },
                  { key: 'notify_departure_school', label: 'Leaves School' },
                  { key: 'notify_start_driving', label: 'Starts driving' },
                ].map((pref) => (
                  <View key={pref.key} style={styles.notifRow}>
                    <Ionicons name="notifications-outline" size={14} color={sub} />
                    <Text style={{ color: text, fontSize: 13, flex: 1, marginLeft: 8 }}>{pref.label}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, margin: 16, marginBottom: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  groupName: { fontSize: 20, fontWeight: '800' },
  memberCount: { fontSize: 12, marginTop: 2 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  inviteBtnText: { color: '#3B82F6', fontSize: 13, fontWeight: '600' },
  mapCard: { margin: 16, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  mapContainer: { height: 180, borderRadius: 12, overflow: 'hidden' },
  miniMap: { flex: 1 },
  mapDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  mapDotText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8, paddingHorizontal: 16 },
  memberScroll: { paddingHorizontal: 16, gap: 10, paddingBottom: 8 },
  quickActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginVertical: 12 },
  sosBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 14 },
  sosBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  checkinBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 14 },
  checkinBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  teenSection: { margin: 16, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  teenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  teenLabel: { fontSize: 14, fontWeight: '600' },
  teenInput: { width: 70, textAlign: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: 6, fontSize: 14, fontWeight: '600' },
  teenSaveBtn: { backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  teenSaveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  feedSection: { margin: 16, borderRadius: 12, overflow: 'hidden', maxHeight: 300, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '80%' },
  modalHandle: { width: 36, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalName: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  modalRole: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  modalSection: { fontSize: 15, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  tripRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)' },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(128,128,128,0.08)', borderRadius: 12, padding: 12 },
  notifRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.15)' },
});
