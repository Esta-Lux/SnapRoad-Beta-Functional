import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  TextInput,
  RefreshControl,
  Switch,
  ScrollView,
  AppState,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Battery from 'expo-battery';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { api } from '../api/client';
import Skeleton from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import type { Friend } from '../types';
import { storage } from '../utils/storage';
import { useLocation } from '../hooks/useLocation';
import { supabase } from '../lib/supabase';
import { normalizeFriendFromApi, deriveFriendPresence } from '../lib/friendPresence';
import FriendListCard, { type FriendListCardTheme } from '../components/social/FriendListCard';
import FriendDetailModalContent from '../components/social/FriendDetailModal';
import type { MapFocusFriendParams } from '../types';

type Section = 'friends' | 'family';

const SHARE_LOC_STORAGE_KEY = 'snaproad_share_location';

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

      <Text style={[styles.previewSection, { color: colors.text, marginTop: 16 }]}>Family Features</Text>
      <View style={[styles.featureGrid]}>
        {[
          { icon: 'locate-outline', label: 'Live Tracking', desc: 'Real-time family locations' },
          { icon: 'shield-checkmark-outline', label: 'Teen Controls', desc: 'Speed limits & curfews' },
          { icon: 'alert-circle-outline', label: 'SOS Alerts', desc: 'Emergency notifications' },
          { icon: 'bar-chart-outline', label: 'Trip reports', desc: 'Weekly driving summaries' },
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
  const isFocused = useIsFocused();
  const [section, setSection] = useState<Section>('friends');
  const friendsTabActive = section === 'friends' && isFocused;
  const { location, heading, speed } = useLocation(false, { paused: !friendsTabActive });
  const dashboardLivePublishRef = useRef(0);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [incomingReq, setIncomingReq] = useState<{ id: string; from_user_id: string; from_name?: string; from_email?: string }[]>([]);
  const [outgoingReq, setOutgoingReq] = useState<{ id: string; to_user_id: string; to_name?: string }[]>([]);
  const [searchHits, setSearchHits] = useState<{ id: string; name: string; email?: string; friend_code?: string; is_friend?: boolean }[]>([]);
  const [addTargetId, setAddTargetId] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const loadFriends = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setFriendsLoading(true);
    try {
      const res = await api.get<any>('/api/friends/list');
      const data = (res.data as any)?.data ?? res.data;
      const raw = Array.isArray(data) ? data : [];
      setFriends(raw.map((row: Record<string, unknown>) => normalizeFriendFromApi(row)));
    } catch {
      if (!opts?.silent) setFriends([]);
    } finally {
      if (!opts?.silent) setFriendsLoading(false);
    }
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
    if (section !== 'friends') return;
    let cancelled = false;

    const run = async () => {
      const localRaw = await storage.getStringAsync(SHARE_LOC_STORAGE_KEY);
      const hadLocal = localRaw === '1' || localRaw === '0';
      const localOn = localRaw === '1';
      if (!cancelled && hadLocal) {
        setIsSharingLocation(localOn);
      }

      await Promise.all([loadFriends(), loadPending()]);

      try {
        const r = await api.get<any>('/api/friends/location/sharing');
        if (cancelled) return;
        const v = (r.data as any)?.data?.is_sharing;
        if (typeof v !== 'boolean') return;

        if (v) {
          setIsSharingLocation(true);
          storage.set(SHARE_LOC_STORAGE_KEY, '1');
          return;
        }

        if (localOn) {
          try {
            await api.put('/api/friends/location/sharing', {
              is_sharing: true,
              lat: location.lat,
              lng: location.lng,
            });
            if (!cancelled) {
              setIsSharingLocation(true);
              storage.set(SHARE_LOC_STORAGE_KEY, '1');
            }
          } catch {
            if (!cancelled) {
              setIsSharingLocation(true);
              storage.set(SHARE_LOC_STORAGE_KEY, '1');
            }
          }
          return;
        }

        setIsSharingLocation(false);
        storage.set(SHARE_LOC_STORAGE_KEY, '0');
      } catch {
        /* keep hydrated local preference */
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [section, loadFriends, loadPending, location.lat, location.lng]);

  useEffect(() => {
    if (!friendsTabActive) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        loadFriends({ silent: true });
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [friendsTabActive, loadFriends]);

  useEffect(() => {
    if (!friendsTabActive) return;
    const id = setInterval(() => loadFriends({ silent: true }), 45_000);
    return () => clearInterval(id);
  }, [friendsTabActive, loadFriends]);

  useEffect(() => {
    if (!friendsTabActive) return;
    const channel = supabase
      .channel('dashboard-friend-locations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_locations' }, (payload: { new?: Record<string, unknown> }) => {
        const row = payload.new;
        if (!row?.user_id) return;
        const uid = String(row.user_id);
        setFriends((prev) =>
          prev.map((f) => {
            if (String(f.friend_id) !== uid) return f;
            return {
              ...f,
              lat: row.lat != null ? Number(row.lat) : f.lat,
              lng: row.lng != null ? Number(row.lng) : f.lng,
              heading: row.heading != null ? Number(row.heading) : f.heading,
              speed_mph: row.speed_mph != null ? Number(row.speed_mph) : f.speed_mph,
              is_sharing: typeof row.is_sharing === 'boolean' ? row.is_sharing : f.is_sharing,
              last_updated: typeof row.last_updated === 'string' ? row.last_updated : f.last_updated,
              is_navigating: typeof row.is_navigating === 'boolean' ? row.is_navigating : f.is_navigating,
              destination_name: typeof row.destination_name === 'string' ? row.destination_name : f.destination_name,
              battery_pct: row.battery_pct != null && row.battery_pct !== '' ? Number(row.battery_pct) : f.battery_pct,
            };
          }),
        );
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [friendsTabActive]);

  /** Mirror Map tab: publish GPS + battery while Social friends tab is open and sharing (Premium). */
  useEffect(() => {
    if (!user?.isPremium || !friendsTabActive || !isSharingLocation) return;
    const rLat = Math.round(location.lat * 1000);
    const rLng = Math.round(location.lng * 1000);
    if (rLat === 0 && rLng === 0) return;
    const now = Date.now();
    if (now - dashboardLivePublishRef.current < 25_000) return;
    dashboardLivePublishRef.current = now;

    let cancelled = false;
    (async () => {
      let battery_pct: number | undefined;
      try {
        const lvl = await Battery.getBatteryLevelAsync();
        if (cancelled) return;
        battery_pct = Math.round(Math.max(0, Math.min(1, lvl)) * 100);
      } catch {
        /* optional */
      }
      if (cancelled) return;
      try {
        await api.post('/api/friends/location/update', {
          lat: location.lat,
          lng: location.lng,
          heading,
          speed_mph: speed,
          is_navigating: false,
          is_sharing: true,
          battery_pct,
        });
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.isPremium, friendsTabActive, isSharingLocation, location.lat, location.lng, heading, speed]);

  const myCoord = useMemo(() => {
    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return null;
    if (location.lat === 0 && location.lng === 0) return null;
    return { lat: location.lat, lng: location.lng };
  }, [location.lat, location.lng]);

  const friendListData = useMemo(
    () =>
      friends.map((friend) => ({
        friend,
        presence: deriveFriendPresence(friend, myCoord),
      })),
    [friends, myCoord],
  );

  const liveFreshCount = useMemo(
    () => friendListData.filter(({ presence }) => presence.isLiveFresh).length,
    [friendListData],
  );

  const listTheme = useMemo<FriendListCardTheme>(
    () => ({
      cardBg: colors.card,
      text: colors.text,
      sub: colors.textSecondary,
      primary: colors.primary,
      border: colors.border,
    }),
    [colors.card, colors.text, colors.textSecondary, colors.primary, colors.border],
  );

  const detailsTheme = useMemo(
    () => ({
      text: colors.text,
      sub: colors.textSecondary,
      card: colors.card,
      border: colors.border,
      primary: colors.primary,
      danger: colors.danger,
      surface: colors.surfaceSecondary,
    }),
    [colors],
  );

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

  const handleRemoveFriend = useCallback(
    async (id: string) => {
      Alert.alert('Remove Friend', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await api.delete(`/api/friends/${id}`);
            setSelectedFriend(null);
            loadFriends();
          },
        },
      ]);
    },
    [loadFriends],
  );

  const openFriendOnMap = useCallback(
    (f: Friend) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const lat = f.lat;
      const lng = f.lng;
      const coordsOk =
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        !((lat === 0 || Math.abs(lat as number) < 1e-6) && (lng === 0 || Math.abs(lng as number) < 1e-6));
      const payload: MapFocusFriendParams = {
        friendId: f.friend_id || f.id,
        nonce: Date.now(),
        ...(coordsOk ? { lat: lat as number, lng: lng as number } : {}),
      };
      navigation.getParent()?.navigate('Map', { screen: 'MapMain', params: { mapFocusFriend: payload } });
    },
    [navigation],
  );

  const renderFriend = useCallback(
    ({ item }: { item: (typeof friendListData)[0] }) => (
      <FriendListCard
        friend={item.friend}
        presence={item.presence}
        theme={listTheme}
        onPress={setSelectedFriend}
        onAvatarPress={openFriendOnMap}
      />
    ),
    [listTheme, openFriendOnMap],
  );

  const listKeyExtractor = useCallback((item: (typeof friendListData)[0]) => item.friend.id, []);

  if (!user?.isPremium) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 6, paddingBottom: insets.bottom + 28 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }}>Social</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 10, lineHeight: 21 }}>
            Friends, live location, convoy meetups, and friend search are included with SnapRoad Premium. Your trips, miles,
            and gems stay on the Rewards and Profile tabs on the free plan.
          </Text>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Profile')}
            style={{ marginTop: 22 }}
          >
            <LinearGradient
              colors={['#2563EB', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Ionicons name="diamond" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Upgrade to Premium</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 20, lineHeight: 18 }}>
            The Family tab preview (coming soon) will ship with the Family plan. Premium unlocks friend driving today.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }}>Social</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
          Friends, live location, and meetups. Open Convoy from the map menu anytime.
        </Text>
      </View>

      <Animated.View entering={FadeInDown.duration(300).delay(50)} style={[styles.toggleRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        {(['friends', 'family'] as Section[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.togglePill, section === s && { backgroundColor: s === 'family' ? '#7C3AED' : colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSection(s);
            }}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name={s === 'friends' ? 'people-outline' : 'home-outline'} size={14} color={section === s ? '#fff' : colors.textSecondary} />
              <Text style={[styles.toggleText, { color: section === s ? '#fff' : colors.textSecondary }]}>{s === 'friends' ? 'Friends' : 'Family'}</Text>
              {s === 'family' && (
                <View style={styles.comingSoonDot}>
                  <Text style={styles.comingSoonDotText}>Soon</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </Animated.View>

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
                      if (res.success) {
                        loadFriends();
                        loadPending();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      } else Alert.alert('Error', res.error ?? 'Could not accept');
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Friends
              {liveFreshCount > 0 ? ` · ${liveFreshCount} live` : ''}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Share Location</Text>
              <Switch
                value={isSharingLocation}
                onValueChange={async (v) => {
                  setIsSharingLocation(v);
                  storage.set(SHARE_LOC_STORAGE_KEY, v ? '1' : '0');
                  try {
                    await api.put('/api/friends/location/sharing', {
                      is_sharing: v,
                      ...(v && myCoord ? { lat: myCoord.lat, lng: myCoord.lng } : {}),
                    });
                  } catch {
                    /* preference stays in local storage */
                  }
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {friendsLoading ? (
            <View style={{ padding: 16, gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} width="100%" height={72} borderRadius={14} />
              ))}
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyHero, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <LinearGradient colors={[`${colors.primary}33`, `${colors.primary}08`]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Ionicons name="people" size={32} color={colors.primary} />
                <Text style={[styles.emptyHeroTitle, { color: colors.text }]}>Grow your convoy</Text>
                <Text style={[styles.emptyHeroSub, { color: colors.textSecondary }]}>
                  Add friends to share live location and navigate to each other on the map.
                </Text>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No friends yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Use Add Friend below — search by name, email, or 6-character friend code.
              </Text>
            </View>
          ) : (
            <FlatList
              data={friendListData}
              keyExtractor={listKeyExtractor}
              refreshControl={
                <RefreshControl refreshing={friendsLoading} onRefresh={() => { loadFriends(); loadPending(); }} tintColor={colors.primary} />
              }
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}
              ListHeaderComponent={
                friendListData.length > 0 && friendListData.length <= 2 ? (
                  <View style={[styles.tipCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
                    <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                      Pull down to refresh. Turn on Share Location so friends can route to you in real time.
                    </Text>
                  </View>
                ) : null
              }
              renderItem={renderFriend}
            />
          )}
          <TouchableOpacity
            style={[styles.addFriendBtn, { bottom: insets.bottom + 16, backgroundColor: colors.primary }]}
            onPress={() => setShowAddFriend(true)}
            activeOpacity={0.88}
          >
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={styles.addFriendText}>Add Friend</Text>
          </TouchableOpacity>
        </View>
      )}

      {section === 'family' && (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <FamilyPreview colors={colors} isLight={isLight} />
        </View>
      )}

      <Modal visible={showAddFriend} onClose={() => { setShowAddFriend(false); setSearchHits([]); setAddTargetId(null); }} scrollable={false}>
        <Text style={[styles.modalTitle, { color: colors.text }]}>Add Friend</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 10, textAlign: 'center', lineHeight: 18 }}>
          Search by name, email, or 6-character SnapRoad friend code. Tap a result before sending — we will not guess from free text.
        </Text>
        <TextInput
          style={[styles.modalInput, { color: colors.text, backgroundColor: colors.surfaceSecondary }]}
          placeholder="Search drivers…"
          placeholderTextColor={colors.textSecondary}
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

      <Modal visible={!!selectedFriend} onClose={() => setSelectedFriend(null)} scrollable={false}>
        {selectedFriend ? (
          <FriendDetailModalContent
            friend={selectedFriend}
            myLocation={myCoord}
            theme={detailsTheme}
            onClose={() => setSelectedFriend(null)}
            onNavigate={(opts) => {
              setSelectedFriend(null);
              navigation.getParent()?.navigate('Map', {
                screen: 'MapMain',
                params: {
                  navigateToFriend: {
                    friendId: opts.friendId,
                    name: opts.name,
                    lat: opts.lat,
                    lng: opts.lng,
                    nonce: Date.now(),
                    isLiveFresh: opts.isLiveFresh,
                    lastUpdated: opts.lastUpdated,
                  },
                },
              });
            }}
            onViewOnMap={(friendId) => {
              setSelectedFriend(null);
              navigation.getParent()?.navigate('Map', {
                screen: 'MapMain',
                params: { mapFocusFriend: { friendId, nonce: Date.now() } },
              });
            }}
            onRemove={handleRemoveFriend}
          />
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  togglePill: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  toggleText: { fontSize: 14, fontWeight: '700' },
  comingSoonDot: { backgroundColor: 'rgba(124,58,237,0.25)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  comingSoonDotText: { color: '#C084FC', fontSize: 8, fontWeight: '800' },

  sectionHeader: { paddingHorizontal: 16, paddingVertical: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tipText: { flex: 1, fontSize: 12, lineHeight: 17 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  emptyHero: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  emptyHeroTitle: { fontSize: 17, fontWeight: '800', marginTop: 10 },
  emptyHeroSub: { fontSize: 12, textAlign: 'center', lineHeight: 17, marginTop: 6 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  addFriendBtn: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
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

  requestCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 12, borderWidth: StyleSheet.hairlineWidth },
  reqBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  reqBtnT: { color: '#fff', fontSize: 12, fontWeight: '800' },
  searchHit: { borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth },
});
