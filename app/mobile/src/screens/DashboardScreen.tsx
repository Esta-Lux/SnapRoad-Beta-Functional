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
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
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
import type { DashboardStackScreenNavigationProp } from '../navigation/types';
import { api } from '../api/client';
import Skeleton from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import type { Friend, FriendCategory } from '../types';
import { storage } from '../utils/storage';
import { useLocation } from '../hooks/useLocation';
import { supabase } from '../lib/supabase';
import { deriveFriendPresence } from '../lib/friendPresence';
import FriendListCard, { type FriendListCardTheme } from '../components/social/FriendListCard';
import { SocialScreenHeader } from '../components/social/SocialScreenHeader';
import FriendDetailModalContent from '../components/social/FriendDetailModal';
import ChallengeModal from '../components/gamification/ChallengeModal';
import FriendChallengeHistoryModal from '../components/gamification/FriendChallengeHistoryModal';
import {
  fetchFriendsNormalized,
  fetchPendingRequests,
  fetchFriendCategories,
} from '../features/social/friendsApi';
import { extractLocationSharingState, getApiErrorMessage } from '../features/social/locationSharing';
import { syncFriendLiveShareBackgroundFromPolicy } from '../location/friendLiveShareBackgroundTask';
import { nudgeBackgroundLocationAfterEnablingShare } from '../location/friendLocationPermissionUx';
import {
  FRIEND_LIVE_SHARE_MODE_KEY,
  FRIEND_LIVE_SHARE_PUBLISH_INTERVAL_MS,
  FRIEND_LIVE_SHARE_STORAGE_KEY,
  type FriendLiveShareMode,
  isFriendLiveShareEnabled,
  normalizeFriendLiveShareMode,
} from '../location/friendLiveShareConfig';
import { usePublicAppConfig } from '../hooks/usePublicAppConfig';
import type { MapFocusFriendParams } from '../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Section = 'friends' | 'family';

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
        <LinearGradient colors={['#334155', '#0F172A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.comingSoonPill}>
          <Ionicons name="time-outline" size={12} color="#fff" />
          <Text style={styles.comingSoonPillText}>POLISHED PREVIEW</Text>
        </LinearGradient>
      </View>

      <View style={[styles.familyTruthCard, { backgroundColor: isLight ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.06)', borderColor: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)' }]}>
        <Ionicons name="shield-checkmark-outline" size={20} color={isLight ? '#0F172A' : '#E2E8F0'} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>Family backend is locked for launch</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 }}>
            This tab is intentionally a preview. No button here pretends to perform live family tracking until the production API is ready.
          </Text>
        </View>
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
          { icon: 'navigate-outline', label: 'Commute Alerts', desc: 'Route traffic nudges' },
          { icon: 'bar-chart-outline', label: 'Trip Reports', desc: 'Teen driving insights' },
        ].map((f) => (
          <View key={f.label} style={[styles.featureCard, { backgroundColor: isLight ? '#fff' : 'rgba(255,255,255,0.04)', borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }]}>
            <Ionicons name={f.icon as any} size={22} color={isLight ? '#1D4ED8' : '#3B82F6'} />
            <Text style={[styles.featureLabel, { color: colors.text }]}>{f.label}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 10, textAlign: 'center' }}>{f.desc}</Text>
          </View>
        ))}
      </View>

      <View style={{ alignItems: 'center', marginTop: 20, paddingHorizontal: 24 }}>
        <Text style={{ color: colors.textTertiary, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
          Family plan will include Premium plus household safety features. Until then, friends and live sharing stay in the Social hub.
        </Text>
      </View>
    </ScrollView>
  );
}

