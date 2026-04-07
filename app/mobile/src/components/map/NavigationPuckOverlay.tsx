import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import { NAV_DISPLAY_THEME } from '../../navigation/navigationTheme';

type Props = {
  lat: number;
  lng: number;
  /** Degrees; 0 = north, arrow points up-screen when map rotates with course. */
  headingDeg: number;
};

/**
 * Custom navigation puck: purple arrow in a circular ring (browse uses native {@link MapboxGL.LocationPuck}).
 * Uses MarkerView — not PointAnnotation — for crisp vector rendering.
 */
export default React.memo(function NavigationPuckOverlay({ lat, lng, headingDeg }: Props) {
  if (!isMapAvailable() || !MapboxGL || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const MB = MapboxGL;
  const h = Number.isFinite(headingDeg) ? headingDeg : 0;

  return (
    <MB.MarkerView
      id="sr-nav-puck-overlay"
      coordinate={[lng, lat]}
      anchor={{ x: 0.5, y: 0.5 }}
      allowOverlap
    >
      <View style={styles.ring} pointerEvents="none">
        <View style={styles.inner}>
          <Ionicons
            name="navigate"
            size={16}
            color={NAV_DISPLAY_THEME.navPuckPurple}
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
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 2,
    borderColor: NAV_DISPLAY_THEME.navPuckRing,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: NAV_DISPLAY_THEME.navPuckShadow,
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
