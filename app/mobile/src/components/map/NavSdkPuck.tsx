import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL from '../../utils/mapbox';

/**
 * Native-authoritative navigation puck.
 *
 * Rendered **only** while the hybrid Mapbox Navigation SDK trip is authoritative
 * (`isSdkPuckAuthoritative()` → `navLogicSdkEnabled()` && `sdkGuidancePhase === 'active'`
 * && a matched `onNavigationLocationUpdate` has landed). While this puck is on
 * screen the default `LocationPuck` (which reads raw device GPS) must be hidden
 * so the two location sources do not visibly fight — see `MapScreen.tsx`.
 *
 * Visual contract: a 3D-style blue chevron (the "nav arrow" the user expects
 * during turn-by-turn) instead of the pulsing dot used in explore.
 *
 * Heading source: native SDK `location.course` (snapped to route graph). When the
 * native engine has no course yet (`course < 0`) the arrow points to north; the
 * first matched-location event typically arrives within ~150 ms of the first
 * progress tick on iOS (see `patches/@badatgil+expo-mapbox-navigation+*.patch`).
 */
type Props = {
  /** SDK matched longitude. */
  lng: number;
  /** SDK matched latitude. */
  lat: number;
  /** Course in degrees from the native SDK matched location; negative means unknown. */
  course: number;
  /**
   * Optional accent (route color) — defaults to SnapRoad brand blue.
   * Pass `DRIVING_MODES[mode].routeColor` to keep the arrow in lockstep with the route.
   */
  color?: string;
};

function NavSdkPuckImpl({ lng, lat, course, color = '#0A66FF' }: Props) {
  if (!MapboxGL || !Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  const rotation = course >= 0 && Number.isFinite(course) ? course : 0;
  return (
    <MapboxGL.MarkerView
      id="nav-sdk-puck"
      coordinate={[lng, lat]}
      anchor={{ x: 0.5, y: 0.5 }}
      allowOverlap
    >
      <View style={styles.wrap} pointerEvents="none">
        {/* Soft glow ring (outer halo, static) keeps the arrow readable on any basemap. */}
        <View style={[styles.halo, { backgroundColor: `${color}33` }]} />
        {/* Rotating chevron — anchored at centre so rotation around the matched point is stable. */}
        <View style={[styles.arrow, { backgroundColor: color, transform: [{ rotate: `${rotation}deg` }] }]}>
          <Ionicons name="navigate" size={20} color="#FFFFFF" />
        </View>
      </View>
    </MapboxGL.MarkerView>
  );
}

/**
 * Course and coord change very frequently (~3 Hz on iOS, matcher cadence on Android).
 * Re-rendering the MarkerView host is cheap, but we still memo to avoid re-running
 * `Ionicons` image resolution and the inner view tree unless the authoritative inputs
 * really move.
 */
export const NavSdkPuck = React.memo(NavSdkPuckImpl, (prev, next) => {
  if (prev.color !== next.color) return false;
  if (Math.abs(prev.lat - next.lat) > 1e-6) return false;
  if (Math.abs(prev.lng - next.lng) > 1e-6) return false;
  // 1° course difference is imperceptible on a 40pt icon.
  if (Math.abs(prev.course - next.course) > 1) return false;
  return true;
});

const styles = StyleSheet.create({
  wrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#0A2A5E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
});

export default NavSdkPuck;
