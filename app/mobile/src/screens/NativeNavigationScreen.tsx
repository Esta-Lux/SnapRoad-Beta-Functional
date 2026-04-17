import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, StatusBar, useColorScheme, TouchableOpacity, Text } from 'react-native';
import { MapboxNavigationView, type MapboxNavigationViewRef } from '@badatgil/expo-mapbox-navigation';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation as useRNNavigation, useRoute } from '@react-navigation/native';
import type { MapStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useNavigationMode } from '../contexts/NavigatingContext';
import { useAuth } from '../contexts/AuthContext';
import type { DrivingMode, User } from '../types';
import {
  useNativeNavBridge,
  type NativeNavProgressEvent,
} from '../hooks/useNativeNavBridge';
import { normalizeNativeNavParams } from '../navigation/nativeNavGuard';
import * as Sentry from '@sentry/react-native';
import { api } from '../api/client';
import { DRIVING_MODES } from '../constants/modes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function nativeNavStyleUrl(drivingMode: DrivingMode, isDark: boolean): string {
  if (isDark) return 'mapbox://styles/mapbox/navigation-night-v1';
  if (drivingMode === 'sport') return 'mapbox://styles/mapbox/navigation-night-v1';
  if (drivingMode === 'calm') return 'mapbox://styles/mapbox/standard';
  return 'mapbox://styles/mapbox/navigation-day-v1';
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
  const { user, updateUser, refreshUserFromServer } = useAuth();
  const insets = useSafeAreaInsets();
  const didExitRef = useRef(false);
  const didHandleInvalidParamsRef = useRef(false);
  const navRef = useRef<MapboxNavigationViewRef | null>(null);
  const colorScheme = useColorScheme();

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

  const modeConfig = DRIVING_MODES[drivingMode];
  const followingZoom = modeConfig.navZoom;
  const followingPitch = modeConfig.navPitch;
  const mapStyleUrl = useMemo(
    () => nativeNavStyleUrl(drivingMode, colorScheme === 'dark'),
    [drivingMode, colorScheme],
  );

  const exitWithResult = useCallback(
    async (arrived: boolean) => {
      if (didExitRef.current) return;
      didExitRef.current = true;
      let tripSummary = bridge.buildTripSummary(arrived);
      try {
        const metrics = bridge.getTripMetrics();
        if (tripSummary.counted !== false && metrics.qualifiesTrip) {
          const res = await api.post('/api/trips/complete', {
            distance_miles: metrics.roundedDistanceMiles,
            duration_seconds: metrics.durationSec,
            safety_score: tripSummary.safety_score ?? 85,
            started_at: metrics.startedAtIso,
            ended_at: metrics.endedAtIso,
            hard_braking_events: 0,
            speeding_events: 0,
            incidents_reported: 0,
          });
          if (res.success && res.data) {
            const body = res.data as Record<string, unknown>;
            const d = (body?.data as Record<string, unknown> | undefined) ?? body;
            const apiCounted = d?.counted !== false && d?.trip_id != null;
            const profRaw = d?.profile as Record<string, unknown> | undefined;
            const profileTotals =
              profRaw && typeof profRaw === 'object'
                ? {
                    total_miles:
                      profRaw.total_miles != null ? Number(profRaw.total_miles) : undefined,
                    total_trips:
                      profRaw.total_trips != null ? Number(profRaw.total_trips) : undefined,
                    gems: profRaw.gems != null ? Number(profRaw.gems) : undefined,
                    xp: profRaw.xp != null ? Number(profRaw.xp) : undefined,
                  }
                : undefined;
            tripSummary = {
              ...tripSummary,
              gems_earned: Number(d?.gems_earned ?? tripSummary.gems_earned),
              xp_earned: Number(d?.xp_earned ?? tripSummary.xp_earned),
              safety_score: Number(d?.safety_score ?? tripSummary.safety_score),
              counted: apiCounted,
              profile_totals: profileTotals ?? tripSummary.profile_totals,
            };
            if (apiCounted && profRaw) {
              const patch: Partial<User> = {};
              if (profRaw.gems != null) patch.gems = Number(profRaw.gems);
              if (profRaw.total_trips != null) patch.totalTrips = Number(profRaw.total_trips);
              if (profRaw.total_miles != null) patch.totalMiles = Number(profRaw.total_miles);
              if (profRaw.xp != null) patch.xp = Number(profRaw.xp);
              if (profRaw.safety_score != null) patch.safetyScore = Number(profRaw.safety_score);
              if (Object.keys(patch).length) updateUser(patch);
              await refreshUserFromServer();
            }
          }
        }
      } catch {
        // fall back to local summary
      }
      rnNav.navigate('MapMain', { nativeNavResult: { tripSummary, arrived } });
    },
    [bridge, rnNav, refreshUserFromServer, updateUser, user],
  );

  const handleCancel = useCallback(() => {
    void exitWithResult(false);
  }, [exitWithResult]);

  const handleArrival = useCallback(() => {
    bridge.handleArrival();
    void exitWithResult(true);
  }, [bridge, exitWithResult]);

  const handleProgressChanged = useCallback(
    (event: { nativeEvent: NativeNavProgressEvent }) => {
      bridge.handleProgressChanged(event);
    },
    [bridge],
  );

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
        mapStyle={mapStyleUrl}
        followingZoom={followingZoom}
        followingPitch={followingPitch}
        drivingMode={drivingMode}
        onRouteProgressChanged={handleProgressChanged}
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
      {!!reportHint && (
        <View style={[styles.reportHint, { top: insets.top + 8 }]}>
          <Ionicons name="warning-outline" size={14} color="#FCD34D" />
          <Text style={styles.reportHintText} numberOfLines={2}>{reportHint}</Text>
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
  reportHintText: { color: '#E5E7EB', fontSize: 12, fontWeight: '600', flexShrink: 1 },
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
