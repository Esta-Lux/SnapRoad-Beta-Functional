import React, { useEffect, useState, useCallback, memo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Alert,
  TextInput, RefreshControl, Switch, ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import SnapRaceMode from '../components/social/SnapRaceMode';
import Skeleton from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import type { Friend } from '../types';

type Section = 'friends' | 'family';

const FriendRow = memo(function FriendRow({
  friend, cardBg, text, sub, onPress,
}: { friend: Friend; cardBg: string; text: string; sub: string; onPress: (f: Friend) => void }) {
  const initials = (friend.name ?? 'U').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const online = friend.status === 'accepted' && friend.is_sharing;
  return (
    <TouchableOpacity style={[styles.friendCard, { backgroundColor: cardBg }]} onPress={() => onPress(friend)} activeOpacity={0.7}>
      <View style={styles.friendAvatar}><Text style={styles.friendInitials}>{initials}</Text></View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.friendName, { color: text }]}>{friend.name}</Text>
        <Text style={{ color: sub, fontSize: 12 }}>
          {online && (friend.speed_mph ?? 0) > 3 ? `Driving · ${Math.round(friend.speed_mph ?? 0)} mph` : online ? 'Online' : friend.status === 'pending' ? 'Pending' : 'Offline'}
        </Text>
      </View>
      {online && <View style={styles.onlineDot} />}
    </TouchableOpacity>
  );
});

const MOCK_FAMILY = [
  { id: '1', name: 'Mom', status: 'Online', speed: 0, battery: 92, avatar: 'M', color: '#EC4899' },
  { id: '2', name: 'Dad', status: 'Driving · 42 mph', speed: 42, battery: 78, avatar: 'D', color: '#3B82F6' },
  { id: '3', name: 'Alex', status: 'At school', speed: 0, battery: 65, avatar: 'A', color: '#10B981' },
  { id: '4', name: 'Sam', status: 'Offline', speed: 0, battery: 34, avatar: 'S', color: '#F59E0B' },
];

const MOCK_EVENTS = [
  { id: '1', icon: 'home-outline', text: 'Mom arrived home', time: '2 min ago', color: '#10B981' },
  { id: '2', icon: 'car-outline', text: 'Dad started driving', time: '8 min ago', color: '#3B82F6' },
  { id: '3', icon: 'school-outline', text: 'Alex arrived at school', time: '32 min ago', color: '#F59E0B' },
];

