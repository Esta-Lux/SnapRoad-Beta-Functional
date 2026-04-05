import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';

/** OHGO still frame (same fields as backend `camera_views`). */
export interface CameraViewFeed {
  id: string;
  small_url: string;
  large_url: string;
  direction: string;
}

/** Camera location with optional live still-image feeds. */
export interface CameraLocation {
  id: string | number;
  name?: string;
  description?: string;
  lat: number;
  lng: number;
  camera_views?: CameraViewFeed[];
}

interface Props {
  cameras: CameraLocation[];
  onCameraTap?: (c: CameraLocation) => void;
}

/**
 * Traffic cameras as MarkerView + Ionicons (no CircleLayer dots).
 * Intentionally compact so they don’t dominate the map.
 */
export default React.memo(function CameraMarkers({ cameras, onCameraTap }: Props) {
  const list = cameras.filter((c) => isFinite(c.lat) && isFinite(c.lng));
  if (!isMapAvailable() || !MapboxGL || list.length === 0) return null;
  const MB = MapboxGL;

  return (
    <>
      {list.map((c) => (
        <MB.MarkerView
          key={String(c.id)}
          id={`sr-cam-mv-${c.id}`}
          coordinate={[c.lng, c.lat]}
          anchor={{ x: 0.5, y: 0.5 }}
          allowOverlap
        >
          <Pressable
            onPress={() => onCameraTap?.(c)}
            style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
            hitSlop={6}
          >
            <View style={styles.puck}>
              <View style={styles.puckInner}>
                <Ionicons name="videocam" size={11} color="#FFFFFF" />
              </View>
            </View>
          </Pressable>
        </MB.MarkerView>
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  hit: { alignItems: 'center', justifyContent: 'center' },
  hitPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  puck: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    ...Platform.select({
      ios: {
        shadowColor: '#1e3a8a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
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
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
