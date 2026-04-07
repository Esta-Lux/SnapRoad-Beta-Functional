import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import { DRIVING_MODES } from '../../constants/modes';
import type { DrivingMode } from '../../types';

type Props = {
  lat: number;
  lng: number;
  /** Degrees; 0 = north, arrow points up-screen when map rotates with course. */
  headingDeg: number;
  drivingMode: DrivingMode;
};

/**
 * Custom navigation puck: mode-colored arrow in a ring (browse uses native {@link MapboxGL.LocationPuck}).
 * Uses MarkerView — not PointAnnotation — for crisp vector rendering.
 */
export default React.memo(function NavigationPuckOverlay({ lat, lng, headingDeg, drivingMode }: Props) {
  if (!isMapAvailable() || !MapboxGL || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const MB = MapboxGL;
  const h = Number.isFinite(headingDeg) ? headingDeg : 0;
  const mc = DRIVING_MODES[drivingMode];
  const arrowColor = mc.puckColor;
  const hex = mc.puckColor;
  const ringBg =
    hex.startsWith('#') && hex.length >= 7
      ? `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},0.14)`
      : 'rgba(59, 130, 246, 0.12)';

  return (
    <MB.MarkerView
      id="sr-nav-puck-overlay"
      coordinate={[lng, lat]}
      anchor={{ x: 0.5, y: 0.5 }}
      allowOverlap
    >
      <View style={[styles.ring, { backgroundColor: ringBg, borderColor: 'rgba(255,255,255,0.94)' }]} pointerEvents="none">
        <View style={styles.inner}>
          <Ionicons
            name="navigate"
            size={16}
            color={arrowColor}
            style={{ transform: [{ rotate: `${h}deg` }] }}
          />
        </View>
      </View>
    </MB.MarkerView>
  );
});

const styles = StyleSheet.create({
  ring: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#1e293b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.45,
        shadowRadius: 4,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  inner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.98)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