function FamilyPreview({ colors, isLight }: { colors: ReturnType<typeof useTheme>['colors']; isLight: boolean }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={styles.previewOverlayBadge}>
        <LinearGradient colors={['#7C3AED', '#5B21B6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.comingSoonPill}>
          <Ionicons name="time-outline" size={12} color="#fff" />
          <Text style={styles.comingSoonPillText}>COMING SOON</Text>
        </LinearGradient>
      </View>

      <View style={{ backgroundColor: 'rgba(124,58,237,0.08)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginHorizontal: 16, marginBottom: 8 }}>
        <Text style={{ color: '#7C3AED', fontSize: 11, fontWeight: '600', textAlign: 'center' }}>Preview data shown below -- real family tracking coming soon</Text>
      </View>
      <Text style={[styles.previewSection, { color: colors.text }]}>Family Members</Text>
      {MOCK_FAMILY.map((m) => (
        <Animated.View key={m.id} entering={FadeInDown.duration(300).delay(Number(m.id) * 80)}>
          <View style={[styles.mockMemberCard, { backgroundColor: isLight ? '#fff' : 'rgba(255,255,255,0.05)', borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }]}>
            <View style={[styles.mockAvatar, { backgroundColor: m.color }]}>
              <Text style={styles.mockAvatarText}>{m.avatar}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mockName, { color: colors.text }]}>{m.name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{m.status}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="battery-half-outline" size={14} color={m.battery > 50 ? '#34C759' : '#FF9500'} />
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>{m.battery}%</Text>
              </View>
              {m.speed > 0 && (
                <Text style={{ color: '#3B82F6', fontSize: 10, fontWeight: '700' }}>{m.speed} mph</Text>
              )}
            </View>
          </View>
        </Animated.View>
      ))}

      {/* Mock map placeholder */}
      <Text style={[styles.previewSection, { color: colors.text, marginTop: 16 }]}>Live Map</Text>
      <View style={[styles.mockMapCard, { backgroundColor: isLight ? '#e8edf4' : '#1a1a2e' }]}>
        <View style={styles.mockMapPins}>
          {MOCK_FAMILY.slice(0, 3).map((m, i) => (
            <View key={m.id} style={[styles.mockMapPin, { backgroundColor: m.color, left: 30 + i * 70, top: 20 + (i % 2) * 40 }]}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{m.avatar}</Text>
            </View>
          ))}
          <View style={[styles.mockMapRoute, { left: 40, top: 50 }]} />
        </View>
        <View style={styles.mockMapOverlay}>
          <Ionicons name="map-outline" size={24} color={isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)'} />
          <Text style={{ color: isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '600', marginTop: 4 }}>Family live tracking</Text>
        </View>
      </View>

      {/* Mock activity feed */}
      <Text style={[styles.previewSection, { color: colors.text, marginTop: 16 }]}>Activity Feed</Text>
      {MOCK_EVENTS.map((e) => (
        <View key={e.id} style={[styles.mockEventRow, { backgroundColor: isLight ? '#fff' : 'rgba(255,255,255,0.04)', borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }]}>
          <View style={[styles.mockEventIcon, { backgroundColor: `${e.color}18` }]}>
            <Ionicons name={e.icon as any} size={16} color={e.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[{ color: colors.text, fontSize: 13, fontWeight: '600' }]}>{e.text}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{e.time}</Text>
          </View>
        </View>
      ))}

      {/* Feature highlights */}
      <Text style={[styles.previewSection, { color: colors.text, marginTop: 16 }]}>Family Features</Text>
      <View style={[styles.featureGrid]}>
        {[
          { icon: 'locate-outline', label: 'Live Tracking', desc: 'Real-time family locations' },
          { icon: 'shield-checkmark-outline', label: 'Teen Controls', desc: 'Speed limits & curfews' },
          { icon: 'alert-circle-outline', label: 'SOS Alerts', desc: 'Emergency notifications' },
          { icon: 'trophy-outline', label: 'Leaderboard', desc: 'Family driving scores' },
          { icon: 'notifications-outline', label: 'Place Alerts', desc: 'Arrive/leave geofences' },
          { icon: 'bar-chart-outline', label: 'Trip Reports', desc: 'Teen driving insights' },
        ].map((f) => (
          <View key={f.label} style={[styles.featureCard, { backgroundColor: isLight ? '#fff' : 'rgba(255,255,255,0.04)', borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }]}>
            <Ionicons name={f.icon as any} size={22} color="#7C3AED" />
            <Text style={[styles.featureLabel, { color: colors.text }]}>{f.label}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 10, textAlign: 'center' }}>{f.desc}</Text>
          </View>
        ))}
      </View>

      <View style={{ alignItems: 'center', marginTop: 20, paddingHorizontal: 24 }}>
        <Text style={{ color: colors.textTertiary, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
          Family plan will include everything in Premium plus family safety features. Stay tuned!
        </Text>
      </View>
    </ScrollView>
  );
}

export default function DashboardScreen() {
  const { isLight, colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>('friends');

  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [showSnapRace, setShowSnapRace] = useState(false);
  const [incomingReq, setIncomingReq] = useState<{ id: string; from_user_id: string; from_name?: string; from_email?: string }[]>([]);
  const [outgoingReq, setOutgoingReq] = useState<{ id: string; to_user_id: string; to_name?: string }[]>([]);
  const [searchHits, setSearchHits] = useState<{ id: string; name: string; email?: string; friend_code?: string; is_friend?: boolean }[]>([]);
  const [addTargetId, setAddTargetId] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const res = await api.get<any>('/api/friends/list');
      const data = (res.data as any)?.data ?? res.data;
      setFriends(Array.isArray(data) ? data : []);
    } catch {} finally { setFriendsLoading(false); }
  }, []);

  const loadPending = useCallback(async () => {
    try {
      const [inc, out] = await Promise.all([
        api.get<any>('/api/friends/requests'),
        api.get<any>('/api/friends/requests/sent'),
      ]);
      const idata = (inc.data as any)?.data ?? inc.data;
      const odata = (out.data as any)?.data ?? out.data;
      setIncomingReq(Array.isArray(idata) ? idata : []);
      setOutgoingReq(Array.isArray(odata) ? odata : []);
    } catch {
      setIncomingReq([]);
      setOutgoingReq([]);
    }
  }, []);

  useEffect(() => {
    if (section === 'friends') {
      loadFriends();
      loadPending();
    }
  }, [section, loadFriends, loadPending]);

  const handleAddFriend = useCallback(async () => {
    const uid = (addTargetId || '').trim();
    if (!uid) {
      Alert.alert('Pick someone', 'Search by name, email, or friend code and select a driver from the list.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const res = await api.post('/api/friends/add', { user_id: uid });
    if (res.success) {
      Alert.alert('Sent', 'Friend request sent!');
      setShowAddFriend(false);
      setFriendCode('');
      setAddTargetId(null);
      setSearchHits([]);
      loadFriends();
      loadPending();
    } else Alert.alert('Error', res.error ?? 'Could not add friend');
  }, [addTargetId, loadFriends, loadPending]);

  const handleRemoveFriend = useCallback(async (id: string) => {
    Alert.alert('Remove Friend', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await api.delete(`/api/friends/${id}`);
        setSelectedFriend(null);
        loadFriends();
      }},
    ]);
  }, [loadFriends]);

  const onlineCount = friends.filter((f) => f.status === 'accepted' && f.is_sharing).length;

  const renderFriend = useCallback(({ item }: { item: Friend }) => (
    <FriendRow friend={item} cardBg={colors.card} text={colors.text} sub={colors.textSecondary} onPress={setSelectedFriend} />
  ), [colors]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Section toggle */}
      <Animated.View entering={FadeInDown.duration(300).delay(50)} style={[styles.toggleRow, { backgroundColor: colors.surfaceSecondary }]}>
        {(['friends', 'family'] as Section[]).map((s) => (
          <TouchableOpacity key={s} style={[styles.togglePill, section === s && { backgroundColor: s === 'family' ? '#7C3AED' : colors.primary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSection(s); }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name={s === 'friends' ? 'people-outline' : 'home-outline'} size={14} color={section === s ? '#fff' : colors.textSecondary} />
              <Text style={[styles.toggleText, { color: section === s ? '#fff' : colors.textSecondary }]}>{s === 'friends' ? 'Friends' : 'Family'}</Text>
              {s === 'family' && <View style={styles.comingSoonDot}><Text style={styles.comingSoonDotText}>Soon</Text></View>}
            </View>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* ─── Friends tab ────────────────────────────────────────────── */}
      {section === 'friends' && (
        <View style={{ flex: 1 }}>
          {(incomingReq.length > 0 || outgoingReq.length > 0) && (
            <View style={{ paddingHorizontal: 16, marginBottom: 8, gap: 8 }}>
              {incomingReq.map((r) => (
                <View key={r.id} style={[styles.requestCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{r.from_name ?? 'Friend request'}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                      {r.from_email ? r.from_email : `Wants to connect`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.reqBtn, { backgroundColor: colors.primary }]}
                    onPress={async () => {
                      const res = await api.post('/api/friends/accept', { friendship_id: r.id });
                      if (res.success) { loadFriends(); loadPending(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
                      else Alert.alert('Error', res.error ?? 'Could not accept');
                    }}
                  >
                    <Text style={styles.reqBtnT}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reqBtn, { backgroundColor: colors.danger }]}
                    onPress={async () => {
                      await api.post('/api/friends/reject', { friendship_id: r.id });
                      loadPending();
                    }}
                  >
                    <Text style={styles.reqBtnT}>Decline</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {outgoingReq.map((r) => (
                <View key={r.id} style={[styles.requestCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                  <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Request pending</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                      Waiting for {r.to_name ?? 'them'} to accept
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={[styles.sectionHeader, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Friends{onlineCount > 0 ? ` · ${onlineCount} online` : ''}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Share Location</Text>
              <Switch value={isSharingLocation} onValueChange={(v) => { setIsSharingLocation(v); api.put('/api/friends/location/sharing', { is_sharing: v }).catch(() => {}); }} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
            </View>
          </View>
          {friendsLoading ? (
            <View style={{ padding: 16, gap: 12 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} width="100%" height={60} borderRadius={14} />)}
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No friends yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Add friends to see them on the map and share your location</Text>
            </View>
          ) : (
            <FlatList data={friends} keyExtractor={(f) => f.id}
              refreshControl={
                <RefreshControl
                  refreshing={friendsLoading}
                  onRefresh={() => { loadFriends(); loadPending(); }}
                  tintColor={colors.primary}
                />
              }
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}
              renderItem={renderFriend}
            />
          )}
          <TouchableOpacity style={[styles.addFriendBtn, { bottom: insets.bottom + 16, backgroundColor: colors.primary }]} onPress={() => setShowAddFriend(true)} activeOpacity={0.8}>
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={styles.addFriendText}>Add Friend</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Family tab (Coming Soon preview) ──────────────────────── */}
      {section === 'family' && (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <FamilyPreview colors={colors} isLight={isLight} />
        </View>
      )}

      {/* Modals */}
      <Modal visible={showAddFriend} onClose={() => { setShowAddFriend(false); setSearchHits([]); setAddTargetId(null); }}>
        <Text style={[styles.modalTitle, { color: colors.text }]}>Add Friend</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 10, textAlign: 'center', lineHeight: 18 }}>
          Search by name, email, or 6-character SnapRoad friend code. Tap a result before sending — we will not guess from free text.
        </Text>
        <TextInput
          style={[styles.modalInput, { color: colors.text, backgroundColor: colors.surfaceSecondary }]}
          placeholder="Search drivers…" placeholderTextColor={colors.textSecondary}
          value={friendCode}
          onChangeText={(t) => {
            setFriendCode(t);
            setAddTargetId(null);
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            const q = t.trim();
            if (q.length < 2) {
              setSearchHits([]);
              return;
            }
            searchTimerRef.current = setTimeout(async () => {
              const res = await api.get<any>(`/api/friends/search?q=${encodeURIComponent(q)}`);
              const data = (res.data as any)?.data ?? res.data;
              setSearchHits(Array.isArray(data) ? data : []);
            }, 380);
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchHits.length > 0 && (
          <FlatList
            style={{ maxHeight: 220, marginBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            data={searchHits}
            keyExtractor={(h) => h.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.searchHit,
                  {
                    backgroundColor: addTargetId === item.id ? `${colors.primary}22` : colors.surfaceSecondary,
                    borderColor: addTargetId === item.id ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  if (item.is_friend) {
                    Alert.alert('Already friends', 'You are already connected with this driver.');
                    return;
                  }
                  setAddTargetId(item.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{item.name}</Text>
                {!!item.email && <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{item.email}</Text>}
                {!!item.friend_code && (
                  <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }}>Code {item.friend_code}</Text>
                )}
              </TouchableOpacity>
            )}
          />
        )}
        {friendCode.trim().length >= 2 && searchHits.length === 0 && (
          <Text style={{ color: colors.textTertiary, fontSize: 13, marginBottom: 14, textAlign: 'center' }}>
            No driver matches that search. Check spelling or ask for their friend code.
          </Text>
        )}
        <TouchableOpacity
          style={[styles.modalBtn, { backgroundColor: addTargetId ? colors.primary : colors.border }]}
          onPress={handleAddFriend}
          activeOpacity={0.8}
          disabled={!addTargetId}
        >
          <Text style={styles.modalBtnText}>{addTargetId ? 'Send Request' : 'Select someone above'}</Text>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!selectedFriend} onClose={() => setSelectedFriend(null)}>
        {selectedFriend && (
          <>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedFriend.name}</Text>
            <TouchableOpacity style={[styles.friendAction, { backgroundColor: colors.primary }]} activeOpacity={0.8}
              onPress={() => { setSelectedFriend(null); navigation.getParent()?.navigate('Map'); }}>
              <Ionicons name="navigate-outline" size={16} color="#fff" /><Text style={styles.friendActionText}>Navigate to</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.friendAction, { backgroundColor: '#7C3AED', marginTop: 8 }]} activeOpacity={0.8}
              onPress={() => { setSelectedFriend(null); setShowSnapRace(true); }}>
              <Ionicons name="flash-outline" size={16} color="#fff" /><Text style={styles.friendActionText}>Challenge to Race</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.friendAction, { backgroundColor: colors.danger, marginTop: 8 }]} activeOpacity={0.8} onPress={() => handleRemoveFriend(selectedFriend.friend_id)}>
              <Ionicons name="trash-outline" size={16} color="#fff" /><Text style={styles.friendActionText}>Remove Friend</Text>
            </TouchableOpacity>
          </>
        )}
      </Modal>

      <SnapRaceMode visible={showSnapRace} onClose={() => setShowSnapRace(false)} userId={user?.id ?? ''} friends={friends.filter((f) => f.status === 'accepted').map((f) => ({ id: f.friend_id, name: f.name }))} gems={user?.gems ?? 0} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 14, padding: 4 },
  togglePill: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  toggleText: { fontSize: 14, fontWeight: '700' },
  comingSoonDot: { backgroundColor: 'rgba(124,58,237,0.25)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  comingSoonDotText: { color: '#C084FC', fontSize: 8, fontWeight: '800' },

  sectionHeader: { paddingHorizontal: 16, paddingVertical: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  friendCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  friendAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  friendInitials: { color: '#fff', fontSize: 16, fontWeight: '800' },
  friendName: { fontSize: 15, fontWeight: '700' },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#34C759' },
  addFriendBtn: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  addFriendText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  previewOverlayBadge: { alignItems: 'center', marginBottom: 12, marginTop: 4 },
  comingSoonPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  comingSoonPillText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  previewSection: { fontSize: 15, fontWeight: '800', marginBottom: 8, marginTop: 4 },

  mockMemberCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1 },
  mockAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  mockAvatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  mockName: { fontSize: 15, fontWeight: '700' },

  mockMapCard: { borderRadius: 16, height: 140, overflow: 'hidden', position: 'relative' },
  mockMapPins: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  mockMapPin: { position: 'absolute', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  mockMapRoute: { position: 'absolute', width: 120, height: 3, backgroundColor: 'rgba(59,130,246,0.4)', borderRadius: 2, transform: [{ rotate: '25deg' }] },
  mockMapOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  mockEventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, marginBottom: 6, borderWidth: 1 },
  mockEventIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featureCard: { width: '48%' as any, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1 },
  featureLabel: { fontSize: 12, fontWeight: '700' },

  modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  modalInput: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 16 },
  modalBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  friendAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, marginTop: 12 },
  friendActionText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  requestCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 12, borderWidth: StyleSheet.hairlineWidth },
  reqBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  reqBtnT: { color: '#fff', fontSize: 12, fontWeight: '800' },
  searchHit: { borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth },
});
