import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, StatusBar, useColorScheme, TouchableOpacity, Text } from 'react-native';
import { MapboxNavigationView, type MapboxNavigationViewRef } from '@badatgil/expo-mapbox-navigation';
import { CommonActions, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation as useRNNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MapStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useNavigationMode } from '../contexts/NavigatingContext';
import { useAuth } from '../contexts/AuthContext';
import type { DrivingMode, Incident } from '../types';
import {
  useNativeNavBridge,
  type NativeNavProgressEvent,
} from '../hooks/useNativeNavBridge';
import { normalizeNativeNavParams } from '../navigation/nativeNavGuard';
import * as Sentry from '@sentry/react-native';
import { api } from '../api/client';
import OrionQuickMic from '../components/orion/OrionQuickMic';

/** Mapbox Standard style — the navigation SDK applies its own lighting/day-night. */
const NAV_MAP_STYLE = 'mapbox://styles/mapbox/standard';

type NativeNavLocationEvent = {
  latitude: number;
  longitude: number;
  course?: number;
  speed?: number;
  horizontalAccuracy?: number;
  timestamp?: number;
};

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Full-screen native Mapbox Navigation experience.
 *
 * Pushed onto the MapStack when the native-SDK feature flag is on.
 * Receives origin/destination/drivingMode via route params, renders the native SDK UI,
 * and returns trip summary data to MapScreen on exit.
 */