export default function DashboardScreen() {
  const { isLight, colors } = useTheme();
  const { user, updateUser } = useAuth();
  const navigation = useNavigation<DashboardStackScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [section, setSection] = useState<Section>('friends');
  // Social is Premium-only. Gating the activity flag here means every downstream effect
  // — list/pending/category polling, location publish, Supabase `live_locations` channel,
  // timestamp re-tick — short-circuits for free users who still briefly mount this screen
  // (the premium paywall renders via the early-return below).
  const friendsTabActive = section === 'friends' && isFocused && !!user?.isPremium;
  const { friendTrackingEnabled, liveLocationPublishingEnabled } = usePublicAppConfig(
    !!user?.isPremium && isFocused,
  );
  const { location, heading, speed } = useLocation(false, { paused: !friendsTabActive });
  const dashboardLivePublishRef = useRef(0);
  /** User enabled sharing before GPS was ready — push coords + full update once `myCoord` exists. */
  const shareLocationNeedsCoordsSyncRef = useRef(false);
  const dashboardLiveCoordsRef = useRef({ lat: location.lat, lng: location.lng, heading, speed });
  dashboardLiveCoordsRef.current = { lat: location.lat, lng: location.lng, heading, speed };
  /**
   * Live-location publish outcome surfaced as a quiet inline banner on the sharing card.
   *  - `ok` (or `null`): no banner.
   *  - `paused_by_admin`: backend kill-switch (runtime_config) or config 503 returned — we stop trying and tell the user.
   *  - `transient`: ≥3 consecutive non-503 failures (offline, 500, network) — softer message with retry affordance.
   * Reset to `ok` on any successful publish.
   */
  type PublishStatus = 'ok' | 'paused_by_admin' | 'transient';
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('ok');
  const publishFailStreakRef = useRef(0);
  const publishStatusRef = useRef<PublishStatus>('ok');
  publishStatusRef.current = publishStatus;
  const reportPublishResult = useCallback((res: { success: boolean; statusCode?: number } | null | undefined) => {
    if (res?.success) {
      publishFailStreakRef.current = 0;
      if (publishStatusRef.current !== 'ok') setPublishStatus('ok');
      return;
    }
    // 503 is the runtime-config kill-switch or "Location sharing backend is not configured" — both are
    // operator-visible states, not transient network hiccups. Stop the streak entirely and latch the banner.
    if (res?.statusCode === 503) {
      publishFailStreakRef.current = 0;
      if (publishStatusRef.current !== 'paused_by_admin') setPublishStatus('paused_by_admin');
      return;
    }
    publishFailStreakRef.current += 1;
    // 3 consecutive misses ≈ ~75–90 s of failed publishes at our 25–28 s cadence.
    // Anything shorter would flash the banner on a single flaky tick; longer would leave
    // a broken sharing state invisible for too long.
    if (publishFailStreakRef.current >= 3 && publishStatusRef.current === 'ok') {
      setPublishStatus('transient');
    }
  }, []);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [incomingReq, setIncomingReq] = useState<{ id: string; from_user_id: string; from_name?: string; from_email?: string }[]>([]);
  const [outgoingReq, setOutgoingReq] = useState<{ id: string; to_user_id: string; to_name?: string }[]>([]);
  const [categories, setCategories] = useState<FriendCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryFriendTarget, setCategoryFriendTarget] = useState<Friend | null>(null);
  const [pendingExpanded, setPendingExpanded] = useState(false);
  const [challengeFriend, setChallengeFriend] = useState<Friend | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showFriendChallengeHistory, setShowFriendChallengeHistory] = useState(false);
  const [searchHits, setSearchHits] = useState<{ id: string; name: string; email?: string; friend_code?: string; is_friend?: boolean }[]>([]);
  const [addTargetId, setAddTargetId] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<FriendLiveShareMode>('off');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const loadFriends = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setFriendsLoading(true);
    try {
      setFriends(await fetchFriendsNormalized());
    } catch {
      if (!opts?.silent) setFriends([]);
    } finally {
      if (!opts?.silent) setFriendsLoading(false);
    }
  }, []);

  const loadPending = useCallback(async () => {
    const { incoming, outgoing } = await fetchPendingRequests();
    setIncomingReq(incoming);
    setOutgoingReq(outgoing);
  }, []);

  const loadCategories = useCallback(async () => {
    setCategories(await fetchFriendCategories());
  }, []);

  useEffect(() => {
    if (section !== 'friends' || !user?.isPremium) return;
    let cancelled = false;

    const run = async () => {
      const localRaw = await storage.getStringAsync(FRIEND_LIVE_SHARE_STORAGE_KEY);
      const localModeRaw = await storage.getStringAsync(FRIEND_LIVE_SHARE_MODE_KEY);
      const hadLocal = localRaw === '1' || localRaw === '0';
      const localOn = localRaw === '1';
      const localMode = normalizeFriendLiveShareMode(localModeRaw, localOn);
      if (!cancelled && hadLocal) {
        setIsSharingLocation(localOn);
        setShareMode(localMode);
      }

      await Promise.all([loadFriends(), loadPending(), loadCategories()]);

      try {
        const r = await api.get('/api/friends/location/sharing');
        if (cancelled) return;
        const state = r.success ? extractLocationSharingState(r.data) : null;
        if (!state) return;

        if (state.isSharing) {
          setIsSharingLocation(true);
          setShareMode(state.sharingMode);
          storage.set(FRIEND_LIVE_SHARE_STORAGE_KEY, '1');
          storage.set(FRIEND_LIVE_SHARE_MODE_KEY, state.sharingMode);
          return;
        }

        if (localOn) {
          const { lat, lng } = dashboardLiveCoordsRef.current;
          const coordsValid =
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            !((Math.abs(lat) < 1e-6) && (Math.abs(lng) < 1e-6));
          if (!coordsValid) shareLocationNeedsCoordsSyncRef.current = true;
          const syncRes = await api.put('/api/friends/location/sharing', {
            is_sharing: true,
            sharing_mode: localMode === 'off' ? 'while_using' : localMode,
            ...(coordsValid ? { lat, lng } : {}),
          });
          if (!syncRes.success) {
            if (!cancelled) {
              setIsSharingLocation(false);
              setShareMode('off');
              storage.set(FRIEND_LIVE_SHARE_STORAGE_KEY, '0');
              storage.set(FRIEND_LIVE_SHARE_MODE_KEY, 'off');
            }
            return;
          }
          if (!cancelled) {
            setIsSharingLocation(true);
            setShareMode(localMode === 'off' ? 'while_using' : localMode);
            storage.set(FRIEND_LIVE_SHARE_STORAGE_KEY, '1');
            storage.set(FRIEND_LIVE_SHARE_MODE_KEY, localMode === 'off' ? 'while_using' : localMode);
          }
          return;
        }

        setIsSharingLocation(false);
        setShareMode('off');
        storage.set(FRIEND_LIVE_SHARE_STORAGE_KEY, '0');
        storage.set(FRIEND_LIVE_SHARE_MODE_KEY, 'off');
      } catch {
        /* keep hydrated local preference */
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [section, user?.isPremium, loadFriends, loadPending, loadCategories]);

  /** Re-render friend timestamps every 15 s so "just now" → "1m ago" updates live. */
  const [, setTickClock] = useState(0);
  const hasFriends = friends.length > 0;
  useEffect(() => {
    if (!friendsTabActive || !hasFriends) return;
    const id = setInterval(() => setTickClock((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, [friendsTabActive, hasFriends]);

  useEffect(() => {
    if (!friendsTabActive) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        loadFriends({ silent: true });
        loadPending();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [friendsTabActive, loadFriends, loadPending]);

  useEffect(() => {
    if (activeCategoryId === 'all') return;
    if (categories.some((c) => c.id === activeCategoryId)) return;
    setActiveCategoryId('all');
  }, [categories, activeCategoryId]);

  useEffect(() => {
    if (!friendsTabActive) return;
    const id = setInterval(() => {
      loadFriends({ silent: true });
      loadPending();
      loadCategories();
    }, 45_000);
    return () => clearInterval(id);
  }, [friendsTabActive, loadFriends, loadPending, loadCategories]);

  useEffect(() => {
    if (!friendsTabActive) return;
    const applyLiveLocation = (row?: Record<string, unknown>) => {
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
            last_updated:
              typeof row.last_updated === 'string'
                ? row.last_updated
                : f.last_updated ?? new Date().toISOString(),
            is_navigating: typeof row.is_navigating === 'boolean' ? row.is_navigating : f.is_navigating,
            destination_name: typeof row.destination_name === 'string' ? row.destination_name : f.destination_name,
            battery_pct: row.battery_pct != null && row.battery_pct !== '' ? Number(row.battery_pct) : f.battery_pct,
          };
        }),
      );
    };
    const channel = supabase
      .channel('dashboard-friend-locations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_locations' }, (payload: { new?: Record<string, unknown> }) => applyLiveLocation(payload.new))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_locations' }, (payload: { new?: Record<string, unknown> }) => applyLiveLocation(payload.new))
      .subscribe();
    /** Re-subscribe after app returns from background — the websocket may have gone stale. */
    const channelAppRef = { prev: AppState.currentState };
    const appSub = AppState.addEventListener('change', (next) => {
      if (channelAppRef.prev.match(/inactive|background/) && next === 'active') {
        try { channel.subscribe(); } catch { /* safe */ }
      }
      channelAppRef.prev = next;
    });
    return () => {
      appSub.remove();
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
    if (now - dashboardLivePublishRef.current < FRIEND_LIVE_SHARE_PUBLISH_INTERVAL_MS) return;
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
        const res = await api.post('/api/friends/location/update', {
          lat: location.lat,
          lng: location.lng,
          heading,
          speed_mph: speed,
          is_navigating: false,
          is_sharing: true,
          sharing_mode: shareMode === 'always_follow' ? 'always_follow' : 'while_using',
          battery_pct,
        });
        if (!cancelled) reportPublishResult(res);
      } catch {
        if (!cancelled) reportPublishResult({ success: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.isPremium, friendsTabActive, isSharingLocation, location.lat, location.lng, heading, speed, shareMode, reportPublishResult]);

  /** Heartbeat while parked: GPS effect may not re-run when coordinates are static. */
  useEffect(() => {
    if (!user?.isPremium || !friendsTabActive || !isSharingLocation) return;
    let cancelled = false;
    const tick = () => {
      const { lat, lng, heading: h, speed: sp } = dashboardLiveCoordsRef.current;
      const rLat = Math.round(lat * 1000);
      const rLng = Math.round(lng * 1000);
      if (rLat === 0 && rLng === 0) return;
      const now = Date.now();
      if (now - dashboardLivePublishRef.current < FRIEND_LIVE_SHARE_PUBLISH_INTERVAL_MS) return;
      dashboardLivePublishRef.current = now;
      void (async () => {
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
          const res = await api.post('/api/friends/location/update', {
            lat,
            lng,
            heading: h,
            speed_mph: sp,
            is_navigating: false,
            is_sharing: true,
            sharing_mode: shareMode === 'always_follow' ? 'always_follow' : 'while_using',
            battery_pct,
          });
          if (!cancelled) reportPublishResult(res);
        } catch {
          if (!cancelled) reportPublishResult({ success: false });
        }
      })();
    };
    const id = setInterval(tick, FRIEND_LIVE_SHARE_PUBLISH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.isPremium, friendsTabActive, isSharingLocation, shareMode, reportPublishResult]);

  const myCoord = useMemo(() => {
    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return null;
    if (location.lat === 0 && location.lng === 0) return null;
    return { lat: location.lat, lng: location.lng };
  }, [location.lat, location.lng]);

  useEffect(() => {
    if (!user?.isPremium || !isSharingLocation || !myCoord) return;
    if (!shareLocationNeedsCoordsSyncRef.current) return;
    shareLocationNeedsCoordsSyncRef.current = false;
    let cancelled = false;
    void (async () => {
      try {
        const shareRes = await api.put('/api/friends/location/sharing', {
          is_sharing: true,
          lat: myCoord.lat,
          lng: myCoord.lng,
        });
        if (!shareRes.success) {
          shareLocationNeedsCoordsSyncRef.current = true;
          return;
        }
        if (cancelled) return;
        let battery_pct: number | undefined;
        try {
          const lvl = await Battery.getBatteryLevelAsync();
          if (cancelled) return;
          battery_pct = Math.round(Math.max(0, Math.min(1, lvl)) * 100);
        } catch {
          /* optional */
        }
        if (cancelled) return;
        const updateRes = await api.post('/api/friends/location/update', {
          lat: myCoord.lat,
          lng: myCoord.lng,
          heading,
          speed_mph: speed,
          is_navigating: false,
          is_sharing: true,
          sharing_mode: shareMode === 'always_follow' ? 'always_follow' : 'while_using',
          battery_pct,
        });
        if (!cancelled) reportPublishResult(updateRes);
        if (!updateRes.success) shareLocationNeedsCoordsSyncRef.current = true;
      } catch {
        shareLocationNeedsCoordsSyncRef.current = true;
        if (!cancelled) reportPublishResult({ success: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.isPremium, isSharingLocation, myCoord, heading, speed, shareMode, reportPublishResult]);

  // If the backend kill-switch is on (503), take the user out of the "sharing" UI state
  // so they aren't looking at a green pill while publishes are being rejected. We leave
  // `paused_by_admin` banner up as the reason.
  useEffect(() => {
    if (publishStatus === 'paused_by_admin' && isSharingLocation) {
      setIsSharingLocation(false);
      setShareMode('off');
      storage.set(FRIEND_LIVE_SHARE_STORAGE_KEY, '0');
      storage.set(FRIEND_LIVE_SHARE_MODE_KEY, 'off');
    }
  }, [publishStatus, isSharingLocation]);

  // Clear any publish banner when the user turns sharing off; no point keeping a
  // stale "updates failing" chip once we're not publishing.
  useEffect(() => {
    if (!isSharingLocation && publishStatus !== 'ok') {
      publishFailStreakRef.current = 0;
      setPublishStatus('ok');
    }
  }, [isSharingLocation, publishStatus]);

  /** Match MapScreen: background task only when sharing + config allow + server not paused. */
  useEffect(() => {
    if (!isSharingLocation) {
      void syncFriendLiveShareBackgroundFromPolicy({ sharingEnabled: false, canPublish: true, mode: shareMode });
      return;
    }
    const can =
      Boolean(user?.isPremium) &&
      friendTrackingEnabled &&
      liveLocationPublishingEnabled &&
      publishStatus !== 'paused_by_admin';
    void syncFriendLiveShareBackgroundFromPolicy({ sharingEnabled: true, canPublish: can, mode: shareMode });
  }, [
    isSharingLocation,
    shareMode,
    user?.isPremium,
    friendTrackingEnabled,
    liveLocationPublishingEnabled,
    publishStatus,
  ]);

  const updateLocationShareMode = useCallback(async (nextMode: FriendLiveShareMode) => {
    const nextSharing = isFriendLiveShareEnabled(nextMode);
    const prevSharing = isSharingLocation;
    const prevMode = shareMode;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSharingLocation(nextSharing);
    setShareMode(nextMode);
    storage.set(FRIEND_LIVE_SHARE_STORAGE_KEY, nextSharing ? '1' : '0');
    storage.set(FRIEND_LIVE_SHARE_MODE_KEY, nextMode);
    shareLocationNeedsCoordsSyncRef.current = nextSharing && !myCoord;
    const res = await api.put('/api/friends/location/sharing', {
      is_sharing: nextSharing,
      sharing_mode: nextMode === 'always_follow' ? 'always_follow' : 'while_using',
      ...(nextSharing && myCoord ? { lat: myCoord.lat, lng: myCoord.lng } : {}),
    });
    const err = getApiErrorMessage(res, 'Could not update location sharing right now.');
    if (err) {
      setIsSharingLocation(prevSharing);
      setShareMode(prevMode);
      storage.set(FRIEND_LIVE_SHARE_STORAGE_KEY, prevSharing ? '1' : '0');
      storage.set(FRIEND_LIVE_SHARE_MODE_KEY, prevMode);
      shareLocationNeedsCoordsSyncRef.current = prevSharing && !myCoord;
      Alert.alert('Location sharing', err);
      return;
    }
    if (nextMode === 'always_follow') {
      nudgeBackgroundLocationAfterEnablingShare();
    }
  }, [isSharingLocation, myCoord, shareMode]);

  const friendListData = useMemo(
    () =>
      friends.map((friend) => ({
        friend,
        presence: deriveFriendPresence(friend, myCoord),
      })),
    [friends, myCoord],
  );

  const filteredFriendListData = useMemo(() => {
    if (activeCategoryId === 'all') return friendListData;
    return friendListData.filter(({ friend }) =>
      (friend.categories ?? []).some((cat) => cat.id === activeCategoryId),
    );
  }, [friendListData, activeCategoryId]);

  const liveFreshCount = useMemo(
    () => filteredFriendListData.filter(({ presence }) => presence.isLiveFresh).length,
    [filteredFriendListData],
  );

  const listTheme = useMemo<FriendListCardTheme>(
    () => ({
      cardBg: 'transparent',
      text: colors.text,
      sub: colors.textSecondary,
      primary: colors.primary,
      border: colors.border,
      separator: isLight ? 'rgba(60,60,67,0.12)' : 'rgba(255,255,255,0.1)',
    }),
    [colors.text, colors.textSecondary, colors.primary, colors.border, isLight],
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

  const handleCreateCategory = useCallback(async () => {
    const name = newCategoryName.trim();
    if (!name) {
      Alert.alert('Name required', 'Enter a category name.');
      return;
    }
    const res = await api.post('/api/friends/categories', { name });
    if (!res.success) {
      Alert.alert('Could not create', res.error ?? 'Please try again.');
      return;
    }
    setNewCategoryName('');
    setShowCategoryModal(false);
    await Promise.all([loadCategories(), loadFriends({ silent: true })]);
  }, [newCategoryName, loadCategories, loadFriends]);

  const assignFriendToCategory = useCallback(async (friendId: string, categoryId: string) => {
    const res = await api.post(`/api/friends/categories/${categoryId}/members`, { friend_id: friendId });
    if (!res.success) {
      Alert.alert('Could not add friend', res.error ?? 'Please try again.');
      return;
    }
    await Promise.all([loadCategories(), loadFriends({ silent: true })]);
  }, [loadCategories, loadFriends]);

  const removeFriendFromCategory = useCallback(async (friendId: string, categoryId: string) => {
    const res = await api.delete(`/api/friends/categories/${categoryId}/members/${friendId}`);
    if (!res.success) {
      Alert.alert('Could not remove friend', res.error ?? 'Please try again.');
      return;
    }
    await Promise.all([loadCategories(), loadFriends({ silent: true })]);
  }, [loadCategories, loadFriends]);

  const handleRemoveFriend = useCallback(
    async (id: string) => {
      Alert.alert('Remove Friend', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const res = await api.delete(`/api/friends/${id}`);
            if (!res?.success) {
              Alert.alert('Error', res?.error || 'Could not remove friend. Try again.');
              return;
            }
            setSelectedFriend(null);
            loadFriends();
            loadCategories();
          },
        },
      ]);
    },
    [loadFriends, loadCategories],
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
    ({ item, index }: { item: (typeof friendListData)[0]; index: number }) => (
      <FriendListCard
        friend={item.friend}
        presence={item.presence}
        theme={listTheme}
        onPress={setSelectedFriend}
        onAvatarPress={openFriendOnMap}
        onAssignBucket={setCategoryFriendTarget}
        isLast={index === filteredFriendListData.length - 1}
      />
    ),
    [listTheme, openFriendOnMap, filteredFriendListData.length],
  );

  const pendingTotal = incomingReq.length + outgoingReq.length;

  const togglePendingExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPendingExpanded((e) => !e);
  }, []);

  const listKeyExtractor = useCallback((item: (typeof friendListData)[0]) => item.friend.id, []);

  if (!user?.isPremium) {
    const premiumFeatures: { icon: keyof typeof Ionicons.glyphMap; label: string; desc: string }[] = [
      { icon: 'people', label: 'Friend network', desc: 'Search by name, email, or friend code.' },
      { icon: 'navigate', label: 'Live location', desc: 'Share with people you trust, on your terms.' },
      { icon: 'flag', label: 'Convoy meetups', desc: 'Rally on the map with ETA sync.' },
      { icon: 'trophy', label: 'Friend duels', desc: 'Challenge drivers and bank bonus gems.' },
    ];
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

          <LinearGradient
            colors={isLight ? ['#EFF6FF', '#DBEAFE'] : ['rgba(29,78,216,0.38)', 'rgba(59,130,246,0.22)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              marginTop: 22,
              borderRadius: 20,
              padding: 18,
              borderWidth: 1,
              borderColor: isLight ? 'rgba(37,99,235,0.22)' : 'rgba(96,165,250,0.35)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <LinearGradient
                colors={[colors.ctaGradientStart, colors.ctaGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="sparkles" size={20} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800', letterSpacing: -0.2 }}>
                  What Social unlocks
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2, fontWeight: '600' }}>
                  Included with SnapRoad Premium.
                </Text>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              {premiumFeatures.map((f) => (
                <View key={f.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 11,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isLight ? 'rgba(37,99,235,0.12)' : 'rgba(96,165,250,0.18)',
                      borderWidth: 1,
                      borderColor: isLight ? 'rgba(37,99,235,0.22)' : 'rgba(96,165,250,0.28)',
                    }}
                  >
                    <Ionicons name={f.icon} size={18} color={isLight ? '#1D4ED8' : '#93C5FD'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{f.label}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginTop: 1 }}>
                      {f.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </LinearGradient>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Profile', { screen: 'ProfileMain' });
            }}
            style={{ marginTop: 16 }}
            accessibilityRole="button"
            accessibilityLabel="Upgrade to SnapRoad Premium"
          >
            <LinearGradient
              colors={[colors.ctaGradientStart, colors.ctaGradientEnd]}
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
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6 }}>
        <SocialScreenHeader
          title="Social"
          subtitle={
            section === 'friends'
              ? 'Share location with people you trust, calmly and on your terms.'
              : 'Family is a launch-safe preview while the backend remains intentionally stubbed.'
          }
          onAddPress={section === 'friends' ? () => setShowAddFriend(true) : undefined}
          accentColor={colors.primary}
          textColor={colors.text}
          subColor={colors.textSecondary}
        />
      </View>

      <Animated.View
        entering={FadeInDown.duration(280).delay(40)}
        style={[
          styles.toggleRow,
          {
            backgroundColor: isLight ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.06)',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)',
          },
        ]}
      >
        {(['friends', 'family'] as Section[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.togglePill,
              section === s && {
                backgroundColor: s === 'family' ? '#1D4ED8' : colors.primary,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.12,
                shadowRadius: 3,
                elevation: 2,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSection(s);
            }}
            activeOpacity={0.88}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons
                name={s === 'friends' ? 'people-outline' : 'home-outline'}
                size={13}
                color={section === s ? '#fff' : colors.textSecondary}
              />
              <Text style={[styles.toggleText, { color: section === s ? '#fff' : colors.textSecondary }]}>
                {s === 'friends' ? 'Friends' : 'Family'}
              </Text>
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
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setShowFriendChallengeHistory(true)}
          style={[
            styles.challengeHistoryCue,
            {
              marginHorizontal: 16,
              marginTop: 8,
              backgroundColor: isLight ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.18)',
              borderColor: isLight ? 'rgba(245,158,11,0.35)' : 'rgba(245,158,11,0.28)',
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open friend challenge history"
        >
          <View style={[styles.challengeHistoryIcon, { backgroundColor: isLight ? 'rgba(245,158,11,0.22)' : 'rgba(245,158,11,0.28)' }]}>
            <Ionicons name="trophy-outline" size={18} color="#D97706" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.challengeHistoryTitle, { color: colors.text }]}>Friend duels</Text>
            <Text style={[styles.challengeHistorySub, { color: colors.textSecondary }]} numberOfLines={2}>
              Wins, losses, and live scores. Challenge someone from a friend’s profile.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ opacity: 0.55 }} />
        </TouchableOpacity>
      )}

      {section === 'friends' && (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 16, marginTop: 6, marginBottom: 10 }}>
            {pendingTotal === 0 ? (
              <View
                style={[
                  styles.requestEmpty,
                  {
                    backgroundColor: isLight ? 'rgba(60,60,67,0.04)' : 'rgba(255,255,255,0.05)',
                    borderWidth: 0,
                  },
                ]}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.textSecondary} style={{ opacity: 0.65 }} />
                <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '500' }}>No pending requests</Text>
              </View>
            ) : (
              <>
                <Pressable
                  onPress={togglePendingExpanded}
                  style={({ pressed }) => [
                    styles.pendingSummary,
                    {
                      backgroundColor: isLight ? 'rgba(60,60,67,0.05)' : 'rgba(255,255,255,0.06)',
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View
                      style={[
                        styles.pendingIconWrap,
                        { backgroundColor: isLight ? `${colors.primary}14` : `${colors.primary}22` },
                      ]}
                    >
                      <Ionicons name="mail-unread-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.pendingSummaryTitle, { color: colors.text }]}>Pending requests ({pendingTotal})</Text>
                      <Text style={[styles.pendingSummarySub, { color: colors.textSecondary }]}>
                        {pendingExpanded ? 'Tap to collapse' : 'Tap to review invites and sent requests'}
                      </Text>
                    </View>
                    <Ionicons
                      name={pendingExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                      style={{ opacity: 0.5 }}
                    />
                  </View>
                </Pressable>
                {pendingExpanded ? (
                  <View style={styles.pendingExpandedList}>
                    {incomingReq.map((r, i) => (
                      <View
                        key={r.id}
                        style={[
                          styles.pendingDetailRow,
                          {
                            borderBottomColor: isLight ? 'rgba(60,60,67,0.1)' : 'rgba(255,255,255,0.08)',
                          },
                          i === incomingReq.length - 1 && outgoingReq.length === 0 ? { borderBottomWidth: 0 } : null,
                        ]}
                      >
                        <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                          <Text style={[styles.pendingName, { color: colors.text }]} numberOfLines={1}>
                            {r.from_name ?? 'Friend request'}
                          </Text>
                          <Text style={[styles.pendingMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                            {r.from_email ?? 'Wants to connect'}
                          </Text>
                        </View>
                        <View style={styles.pendingActions}>
                          <TouchableOpacity
                            style={[styles.reqBtnCompact, { backgroundColor: colors.primary }]}
                            onPress={async () => {
                              const res = await api.post('/api/friends/accept', { friendship_id: r.id });
                              if (res.success) {
                                loadFriends();
                                loadPending();
                                loadCategories();
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                              } else Alert.alert('Error', res.error ?? 'Could not accept');
                            }}
                          >
                            <Text style={styles.reqBtnCompactT}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.reqBtnCompact, { backgroundColor: colors.danger }]}
                            onPress={async () => {
                              const res = await api.post('/api/friends/reject', { friendship_id: r.id });
                              if (!res?.success) {
                                Alert.alert('Error', res?.error ?? 'Could not decline this request.');
                                return;
                              }
                              loadPending();
                            }}
                          >
                            <Text style={styles.reqBtnCompactT}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    {outgoingReq.map((r, i) => (
                      <View
                        key={r.id}
                        style={[
                          styles.pendingDetailRow,
                          {
                            borderBottomColor: isLight ? 'rgba(60,60,67,0.1)' : 'rgba(255,255,255,0.08)',
                          },
                          i === outgoingReq.length - 1 ? { borderBottomWidth: 0 } : null,
                        ]}
                      >
                        <Ionicons name="paper-plane-outline" size={16} color={colors.textSecondary} style={{ marginRight: 10, opacity: 0.55 }} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.pendingMetaStrong, { color: colors.text }]} numberOfLines={1}>
                            Sent to {r.to_name ?? 'friend'}
                          </Text>
                          <Text style={[styles.pendingMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                            Waiting for them to accept
                          </Text>
                        </View>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Cancel friend request to ${r.to_name ?? 'this driver'}`}
                          style={[
                            styles.reqBtnCompact,
                            {
                              backgroundColor: isLight ? 'rgba(60,60,67,0.08)' : 'rgba(255,255,255,0.08)',
                              borderWidth: 1,
                              borderColor: isLight ? 'rgba(60,60,67,0.14)' : 'rgba(255,255,255,0.12)',
                            },
                          ]}
                          onPress={() => {
                            Alert.alert(
                              'Cancel request?',
                              `Withdraw your pending friend request to ${r.to_name ?? 'this driver'}?`,
                              [
                                { text: 'Keep', style: 'cancel' },
                                {
                                  text: 'Withdraw',
                                  style: 'destructive',
                                  onPress: async () => {
                                    // Optimistic: pull the row so the UI feels instant; restore on failure.
                                    const prev = outgoingReq;
                                    setOutgoingReq((cur) => cur.filter((x) => x.id !== r.id));
                                    const res = await api.delete(`/api/friends/requests/${r.id}`);
                                    if (!res?.success) {
                                      // 404 means the row was already resolved (accepted/declined/gone) —
                                      // treat it as success since the UI has already dropped it.
                                      if (res?.statusCode === 404) {
                                        loadPending();
                                        return;
                                      }
                                      setOutgoingReq(prev);
                                      Alert.alert('Error', res?.error || 'Could not cancel this request.');
                                      return;
                                    }
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    loadPending();
                                  },
                                },
                              ],
                            );
                          }}
                        >
                          <Text style={[styles.reqBtnCompactT, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bucketScrollContent}
          >
            <TouchableOpacity
              style={[
                styles.bucketChipPremium,
                activeCategoryId === 'all' && styles.bucketChipPremiumActive,
                {
                  borderColor: activeCategoryId === 'all' ? colors.primary : 'transparent',
                  backgroundColor:
                    activeCategoryId === 'all'
                      ? isLight
                        ? `${colors.primary}18`
                        : `${colors.primary}28`
                      : isLight
                        ? 'rgba(60,60,67,0.06)'
                        : 'rgba(255,255,255,0.07)',
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveCategoryId('all');
              }}
              activeOpacity={0.88}
            >
              <Text
                style={[
                  styles.bucketChipPremiumText,
                  { color: activeCategoryId === 'all' ? colors.primary : colors.textSecondary },
                ]}
              >
                All · {friendListData.length}
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => {
              const active = activeCategoryId === cat.id;
              const c = cat.color || colors.primary;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.bucketChipPremium,
                    active && styles.bucketChipPremiumActive,
                    {
                      borderColor: active ? c : 'transparent',
                      backgroundColor: active ? `${c}24` : isLight ? 'rgba(60,60,67,0.06)' : 'rgba(255,255,255,0.07)',
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveCategoryId(cat.id);
                  }}
                  activeOpacity={0.88}
                >
                  <View style={[styles.bucketColorDot, { backgroundColor: c }]} />
                  <Text style={[styles.bucketChipPremiumText, { color: active ? c : colors.textSecondary }]}>
                    {cat.name} · {cat.friend_count ?? 0}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[
                styles.newBucketInline,
                {
                  borderColor: isLight ? 'rgba(60,60,67,0.1)' : 'rgba(255,255,255,0.12)',
                },
              ]}
              onPress={() => setShowCategoryModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color={colors.textSecondary} style={{ opacity: 0.75 }} />
              <Text style={[styles.newBucketInlineText, { color: colors.textSecondary }]}>New bucket</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={[styles.shareLocCard, { backgroundColor: isLight ? (isSharingLocation ? 'rgba(52,199,89,0.08)' : 'rgba(60,60,67,0.04)') : (isSharingLocation ? 'rgba(52,199,89,0.12)' : 'rgba(255,255,255,0.05)') }]}>
            <View style={styles.shareLocCardInner}>
              <View style={[styles.shareLocIcon, { backgroundColor: isSharingLocation ? 'rgba(52,199,89,0.18)' : (isLight ? 'rgba(60,60,67,0.08)' : 'rgba(255,255,255,0.1)') }]}>
                <Ionicons
                  name={isSharingLocation ? 'location' : 'location-outline'}
                  size={20}
                  color={isSharingLocation ? '#34C759' : colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.shareLocTitle, { color: colors.text }]}>
                  {shareMode === 'always_follow'
                    ? 'Always Follow is on'
                    : isSharingLocation
                      ? 'Sharing while using SnapRoad'
                      : 'Location sharing off'}
                </Text>
                <Text style={[styles.shareLocCaption, { color: colors.textSecondary }]}>
                  {shareMode === 'always_follow'
                    ? `Background updates for ${friends.length} friend${friends.length !== 1 ? 's' : ''}`
                    : isSharingLocation
                      ? `Visible while active to ${friends.length} friend${friends.length !== 1 ? 's' : ''}`
                    : 'Friends cannot see where you are'}
                </Text>
                {shareMode === 'always_follow' && Platform.OS === 'ios' ? (
                  <Text style={{ fontSize: 11, lineHeight: 15, color: colors.textTertiary, marginTop: 4 }}>
                    Background sharing uses Always location. Set it in Settings if friends see an old
                    position.
                  </Text>
                ) : null}
              </View>
              <Switch
                value={isSharingLocation}
                onValueChange={(v) => {
                  void updateLocationShareMode(v ? (shareMode === 'always_follow' ? 'always_follow' : 'while_using') : 'off');
                }}
                trackColor={{ false: colors.border, true: '#34C759' }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.shareModeRow}>
              {([
                ['while_using', 'While using', 'App open', 'navigate-outline'],
                ['always_follow', 'Always Follow', 'Background', 'infinite-outline'],
              ] as const).map(([mode, title, sub, icon]) => {
                const active = shareMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => void updateLocationShareMode(mode)}
                    activeOpacity={0.86}
                    style={[
                      styles.shareModeButton,
                      {
                        backgroundColor: active ? (isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.12)') : 'transparent',
                        borderColor: active ? 'rgba(52,199,89,0.45)' : (isLight ? 'rgba(60,60,67,0.12)' : 'rgba(255,255,255,0.12)'),
                      },
                    ]}
                  >
                    <Ionicons name={icon} size={15} color={active ? '#34C759' : colors.textSecondary} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.shareModeTitle, { color: active ? colors.text : colors.textSecondary }]}>{title}</Text>
                      <Text style={[styles.shareModeSub, { color: colors.textTertiary }]}>{sub}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {publishStatus !== 'ok' ? (
              <View
                accessibilityRole="alert"
                accessibilityLabel={
                  publishStatus === 'paused_by_admin'
                    ? 'Live location paused by admin'
                    : 'Live location updates are not reaching our servers'
                }
                style={{
                  marginTop: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                  backgroundColor:
                    publishStatus === 'paused_by_admin'
                      ? (isLight ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.14)')
                      : (isLight ? 'rgba(234,179,8,0.1)' : 'rgba(234,179,8,0.16)'),
                  borderWidth: 1,
                  borderColor:
                    publishStatus === 'paused_by_admin'
                      ? (isLight ? 'rgba(239,68,68,0.22)' : 'rgba(239,68,68,0.34)')
                      : (isLight ? 'rgba(234,179,8,0.26)' : 'rgba(234,179,8,0.36)'),
                }}
              >
                <Ionicons
                  name={publishStatus === 'paused_by_admin' ? 'pause-circle' : 'cloud-offline-outline'}
                  size={16}
                  color={publishStatus === 'paused_by_admin' ? '#EF4444' : '#CA8A04'}
                  style={{ marginTop: 1 }}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.shareLocCaption, { color: colors.text, fontWeight: '600' }]}>
                    {publishStatus === 'paused_by_admin'
                      ? 'Live location paused'
                      : 'Live location updates aren\u2019t reaching us'}
                  </Text>
                  <Text style={[styles.shareLocCaption, { color: colors.textSecondary, marginTop: 2 }]}>
                    {publishStatus === 'paused_by_admin'
                      ? 'An admin has temporarily disabled sharing. Try again later.'
                      : 'Check your connection — we\u2019ll retry automatically.'}
                  </Text>
                </View>
                {publishStatus === 'transient' ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss live location warning"
                    onPress={() => {
                      publishFailStreakRef.current = 0;
                      setPublishStatus('ok');
                    }}
                    style={{ paddingHorizontal: 6, paddingVertical: 2 }}
                  >
                    <Ionicons name="close" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={[styles.friendsSectionHeader, { borderBottomColor: isLight ? 'rgba(60,60,67,0.08)' : 'rgba(255,255,255,0.07)' }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.friendsSectionTitle, { color: colors.text }]}>Friends</Text>
              <Text style={[styles.friendsSectionCaption, { color: colors.textSecondary }]}>
                {liveFreshCount > 0
                  ? `${liveFreshCount} live now · ${friends.length} total`
                  : friends.length > 0
                    ? `${friends.length} friend${friends.length !== 1 ? 's' : ''}`
                    : 'Your trusted circle'}
              </Text>
            </View>
          </View>

          {friendsLoading ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 14 }}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} width="100%" height={84} borderRadius={12} />
              ))}
            </View>
          ) : filteredFriendListData.length === 0 ? (
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyHero,
                  {
                    backgroundColor: isLight ? 'rgba(60,60,67,0.04)' : 'rgba(255,255,255,0.05)',
                    borderWidth: 0,
                  },
                ]}
              >
                <LinearGradient colors={[`${colors.primary}28`, `${colors.primary}06`]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Ionicons name="people" size={32} color={colors.primary} style={{ opacity: 0.95 }} />
                <Text style={[styles.emptyHeroTitle, { color: colors.text }]}>Grow your convoy</Text>
                <Text style={[styles.emptyHeroSub, { color: colors.textSecondary }]}>
                  Invite friends to share live location and meet up on the map—without the noise.
                </Text>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {friends.length === 0 ? 'No friends yet' : 'No friends in this filter'}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                {friends.length === 0
                  ? 'Tap the + button above to search by name, email, or friend code.'
                  : 'Try another collection or assign someone with ··· on a friend’s row.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredFriendListData}
              keyExtractor={listKeyExtractor}
              refreshControl={
                <RefreshControl
                  refreshing={friendsLoading}
                  onRefresh={() => {
                    loadFriends();
                    loadPending();
                    loadCategories();
                  }}
                  tintColor={colors.primary}
                />
              }
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 6,
                paddingBottom: insets.bottom + 28,
              }}
              ListHeaderComponent={
                filteredFriendListData.length > 0 && filteredFriendListData.length <= 2 ? (
                  <View
                    style={[
                      styles.tipCard,
                      {
                        backgroundColor: isLight ? 'rgba(60,60,67,0.04)' : 'rgba(255,255,255,0.05)',
                        borderWidth: 0,
                      },
                    ]}
                  >
                    <Ionicons name="sparkles-outline" size={18} color={colors.primary} style={{ opacity: 0.85 }} />
                    <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                      Pull to refresh. Location sharing is controlled from the toggle above—only when you want it.
                    </Text>
                  </View>
                ) : null
              }
              renderItem={renderFriend}
            />
          )}
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

      <Modal visible={showCategoryModal} onClose={() => { setShowCategoryModal(false); setNewCategoryName(''); }} scrollable={false}>
        <Text style={[styles.modalTitle, { color: colors.text }]}>Create bucket</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
          Buckets help you filter friends quickly (for example: Family, Close Friends, Coworkers).
        </Text>
        <TextInput
          style={[styles.modalInput, { color: colors.text, backgroundColor: colors.surfaceSecondary }]}
          placeholder="Bucket name"
          placeholderTextColor={colors.textSecondary}
          value={newCategoryName}
          onChangeText={setNewCategoryName}
          maxLength={48}
        />
        <TouchableOpacity
          style={[styles.modalBtn, { backgroundColor: newCategoryName.trim() ? colors.primary : colors.border }]}
          onPress={handleCreateCategory}
          activeOpacity={0.8}
          disabled={!newCategoryName.trim()}
        >
          <Text style={styles.modalBtnText}>Create bucket</Text>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!categoryFriendTarget} onClose={() => setCategoryFriendTarget(null)} scrollable={false}>
        {categoryFriendTarget ? (
          <View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Assign bucket</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
              Add {categoryFriendTarget.name} to one or more buckets.
            </Text>
            <ScrollView style={{ maxHeight: 260 }}>
              {categories.length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 12 }}>
                  Create a bucket first.
                </Text>
              ) : (
                categories.map((cat) => {
                  const inCat = (categoryFriendTarget.categories ?? []).some((fcat) => fcat.id === cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.assignRow,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: inCat ? cat.color || colors.primary : colors.border,
                        },
                      ]}
                      onPress={async () => {
                        if (inCat) {
                          await removeFriendFromCategory(categoryFriendTarget.friend_id, cat.id);
                        } else {
                          await assignFriendToCategory(categoryFriendTarget.friend_id, cat.id);
                        }
                        setCategoryFriendTarget((prev) =>
                          prev && prev.friend_id === categoryFriendTarget.friend_id
                            ? {
                                ...prev,
                                categories: inCat
                                  ? (prev.categories ?? []).filter((c) => c.id !== cat.id)
                                  : [...(prev.categories ?? []), { id: cat.id, name: cat.name, color: cat.color }],
                              }
                            : prev,
                        );
                      }}
                    >
                      <View style={[styles.bucketColorDot, { backgroundColor: cat.color || colors.primary }]} />
                      <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' }}>{cat.name}</Text>
                      <Ionicons name={inCat ? 'checkmark-circle' : 'add-circle-outline'} size={18} color={inCat ? cat.color || colors.primary : colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity onPress={() => setCategoryFriendTarget(null)} style={styles.dismissTap} hitSlop={12}>
              <Text style={[styles.dismiss, { color: colors.textSecondary }]}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : null}
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
            onViewOnMap={() => {
              const f = selectedFriend;
              if (!f) return;
              setSelectedFriend(null);
              openFriendOnMap(f);
            }}
            onRemove={handleRemoveFriend}
            onChallenge={() => {
              if (!selectedFriend) return;
              setChallengeFriend(selectedFriend);
              setShowChallengeModal(true);
            }}
          />
        ) : null}
      </Modal>

      <ChallengeModal
        visible={showChallengeModal}
        onClose={() => {
          setShowChallengeModal(false);
          setChallengeFriend(null);
        }}
        targetFriend={challengeFriend ? { id: challengeFriend.friend_id, name: challengeFriend.name } : null}
        gemBalance={user?.gems ?? 0}
        onChallenged={(remaining) => {
          if (remaining != null && Number.isFinite(remaining)) {
            updateUser({ gems: Math.max(0, Math.floor(remaining)) });
          }
        }}
      />

      <FriendChallengeHistoryModal
        visible={showFriendChallengeHistory}
        onClose={() => setShowFriendChallengeHistory(false)}
        onGemsUpdated={(gems) => updateUser({ gems })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  challengeHistoryCue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  challengeHistoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeHistoryTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  challengeHistorySub: { fontSize: 12, marginTop: 3, lineHeight: 16, fontWeight: '500' },
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 2,
    borderRadius: 12,
    padding: 3,
  },
  togglePill: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  toggleText: { fontSize: 13, fontWeight: '600' },
  comingSoonDot: { backgroundColor: 'rgba(29,78,216,0.22)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  comingSoonDotText: { color: '#93C5FD', fontSize: 8, fontWeight: '800' },

  requestEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pendingSummary: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  pendingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingSummaryTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  pendingSummarySub: { fontSize: 13, fontWeight: '500', marginTop: 3, lineHeight: 18 },
  pendingExpandedList: { marginTop: 12, gap: 2, paddingBottom: 2 },
  pendingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pendingName: { fontSize: 15, fontWeight: '600' },
  pendingMeta: { fontSize: 13, fontWeight: '500', marginTop: 3, opacity: 0.9 },
  pendingMetaStrong: { fontSize: 14, fontWeight: '600' },
  pendingActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reqBtnCompact: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  reqBtnCompactT: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bucketScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
    gap: 8,
    alignItems: 'center',
  },
  bucketChipPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bucketChipPremiumActive: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  bucketChipPremiumText: { fontSize: 13, fontWeight: '600' },
  newBucketInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginLeft: 2,
  },
  newBucketInlineText: { fontSize: 12, fontWeight: '600' },
  friendsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  friendsSectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.35 },
  friendsSectionCaption: { fontSize: 13, fontWeight: '500', marginTop: 3, opacity: 0.92 },
  shareLocCard: {
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  shareLocCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  shareModeRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  shareModeButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareModeTitle: { fontSize: 12, fontWeight: '800' },
  shareModeSub: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  shareLocIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLocTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  shareLocCaption: { fontSize: 12, fontWeight: '500', marginTop: 2, opacity: 0.9 },
  bucketColorDot: { width: 8, height: 8, borderRadius: 4 },
  assignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  dismissTap: { alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  dismiss: { fontSize: 14, fontWeight: '600' },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  emptyHero: {
    width: '100%',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  emptyHeroTitle: { fontSize: 17, fontWeight: '800', marginTop: 10 },
  emptyHeroSub: { fontSize: 12, textAlign: 'center', lineHeight: 17, marginTop: 6 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  previewOverlayBadge: { alignItems: 'center', marginBottom: 12, marginTop: 4 },
  comingSoonPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  comingSoonPillText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  familyTruthCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },

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
