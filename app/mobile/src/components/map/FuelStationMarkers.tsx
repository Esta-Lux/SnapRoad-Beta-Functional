import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';

export interface FuelStation {
  id: string | number;
  name?: string;
  lat: number;
  lng: number;
  price?: number;
}

interface Props {
  stations: FuelStation[];
  visible: boolean;
  onStationTap?: (s: FuelStation) => void;
}

const FILL = '#16A34A';
const FILL_DARK = '#15803D';

/**
 * Gas stations as MarkerView + fuel icon (no CircleLayer / emoji SymbolLayer).
 */
export default React.memo(function FuelStationMarkers({ stations, visible, onStationTap }: Props) {
  const list = useMemo(
    () => stations.filter((s) => s.lat != null && s.lng != null && isFinite(s.lat) && isFinite(s.lng)),
    [stations],
  );

  if (!isMapAvailable() || !MapboxGL || !visible || !list.length) return null;
  const MB = MapboxGL;

  return (
    <>
      {list.map((s) => (
        <MB.MarkerView
          key={String(s.id)}
          id={`sr-fuel-mv-${s.id}`}
          coordinate={[s.lng, s.lat]}
          anchor={{ x: 0.5, y: 0.5 }}
          allowOverlap
        >
          <Pressable
            onPress={() => onStationTap?.(s)}
            style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
            hitSlop={8}
          >
            <View style={styles.puckOuter}>
              <View style={styles.puckInner}>
                <Ionicons name="flash" size={17} color="#FFFFFF" />
              </View>
              {s.price != null && (
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>${s.price.toFixed(2)}</Text>
                </View>
              )}
            </View>
          </Pressable>
        </MB.MarkerView>
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  hit: { alignItems: 'center', justifyContent: 'center' },
  hitPressed: { opacity: 0.9, transform: [{ scale: 0.96 }] },
  puckOuter: {
    alignItems: 'center',
    minWidth: 44,
  },
  puckInner: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: FILL,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: FILL_DARK,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  badge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