export default function NativeNavigationScreen() {
  const rnNav = useRNNavigation<StackNavigationProp<MapStackParamList>>();
  const route = useRoute<RouteProp<MapStackParamList, 'NativeNavigation'>>();
  const { setIsNavigating } = useNavigationMode();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const didExitRef = useRef(false);
  const didHandleInvalidParamsRef = useRef(false);
  const navRef = useRef<MapboxNavigationViewRef | null>(null);
  const colorScheme = useColorScheme();
  const lastIncidentFetchAtRef = useRef(0);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [dismissedIncidentId, setDismissedIncidentId] = useState<string | number | null>(null);
  const [orionQuickReply, setOrionQuickReply] = useState<string | null>(null);

  const normalizedParams = useMemo(() => normalizeNativeNavParams(route.params), [route.params]);
  const origin = normalizedParams?.origin;
  const destination = normalizedParams?.destination;
  const voiceMuted = normalizedParams?.voiceMuted ?? false;
  const drivingMode: DrivingMode = normalizedParams?.drivingMode ?? 'adaptive';
  const reportHint = useMemo(() => {
    const raw = route.params?.reportHint;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  }, [route.params?.reportHint]);

  useEffect(() => {
    setIsNavigating(true);
    return () => {
      setIsNavigating(false);
    };
  }, [setIsNavigating]);

  const bridge = useNativeNavBridge({
    destination: destination ?? { lat: 0, lng: 0 },
    originName: undefined,
    isPremium: user?.isPremium,
  });

  const coordinates = useMemo(() => {
    if (!origin || !destination) return [];
    return [
      { latitude: origin.lat, longitude: origin.lng },
      { latitude: destination.lat, longitude: destination.lng },
    ];
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  const followingZoom = useMemo(() => {
    switch (drivingMode) {
      case 'calm':
        return 16.5;
      case 'sport':
        return 17.5;
      default:
        return 17.0;
    }
  }, [drivingMode]);

  const exitWithResult = useCallback(
    async (arrived: boolean) => {
      if (didExitRef.current) return;
      didExitRef.current = true;
      const tripSummary = bridge.buildTripSummary(arrived);
      try {
        await navRef.current?.stopNavigation?.();
      } catch {
        /* native session is already ending */
      }
      rnNav.dispatch(
        CommonActions.navigate({
          name: 'MapMain',
          params: { nativeNavResult: { tripSummary, arrived } },
          merge: true,
        }),
      );
      if (rnNav.canGoBack()) {
        requestAnimationFrame(() => {
          rnNav.goBack();
        });
      }
    },
    [bridge, rnNav],
  );

  const handleCancel = useCallback(() => {
    exitWithResult(false);
  }, [exitWithResult]);

  const handleArrival = useCallback(() => {
    bridge.handleArrival();
    exitWithResult(true);
  }, [bridge, exitWithResult]);

  const handleProgressChanged = useCallback(
    (event: { nativeEvent: NativeNavProgressEvent }) => {
      bridge.handleProgressChanged(event);
    },
    [bridge],
  );

  const fetchNearbyIncidents = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await api.get<{ success?: boolean; data?: Incident[] }>(
          `/api/incidents/nearby?lat=${lat}&lng=${lng}&radius_miles=2`,
        );
        if (!res.success || res.data == null) return;
        const data = (res.data as { data?: Incident[] }).data;
        if (!Array.isArray(data) || data.length === 0) {
          setActiveIncident(null);
          return;
        }
        const nearest = data.reduce<Incident | null>((best, inc) => {
          if (
            dismissedIncidentId != null &&
            String(inc.id) === String(dismissedIncidentId)
          ) {
            return best;
          }
          if (!best) return inc;
          const incDist = haversineMeters(lat, lng, inc.lat, inc.lng);
          const bestDist = haversineMeters(lat, lng, best.lat, best.lng);
          return incDist < bestDist ? inc : best;
        }, null);
        setActiveIncident(nearest);
      } catch {
        /* offline / tunnel / transient backend issue */
      }
    },
    [dismissedIncidentId],
  );

  const handleLocationUpdate = useCallback(
    (event: { nativeEvent: NativeNavLocationEvent }) => {
      const lat = Number(event.nativeEvent?.latitude);
      const lng = Number(event.nativeEvent?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const now = Date.now();
      if (now - lastIncidentFetchAtRef.current < 12000) return;
      lastIncidentFetchAtRef.current = now;
      void fetchNearbyIncidents(lat, lng);
    },
    [fetchNearbyIncidents],
  );

  const handleDismissIncident = useCallback(() => {
    setDismissedIncidentId(activeIncident?.id ?? null);
    setActiveIncident(null);
  }, [activeIncident?.id]);

  const handleConfirmIncident = useCallback(
    async (confirmed: boolean) => {
      if (!activeIncident) return;
      const current = activeIncident;
      setDismissedIncidentId(current.id);
      setActiveIncident(null);
      try {
        await api.post('/api/incidents/confirm', {
          incident_id: current.id,
          confirmed,
        });
      } catch {
        /* best-effort community feedback */
      }
    },
    [activeIncident],
  );

  useEffect(() => {
    if (!origin) return;
    void fetchNearbyIncidents(origin.lat, origin.lng);
  }, [fetchNearbyIncidents, origin]);

  useEffect(() => {
    if (!orionQuickReply) return;
    const t = setTimeout(() => setOrionQuickReply(null), 5500);
    return () => clearTimeout(t);
  }, [orionQuickReply]);

  useEffect(() => {
    if (normalizedParams || didHandleInvalidParamsRef.current) return;
    didHandleInvalidParamsRef.current = true;
    rnNav.goBack();
  }, [normalizedParams, rnNav]);

  if (!normalizedParams || coordinates.length < 2) {
    return null;
  }

  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0f' : '#000' }]}>
      <StatusBar barStyle="light-content" />
      <MapboxNavigationView
        ref={navRef}
        style={styles.nav}
        coordinates={coordinates}
        mute={voiceMuted}
        routeProfile={bridge.routeProfile}
        mapStyle={NAV_MAP_STYLE}
        followingZoom={followingZoom}
        drivingMode={drivingMode}
        onRouteProgressChanged={handleProgressChanged}
        onNavigationLocationUpdate={handleLocationUpdate}
        onCancelNavigation={handleCancel}
        onFinalDestinationArrival={handleArrival}
        onRouteChanged={() => {}}
        onUserOffRoute={() => {}}
        onRoutesLoaded={() => {}}
        onRouteFailedToLoad={(event) => {
          const errorMessage = event?.nativeEvent?.errorMessage || 'Unknown route-load error';
          Sentry.captureMessage('native_navigation_route_failed_to_load', {
            level: 'error',
            extra: { errorMessage, drivingMode },
          });
          console.warn('[NativeNavigation] route load failed', errorMessage);
        }}
      />
      {activeIncident ? (
        <View style={[styles.reportCard, { top: insets.top + 12 }]}>
          <View style={styles.reportCardTop}>
            <View style={styles.reportCardTitleRow}>
              <Ionicons name="warning-outline" size={16} color="#FCD34D" />
              <Text style={styles.reportCardTitle} numberOfLines={1}>
                {activeIncident.title || activeIncident.type}
              </Text>
            </View>
            <TouchableOpacity onPress={handleDismissIncident} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.72)" />
            </TouchableOpacity>
          </View>
          <Text style={styles.reportCardSub} numberOfLines={2}>
            {(activeIncident.distance_miles ?? 0).toFixed(1)} mi ahead · {activeIncident.upvotes ?? 0} confirmed
          </Text>
          <View style={styles.reportCardActions}>
            <TouchableOpacity style={[styles.reportActionBtn, styles.reportActionPositive]} onPress={() => void handleConfirmIncident(true)}>
              <Ionicons name="thumbs-up" size={14} color="#fff" />
              <Text style={styles.reportActionText}>Still there</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.reportActionBtn, styles.reportActionNegative]} onPress={() => void handleConfirmIncident(false)}>
              <Ionicons name="thumbs-down" size={14} color="#fff" />
              <Text style={styles.reportActionText}>Gone</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : !!reportHint ? (
        <View style={[styles.reportHint, { top: insets.top + 12 }]}>
          <Ionicons name="warning-outline" size={14} color="#FCD34D" />
          <Text style={styles.reportHintText} numberOfLines={2}>{reportHint}</Text>
        </View>
      ) : null}
      <View style={[styles.orionFabWrap, { right: 14, bottom: insets.bottom + 78 }]}>
        <OrionQuickMic
          visible
          isPremium={Boolean(user?.isPremium)}
          interactionMode="navigation"
          onOpenChat={() => {}}
          onReply={(text) => setOrionQuickReply(text)}
        />
      </View>
      {!!orionQuickReply && (
        <View style={[styles.orionReplyStrip, { left: 14, right: 14, bottom: insets.bottom + 138 }]}>
          <Ionicons name="sparkles-outline" size={14} color="#8B5CF6" />
          <Text style={styles.orionReplyStripText} numberOfLines={2}>
            {orionQuickReply}
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.recenterBtn, { right: 14, bottom: insets.bottom + 18 }]}
        activeOpacity={0.85}
        onPress={() => navRef.current?.recenterMap?.()}
      >
        <Ionicons name="locate" size={16} color="#fff" />
        <Text style={styles.recenterText}>Recenter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flex: 1 },
  reportHint: {
    position: 'absolute',
    left: 14,
    right: 14,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportHintText: { color: '#E5E7EB', fontSize: 12, fontWeight: '600', flexShrink: 1 },
  reportCard: {
    position: 'absolute',
    left: 14,
    right: 14,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  reportCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reportCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  reportCardTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  reportCardSub: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 6,
  },
  reportCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  reportActionBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reportActionPositive: {
    backgroundColor: '#059669',
  },
  reportActionNegative: {
    backgroundColor: '#DC2626',
  },
  reportActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  orionFabWrap: {
    position: 'absolute',
    zIndex: 12,
  },
  orionReplyStrip: {
    position: 'absolute',
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orionReplyStripText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  recenterBtn: {
    position: 'absolute',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recenterText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
