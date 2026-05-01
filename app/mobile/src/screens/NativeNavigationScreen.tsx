import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { MapboxNavigationView, type MapboxNavigationViewRef } from '@badatgil/expo-mapbox-navigation';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation as useRNNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MapStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useNavigationMode } from '../contexts/NavigatingContext';
import { useAuth } from '../contexts/AuthContext';
import type { DrivingMode, Incident } from '../types';
import { themePalettes, useTheme } from '../contexts/ThemeContext';
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
  mergeNativeNavMapPois,
} from '../lib/nativeNavHelpers';
import { isTrafficSafetyLayerEnabled, trafficSafetyRegionQuery } from '../config/restrictedRegions';
import { speak } from '../utils/voice';

/**
 * Mapbox **Standard** is required for the native module’s `basemap` StyleImport
 * (`show3dObjects`, `lightPreset`, etc.). `navigation-day-v1` / `navigation-night-v1`
 * do not expose that import — 3D buildings vanish and route styling can fail to match.
 * Driving mode + `appTheme` still control dusk/dawn/day/night via the native patch
 * (`snapRoadLightPreset`, `SnapRoadDayStyle` / `SnapRoadNightStyle`).
 *
 * Turn / bottom stats chrome: native draws UI; colors come from `navChromeThemeJson`
 * (ThemeContext palettes) plus `drivingMode` / `appTheme`. Corner radius lives in the patch.
 */
