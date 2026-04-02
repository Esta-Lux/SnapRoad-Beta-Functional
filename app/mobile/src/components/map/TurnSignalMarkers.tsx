import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';

export interface TurnSignalStep {
  lat: number;
  lng: number;
  maneuver?: string;
}

interface Props {
  steps: TurnSignalStep[];
  puckColor: string;
}

function maneuverIcon(maneuver?: string): keyof typeof Ionicons.glyphMap {
  if (!maneuver) return 'arrow-up';
  const m = maneuver.toLowerCase();
  if (m.includes('left') && m.includes('sharp')) return 'arrow-undo';
  if (m.includes('right') && m.includes('sharp')) return 'arrow-redo';
  if (m.includes('left')) return 'arrow-back';
  if (m.includes('right')) return 'arrow-forward';
  if (m === 'u-turn') return 'return-up-back';
  if (m === 'roundabout') return 'sync';
  if (m === 'merge') return 'arrow-redo';
  return 'arrow-up';
}

/**
 * Upcoming maneuver points — MarkerView + directional Ionicons (no map CircleLayer dots).
 */
export default React.memo(function TurnSignalMarkers({ steps, puckColor }: Props) {
  const list = useMemo(
    () => steps.filter((s) => isFinite(s.lat) && isFinite(s.lng)),
    [steps],
  );

  if (!isMapAvailable() || !MapboxGL || !list.length) return null;
  const MB = MapboxGL;

  return (
    <>
      {list.map((st, i) => {
        const icon = maneuverIcon(st.maneuver);
        return (
          <MB.MarkerView
            key={`turn-${st.lat}-${st.lng}-${i}`}
            id={`sr-turn-mv-${i}`}
            coordinate={[st.lng, st.lat]}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap
          >
            <View style={styles.hit}>
              <View style={[styles.puckOuter, { borderColor: `${puckColor}88` }]}>
                <View style={[styles.puckInner, { backgroundColor: puckColor }]}>
                  <Ionicons name={icon} size={17} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </MB.MarkerView>
        );
      })}
    </>
  );
});

const styles = StyleSheet.create({
  hit: { alignItems: 'center', justifyContent: 'center' },
  puckOuter: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.22,
        shadowRadius: 4,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  puckInner: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
