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
 * Keeps markers readable on every base style (Standard, Streets, Dark, Satellite).
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
            hitSlop={8}
          >
            <View style={styles.puck}>
              <View style={styles.puckInner}>
                <Ionicons name="videocam" size={16} color="#FFFFFF" />
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
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    ...Platform.select({
      ios: {
        shadowColor: '#1e3a8a',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.45,
        shadowRadius: 5,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  puckInner: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