const MAPBOX_STANDARD = 'mapbox://styles/mapbox/standard';

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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const screenFocused = useIsFocused();
  const didExitRef = useRef(false);
  const didHandleInvalidParamsRef = useRef(false);
  const navRef = useRef<MapboxNavigationViewRef | null>(null);
  const lastNativeVoiceSpeakRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  /** Gated so async fetches that resolve after unmount don't call setState. */
  const isMountedRef = useRef(true);
  const lastIncidentFetchCoordRef = useRef<{ lat: number; lng: number } | null>(null);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [dismissedIncidentId, setDismissedIncidentId] = useState<string | number | null>(null);
  const [orionQuickReply, setOrionQuickReply] = useState<string | null>(null);
  /** Last location + course reported by the native SDK; used to gate camera/incident fetches by distance. */
  const lastCourseRef = useRef<number | null>(null);
  const lastCameraFetchAtRef = useRef(0);
  const lastCameraFetchCoordRef = useRef<{ lat: number; lng: number } | null>(null);
  /** JSON payload for native map SymbolLayer (OHGO cameras — tappable on the map, not over turn UI). */
  const [trafficCamerasJson, setTrafficCamerasJson] = useState('[]');

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
  /**
   * Default **Standard** so native `applySnapRoadBasemapConfig` can enable 3D buildings and
   * the Navigation SDK route line + our delegate theming stay consistent.
   */
  const resolvedMapStyleUrl = useMemo(() => {
    if (normalizedParams?.mapStyleUrl) return normalizedParams.mapStyleUrl;
    return MAPBOX_STANDARD;
  }, [normalizedParams?.mapStyleUrl]);
  const embeddedAppTheme: 'light' | 'dark' = drivingMode === 'sport' ? 'dark' : 'light';
  const modeConfig = DRIVING_MODES[drivingMode];

  /** Align native maneuver + trip-progress chrome with JS theme tokens (sport → dark palette). */
  const navChromeThemeJson = useMemo(() => {
    const c = drivingMode === 'sport' ? themePalettes.dark : themePalettes.light;
    const maneuverAccent = drivingMode === 'sport' ? '#93C5FD' : '#E8F4FF';
    return JSON.stringify({
      maneuverBg: c.primary,
      maneuverText: '#FFFFFF',
      maneuverAccent,
      statsBg: c.card,
      statsText: c.text,
      statsAccent: c.primary,
      statsBorder: c.border,
    });
  }, [drivingMode]);
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
        resolvedMapStyleUrl,
      ].join(':'),
    [origin?.lat, origin?.lng, destination?.lat, destination?.lng, drivingMode, resolvedMapStyleUrl],
  );

  /** Slightly tighter zoom + pitch for a stronger 3D driving perspective (buildings read taller). */
  const followingZoom = useMemo(
    () => Math.min(19.25, modeConfig.navZoom + 0.85),
    [modeConfig.navZoom],
  );
  const followingPitch = useMemo(
    () => Math.min(76, modeConfig.navPitch + 6),
    [modeConfig.navPitch],
  );

  /** Until the SDK finishes routing, avoid POI churn competing with the map. */
  const [routeReady, setRouteReady] = useState(false);
  useEffect(() => {
    setRouteReady(false);
  }, [nativeViewKey]);

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

  /**
   * One refresh for OHGO cameras + photo reports + traffic-safety POIs + incidents — parity with
   * what MapScreen layers load during hybrid navigation (same endpoints / radii as MapScreen).
   */
  const refreshNativeMapPois = useCallback(
    async (lat: number, lng: number) => {
      try {
        const zoneReq =
          isTrafficSafetyLayerEnabled(lat, lng)
            ? api.get<Record<string, unknown>>(
                `/api/traffic-safety/zones?lat=${lat}&lng=${lng}&radius_km=12&region=${encodeURIComponent(
                  trafficSafetyRegionQuery(lat, lng),
                )}`,
              )
            : Promise.resolve({ success: false as const, data: null });

        const [camRes, photoRes, zoneRes, incRes] = await Promise.all([
          api.get<unknown>(`/api/map/cameras?lat=${lat}&lng=${lng}&radius=80`),
          api.get<{ photos?: unknown[] }>(`/api/photo-reports/nearby?lat=${lat}&lng=${lng}&radius=5`),
          zoneReq,
          api.get<{ success?: boolean; data?: unknown }>(
            `/api/incidents/nearby?lat=${lat}&lng=${lng}&radius_miles=2`,
          ),
        ]);
        if (!isMountedRef.current) return;

        const cameras =
          camRes.success && camRes.data != null ? extractCameraList(camRes.data) : [];

        let photoReports: Array<{ id: string; lat: number; lng: number; description?: string }> = [];
        if (photoRes.success && photoRes.data != null) {
          const raw = photoRes.data as { photos?: unknown[] };
          const d = raw?.photos;
          if (Array.isArray(d)) {
            photoReports = d
              .map((p: unknown) => {
                const o = p as { id?: unknown; lat?: unknown; lng?: unknown; description?: unknown };
                return {
                  id: String(o.id ?? ''),
                  lat: Number(o.lat),
                  lng: Number(o.lng),
                  description: typeof o.description === 'string' ? o.description : undefined,
                };
              })
              .filter((p) => p.id && Number.isFinite(p.lat) && Number.isFinite(p.lng));
          }
        }

        let trafficZones: Array<{
          id: string;
          lat: number;
          lng: number;
          kind?: string;
          maxspeed?: unknown;
        }> = [];
        if (zoneRes.success && zoneRes.data != null) {
          const raw = zoneRes.data as Record<string, unknown>;
          const payload =
            raw && typeof raw === 'object' && 'zones' in raw
              ? raw
              : (raw.data as Record<string, unknown> | undefined) ?? raw;
          if (!payload?.disabled) {
            const zl = payload?.zones;
            if (Array.isArray(zl)) {
              trafficZones = zl
                .map((z: Record<string, unknown>) => ({
                  id: String(z?.id ?? ''),
                  lat: Number(z?.lat),
                  lng: Number(z?.lng),
                  kind: typeof z?.kind === 'string' ? z.kind : 'speed_camera',
                  maxspeed: z?.maxspeed ?? null,
                }))
                .filter((z) => z.id && Number.isFinite(z.lat) && Number.isFinite(z.lng));
            }
          }
        }

        let incidents: Incident[] = [];
        if (incRes.success && incRes.data != null) {
          const data = (incRes.data as { data?: Incident[] }).data;
          if (Array.isArray(data)) incidents = data;
        }

        const nearest = incidents.reduce<Incident | null>((best, inc) => {
          if (dismissedIncidentId != null && String(inc.id) === String(dismissedIncidentId)) {
            return best;
          }
          if (!best) return inc;
          const incDist = haversineMeters(lat, lng, inc.lat, inc.lng);
          const bestDist = haversineMeters(lat, lng, best.lat, best.lng);
          return incDist < bestDist ? inc : best;
        }, null);
        lastIncidentFetchCoordRef.current = { lat, lng };
        setActiveIncident(nearest);

        const merged = mergeNativeNavMapPois({
          cameras,
          photoReports,
          trafficZones,
          incidents,
        });
        setTrafficCamerasJson(JSON.stringify(merged));
        lastCameraFetchCoordRef.current = { lat, lng };
      } catch {
        /* offline / tunnel */
      }
    },
    [dismissedIncidentId],
  );

  const handleRoutesLoaded = useCallback(() => {
    setRouteReady(true);
  }, []);

  const handleVoiceInstruction = useCallback(
    (event: { nativeEvent: { text?: string } }) => {
      const text = event.nativeEvent?.text?.trim();
      if (!text || voiceMuted) return;
      const now = Date.now();
      const last = lastNativeVoiceSpeakRef.current;
      if (last.text === text && now - last.at < 6500) return;
      lastNativeVoiceSpeakRef.current = { text, at: now };
      speak(text, 'high', drivingMode, {
        rateSource: 'navigation_fixed',
        forceAllowDuringSdk: true,
      });
    },
    [drivingMode, voiceMuted],
  );

  const handleRouteFailedToLoad = useCallback(
    (event: { nativeEvent: { errorMessage: string } }) => {
      const errorMessage = event?.nativeEvent?.errorMessage || 'Unknown route-load error';
      setRouteReady(true);
      Sentry.captureMessage('native_navigation_route_failed_to_load', {
        level: 'error',
        extra: { errorMessage, drivingMode },
      });
      console.warn('[NativeNavigation] route load failed', errorMessage);
      Alert.alert('Could not load route', errorMessage);
    },
    [drivingMode],
  );

  const handleLocationUpdate = useCallback(
    (event: { nativeEvent: NativeNavLocationEvent }) => {
      const lat = Number(event.nativeEvent?.latitude);
      const lng = Number(event.nativeEvent?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const course = Number(event.nativeEvent?.course);
      if (Number.isFinite(course)) lastCourseRef.current = course;
      if (!screenFocused || !routeReady) return;
      const now = Date.now();

      const lastPivot = lastCameraFetchCoordRef.current;
      const moved =
        lastPivot != null ? haversineMeters(lastPivot.lat, lastPivot.lng, lat, lng) : Number.POSITIVE_INFINITY;
      // Slightly faster cadence than the old camera-only path so incidents + OHGO stay fresh.
      if (now - lastCameraFetchAtRef.current >= 10000 || moved >= 900) {
        lastCameraFetchAtRef.current = now;
        void refreshNativeMapPois(lat, lng);
      }
    },
    [refreshNativeMapPois, screenFocused, routeReady],
  );

  const handleDismissIncident = useCallback(() => {
    setDismissedIncidentId(activeIncident?.id ?? null);
    setActiveIncident(null);
  }, [activeIncident?.id]);

  const handleTrafficCameraTap = useCallback(
    (event: { nativeEvent: { id?: string; name?: string } }) => {
      const name = event.nativeEvent?.name?.trim() || 'Map point';
      const title =
        /^Incident ·/i.test(name)
          ? 'Incident'
          : /^Photo report ·/i.test(name)
            ? 'Photo report'
            : /^Speed camera/i.test(name)
              ? 'Traffic safety'
              : 'Traffic camera';
      Alert.alert(title, name, [{ text: 'OK' }]);
    },
    [],
  );

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
    if (!origin || !routeReady) return;
    void refreshNativeMapPois(origin.lat, origin.lng);
  }, [refreshNativeMapPois, origin, routeReady]);

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

  const reportSurface =
    embeddedAppTheme === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.9)';
  const reportBorder =
    embeddedAppTheme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.18)';
  const chromeSurface =
    embeddedAppTheme === 'light' ? modeConfig.etaBarBg : modeConfig.etaBarBgDark;
  const chromeText =
    embeddedAppTheme === 'light' ? colors.text : modeConfig.etaValueColor;
  const chromeSubtle =
    embeddedAppTheme === 'light' ? colors.textSecondary : modeConfig.etaLabelColor;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: embeddedAppTheme === 'dark' ? '#0a0a0f' : '#000' },
      ]}
    >
      <StatusBar
        barStyle={embeddedAppTheme === 'light' ? 'dark-content' : 'light-content'}
      />
      <MapboxNavigationView
        key={nativeViewKey}
        ref={navRef}
        style={styles.nav}
        coordinates={coordinates}
        mute
        locale="en-US"
        routeProfile={bridge.routeProfile}
        mapStyle={resolvedMapStyleUrl}
        followingZoom={followingZoom}
        followingPitch={followingPitch}
        trafficCameras={trafficCamerasJson}
        drivingMode={drivingMode}
        appTheme={embeddedAppTheme}
        navChromeThemeJson={navChromeThemeJson}
        navigationLogicOnly={false}
        onRouteProgressChanged={handleProgressChanged}
        onNavigationLocationUpdate={handleLocationUpdate}
        onTrafficCameraTap={handleTrafficCameraTap}
        onCancelNavigation={handleCancel}
        onFinalDestinationArrival={handleArrival}
        onRouteChanged={() => {}}
        onUserOffRoute={() => {}}
        onRoutesLoaded={handleRoutesLoaded}
        onRouteFailedToLoad={handleRouteFailedToLoad}
        onVoiceInstruction={handleVoiceInstruction}
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
      {/* Left side: native “End” / cancel stays on the right — avoids covering exit. */}
      <TouchableOpacity
        style={[styles.recenterBtn, { left: 14, bottom: insets.bottom + 96 }]}
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
  recenterBtn: {
    position: 'absolute',
    zIndex: 16,
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
