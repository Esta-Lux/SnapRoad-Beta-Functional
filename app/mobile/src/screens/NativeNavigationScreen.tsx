import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, StatusBar, useColorScheme, TouchableOpacity, Text } from 'react-native';
import { MapboxNavigationView, type MapboxNavigationViewRef } from '@badatgil/expo-mapbox-navigation';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation as useRNNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MapStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useNavigationMode } from '../contexts/NavigatingContext';
import { useAuth } from '../contexts/AuthContext';
import type { DrivingMode, Incident } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { DRIVING_MODES } from '../constants/modes';
import {
  useNativeNavBridge,
  type NativeNavProgressEvent,
} from '../hooks/useNativeNavBridge';
import { normalizeNativeNavParams } from '../navigation/nativeNavGuard';
import * as Sentry from '@sentry/react-native';
import { api } from '../api/client';
import OrionQuickMic from '../components/orion/OrionQuickMic';
import {
  extractCameraList,
  haversineMeters,
  pickCameraAhead,
  type CameraAhead,
} from '../lib/nativeNavHelpers';

const DEFAULT_NAV_MAP_STYLE = 'mapbox://styles/mapbox/standard';

type NativeNavLocationEvent = {
  latitude: number;
  longitude: number;
  course?: number;
  speed?: number;
  horizontalAccuracy?: number;
  timestamp?: number;
};

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
  const { colors, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const didExitRef = useRef(false);
  const didHandleInvalidParamsRef = useRef(false);
  const navRef = useRef<MapboxNavigationViewRef | null>(null);
  const colorScheme = useColorScheme();
  /** Gated so async fetches that resolve after unmount don't call setState. */
  const isMountedRef = useRef(true);
  const lastIncidentFetchAtRef = useRef(0);
  const lastIncidentFetchCoordRef = useRef<{ lat: number; lng: number } | null>(null);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [dismissedIncidentId, setDismissedIncidentId] = useState<string | number | null>(null);
  const [orionQuickReply, setOrionQuickReply] = useState<string | null>(null);
  /** Last location + course reported by the native SDK; used to gate camera/incident fetches by distance. */
  const lastCourseRef = useRef<number | null>(null);
  const lastCameraFetchAtRef = useRef(0);
  const lastCameraFetchCoordRef = useRef<{ lat: number; lng: number } | null>(null);
  const [cameraAhead, setCameraAhead] = useState<CameraAhead | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const normalizedParams = useMemo(() => normalizeNativeNavParams(route.params), [route.params]);
  const origin = normalizedParams?.origin;
  const destination = normalizedParams?.destination;
  const voiceMuted = normalizedParams?.voiceMuted ?? false;
  const drivingMode: DrivingMode = normalizedParams?.drivingMode ?? 'adaptive';
  const mapStyleUrl = normalizedParams?.mapStyleUrl ?? DEFAULT_NAV_MAP_STYLE;
  const modeConfig = DRIVING_MODES[drivingMode];
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
  const nativeViewKey = useMemo(
    () =>
      [
        origin?.lat ?? 'na',
        origin?.lng ?? 'na',
        destination?.lat ?? 'na',
        destination?.lng ?? 'na',
        drivingMode,
        mapStyleUrl,
      ].join(':'),
    [origin?.lat, origin?.lng, destination?.lat, destination?.lng, drivingMode, mapStyleUrl],
  );

  const followingZoom = modeConfig.navZoom;
  const followingPitch = modeConfig.navPitch;

  const exitWithResult = useCallback(
    async (arrived: boolean) => {
      if (didExitRef.current) return;
      didExitRef.current = true;
      try {
        await navRef.current?.stopNavigation?.();
      } catch {
        /* native session is already ending */
      }
      // Full trip completion: server post + profile totals + stats bump. Summary is
      // returned so MapScreen renders the server-authoritative gems/xp/profile totals.
      const tripSummary = await bridge.completeTripWithServer(arrived);
      rnNav.reset({
        index: 0,
        routes: [{ name: 'MapMain', params: { nativeNavResult: { tripSummary, arrived } } }],
      });
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

  /** Fetch OHGO traffic cameras within ~30 km and surface the nearest one ahead on course. */
  const fetchNearbyCameras = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await api.get<unknown>(
          `/api/map/cameras?lat=${lat}&lng=${lng}&radius=30`,
        );
        if (!isMountedRef.current) return;
        if (!res.success || res.data == null) return;
        const items = extractCameraList(res.data);
        lastCameraFetchCoordRef.current = { lat, lng };
        if (items.length === 0) {
          setCameraAhead(null);
          return;
        }
        const best = pickCameraAhead(lat, lng, lastCourseRef.current, items);
        if (!isMountedRef.current) return;
        setCameraAhead(best);
      } catch {
        /* offline / tunnel / transient backend issue */
      }
    },
    [],
  );

  const fetchNearbyIncidents = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await api.get<{ success?: boolean; data?: Incident[] }>(
          `/api/incidents/nearby?lat=${lat}&lng=${lng}&radius_miles=2`,
        );
        if (!isMountedRef.current) return;
        if (!res.success || res.data == null) return;
        const data = (res.data as { data?: Incident[] }).data;
        if (!Array.isArray(data) || data.length === 0) {
          lastIncidentFetchCoordRef.current = { lat, lng };
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
        lastIncidentFetchCoordRef.current = { lat, lng };
        if (!isMountedRef.current) return;
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
      const course = Number(event.nativeEvent?.course);
      if (Number.isFinite(course)) lastCourseRef.current = course;
      const now = Date.now();

      const lastIncidentCoord = lastIncidentFetchCoordRef.current;
      const incMoved =
        lastIncidentCoord != null
          ? haversineMeters(lastIncidentCoord.lat, lastIncidentCoord.lng, lat, lng)
          : Number.POSITIVE_INFINITY;
      if (now - lastIncidentFetchAtRef.current >= 3000 || incMoved >= 180) {
        lastIncidentFetchAtRef.current = now;
        void fetchNearbyIncidents(lat, lng);
      }

      const lastCamCoord = lastCameraFetchCoordRef.current;
      const camMoved =
        lastCamCoord != null
          ? haversineMeters(lastCamCoord.lat, lastCamCoord.lng, lat, lng)
          : Number.POSITIVE_INFINITY;
      // Cameras update slower than incidents to keep request volume reasonable during a trip.
      if (now - lastCameraFetchAtRef.current >= 15000 || camMoved >= 1200) {
        lastCameraFetchAtRef.current = now;
        void fetchNearbyCameras(lat, lng);
      }
    },
    [fetchNearbyIncidents, fetchNearbyCameras],
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
    void fetchNearbyCameras(origin.lat, origin.lng);
  }, [fetchNearbyIncidents, fetchNearbyCameras, origin]);

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
  const reportSurface = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.9)';
  const reportBorder = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.18)';
  const chromeSurface = isLight ? modeConfig.etaBarBg : modeConfig.etaBarBgDark;
  const chromeText = isLight ? colors.text : modeConfig.etaValueColor;
  const chromeSubtle = isLight ? colors.textSecondary : modeConfig.etaLabelColor;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0f' : '#000' }]}>
      <StatusBar barStyle="light-content" />
      <MapboxNavigationView
        key={nativeViewKey}
        ref={navRef}
        style={styles.nav}
        coordinates={coordinates}
        mute={voiceMuted}
        routeProfile={bridge.routeProfile}
        mapStyle={mapStyleUrl}
        followingZoom={followingZoom}
        followingPitch={followingPitch}
        drivingMode={drivingMode}
        appTheme={isLight ? 'light' : 'dark'}
        navigationLogicOnly={false}
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
        <View
          style={[
            styles.reportCard,
            {
              top: insets.top + 12,
              backgroundColor: reportSurface,
              borderColor: reportBorder,
            },
          ]}
        >
          <View style={styles.reportCardTop}>
            <View style={styles.reportCardTitleRow}>
              <Ionicons name="warning-outline" size={16} color="#FCD34D" />
              <Text style={[styles.reportCardTitle, { color: chromeText }]} numberOfLines={1}>
                {activeIncident.title || activeIncident.type}
              </Text>
            </View>
            <TouchableOpacity onPress={handleDismissIncident} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={18} color={chromeSubtle} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.reportCardSub, { color: chromeSubtle }]} numberOfLines={2}>
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
        <View
          style={[
            styles.reportHint,
            {
              top: insets.top + 12,
              backgroundColor: reportSurface,
              borderColor: reportBorder,
            },
          ]}
        >
          <Ionicons name="warning-outline" size={14} color="#FCD34D" />
          <Text style={[styles.reportHintText, { color: chromeText }]} numberOfLines={2}>{reportHint}</Text>
        </View>
      ) : null}
      {cameraAhead ? (
        <View
          style={[
            styles.cameraChip,
            {
              top: insets.top + (activeIncident || reportHint ? 78 : 12),
              backgroundColor: reportSurface,
              borderColor: reportBorder,
            },
          ]}
        >
          <View style={styles.cameraChipIcon}>
            <Ionicons name="videocam" size={12} color="#FFFFFF" />
          </View>
          <Text style={[styles.cameraChipText, { color: chromeText }]} numberOfLines={1}>
            {cameraAhead.distanceMiles < 0.1
              ? `${cameraAhead.name} · right here`
              : `${cameraAhead.name} · ${cameraAhead.distanceMiles.toFixed(cameraAhead.distanceMiles < 1 ? 2 : 1)} mi ahead`}
          </Text>
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
        <View
          style={[
            styles.orionReplyStrip,
            {
              left: 14,
              right: 14,
              bottom: insets.bottom + 138,
              backgroundColor: chromeSurface,
              borderColor: reportBorder,
            },
          ]}
        >
          <Ionicons name="sparkles-outline" size={14} color={modeConfig.etaAccentColor} />
          <Text style={[styles.orionReplyStripText, { color: chromeText }]} numberOfLines={2}>
            {orionQuickReply}
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.recenterBtn, { bottom: insets.bottom + 12 }]}
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
  reportHintText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
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
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  reportCardSub: { fontSize: 12, marginTop: 6 },
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
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  cameraChip: {
    position: 'absolute',
    left: 14,
    right: 14,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cameraChipIcon: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: 'rgba(37,99,235,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraChipText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  recenterBtn: {
    position: 'absolute',
    right: 14,
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
