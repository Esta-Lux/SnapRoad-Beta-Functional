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
import type { DrivingMode } from '../types';
import {
  useNativeNavBridge,
  type NativeNavProgressEvent,
} from '../hooks/useNativeNavBridge';
import { normalizeNativeNavParams } from '../navigation/nativeNavGuard';
import * as Sentry from '@sentry/react-native';

/** Mapbox Standard style — the navigation SDK applies its own lighting/day-night. */
const NAV_MAP_STYLE = 'mapbox://styles/mapbox/standard';

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
    (arrived: boolean) => {
      if (didExitRef.current) return;
      didExitRef.current = true;
      const tripSummary = bridge.buildTripSummary(arrived);
      rnNav.navigate('MapMain', { nativeNavResult: { tripSummary, arrived } });
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
        <View style={styles.reportHint}>
          <Ionicons name="warning-outline" size={14} color="#FCD34D" />
          <Text style={styles.reportHintText} numberOfLines={2}>{reportHint}</Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.recenterBtn}
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
    top: 56,
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
    bottom: 26,
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
