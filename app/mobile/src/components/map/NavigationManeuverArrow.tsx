import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { Coordinate } from '../../types';
import { bearingDeg, coordinateAtCumulativeMeters, polylineLengthMeters } from '../../utils/distance';
import { NAV_DISPLAY_THEME } from '../../navigation/navigationTheme';

type Props = {
  polyline: Coordinate[];
  /** Cumulative meters along polyline from start (same as route progress). */
  cumFromStartMeters: number;
  /** Meters ahead of current progress to place the chevron. */
  lookaheadMeters?: number;
  arrowColor?: string;
};

/**
 * On-route maneuver hint: chevron placed a short distance ahead on the remaining path
 * (complements turn card; aligned to route geometry).
 */
export default React.memo(function NavigationManeuverArrow({
  polyline,
  cumFromStartMeters,
  lookaheadMeters = 52,
  arrowColor = NAV_DISPLAY_THEME.maneuverArrow,
}: Props) {
  const ahead = typeof lookaheadMeters === 'number' ? lookaheadMeters : 52;

  const { coord, bearing } = useMemo(() => {
    if (polyline.length < 2) return { coord: null as Coordinate | null, bearing: 0 };
    const total = polylineLengthMeters(polyline);
    const targetCum = Math.min(Math.max(0, cumFromStartMeters + ahead), Math.max(0, total - 0.5));
    const c = coordinateAtCumulativeMeters(polyline, targetCum);
    if (!c) return { coord: null, bearing: 0 };
    const backC = coordinateAtCumulativeMeters(polyline, Math.max(0, targetCum - 12));
    const br = backC ? bearingDeg(backC, c) : 0;
    return { coord: c, bearing: br };
  }, [polyline, cumFromStartMeters, ahead]);

  if (!isMapAvailable() || !MapboxGL || !coord) return null;
  const MB = MapboxGL;

  return (
    <MB.MarkerView
      id="sr-nav-maneuver-arrow"
      coordinate={[coord.lng, coord.lat]}
      anchor={{ x: 0.5, y: 0.5 }}
      allowOverlap
    >
      <View style={styles.wrap} pointerEvents="none">
        <Ionicons
          name="chevron-up"
          size={14}
          color={arrowColor}
          style={{ transform: [{ rotate: `${bearing}deg` }] }}
        />
      </View>
    </MB.MarkerView>
  );
});

const styles = StyleSheet.create({
  wrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
  },
});
