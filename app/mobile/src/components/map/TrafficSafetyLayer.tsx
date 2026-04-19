import React from 'react';
import { View, Pressable, StyleSheet, Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';

export interface TrafficSafetyZone {
  id: string;
  lat: number;
  lng: number;
  kind?: string;
  maxspeed?: string | null;
}

interface Props {
  zones: TrafficSafetyZone[];
  onZoneTap?: (z: TrafficSafetyZone) => void;
}

/**
 * Speed-camera POIs from OSM proxy — MarkerView + icon (no CircleLayer dots).
 */
export default React.memo(function TrafficSafetyLayer({ zones, onZoneTap }: Props) {
  const list = zones.filter((z) => z.lat != null && z.lng != null && isFinite(z.lat) && isFinite(z.lng));
  if (!isMapAvailable() || !MapboxGL || !list.length) return null;
  const MB = MapboxGL;

  return (
    <>
      {list.map((z) => (
        <MB.MarkerView
          key={z.id}
          id={`sr-ts-mv-${z.id}`}
          coordinate={[z.lng, z.lat]}
          anchor={{ x: 0.5, y: 0.5 }}
          allowOverlap
          // Keep speed-camera / zone markers visible above Standard 3D
          // buildings at pitched camera angles (see other POI markers for
          // the same workaround rationale).
          allowOverlapWithPuck
        >
          <Pressable
            onPress={() => onZoneTap?.(z)}
            style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
            hitSlop={6}
          >
            <View style={styles.puck}>
              <View style={styles.puckInner}>
                <Ionicons name="speedometer-outline" size={11} color="#FFFFFF" />
              </View>
              {z.maxspeed ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt} numberOfLines={1}>
                    {String(z.maxspeed).replace(/\s*kmh?/i, '').slice(0, 3)}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </MB.MarkerView>
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  hit: { alignItems: 'center', justifyContent: 'center' },
  hitPressed: { opacity: 0.88, transform: [{ scale: 0.96 }] },
  puck: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.88)',
    ...Platform.select({
      ios: {
        shadowColor: '#b45309',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.32,
        shadowRadius: 3,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  puckInner: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -3,
    minWidth: 18,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: '#1c1917',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  badgeTxt: { color: '#fff', fontSize: 7, fontWeight: '800', textAlign: 'center' },
});
