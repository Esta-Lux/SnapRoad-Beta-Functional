import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, StatusBar, useColorScheme } from 'react-native';
import { MapboxNavigationView } from '@badatgil/expo-mapbox-navigation';
import { useNavigation as useRNNavigation, useRoute } from '@react-navigation/native';
import { useNavigatingState } from '../contexts/NavigatingContext';
import { useAuth } from '../contexts/AuthContext';
import { DRIVING_MODES } from '../constants/modes';
import type { DrivingMode } from '../types';
import {
  useNativeNavBridge,
  type NativeNavParams,
  type NativeNavProgressEvent,
} from '../hooks/useNativeNavBridge';

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
  const rnNav = useRNNavigation<any>();
  const route = useRoute<any>();
  const { setIsNavigating } = useNavigatingState();
  const { user } = useAuth();
  const didExitRef = useRef(false);
  const colorScheme = useColorScheme();

  const navParams: NativeNavParams = route.params ?? {};
  const { origin, destination, voiceMuted, drivingMode: modeParam } = navParams;
  const drivingMode = (modeParam as DrivingMode) ?? 'adaptive';
  const modeConfig = DRIVING_MODES[drivingMode] ?? DRIVING_MODES.adaptive;

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

  if (!origin || !destination || coordinates.length < 2) {
    rnNav.goBack();
    return null;
  }

  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0f' : '#000' }]}>
      <StatusBar barStyle="light-content" />
      <MapboxNavigationView
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flex: 1 },
});
