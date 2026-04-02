import React, { useMemo } from 'react';
import { View, Image, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';

export interface PhotoReport {
  id: string | number;
  lat: number;
  lng: number;
  type: string;
  description?: string;
  created_at: string;
  photo_url?: string;
  thumbnail_url?: string;
  upvotes?: number;
}

interface Props {
  reports: PhotoReport[];
  onReportTap?: (r: PhotoReport) => void;
}

const MARKER_VIEW_MAX = 60;
const PURPLE = '#8B5CF6';
const PURPLE_DEEP = '#6D28D9';

/**
 * Photo reports: MarkerView only — thumbnail when available, else camera icon tile (no CircleLayer).
 */
export default React.memo(function PhotoReportMarkers({ reports, onReportTap }: Props) {
  const list = useMemo(() => {
    const v = reports.filter((r) => r.lat != null && r.lng != null && isFinite(r.lat) && isFinite(r.lng));
    return v.length > MARKER_VIEW_MAX ? v.slice(0, MARKER_VIEW_MAX) : v;
  }, [reports]);

  const thumbById = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of list) {
      const u = r.photo_url || r.thumbnail_url;
      if (u) m.set(String(r.id), u);
    }
    return m;
  }, [list]);

  if (!isMapAvailable() || !MapboxGL || !list.length) return null;
  const MB = MapboxGL;

  return (
    <>
      {list.map((r) => {
        const uri = thumbById.get(String(r.id));
        return (
          <MB.MarkerView
            key={`pr-mv-${r.id}`}
            id={`sr-photo-mv-${r.id}`}
            coordinate={[r.lng, r.lat]}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap
          >
            <Pressable
              onPress={() => onReportTap?.(r)}
              style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
              accessibilityRole="button"
              hitSlop={6}
            >
              {uri ? (
                <View style={styles.thumbRing}>
                  <Image source={{ uri }} style={styles.thumb} />
                </View>
              ) : (
                <View style={styles.iconOuter}>
                  <View style={styles.iconInner}>
                    <Ionicons name="camera" size={18} color="#FFFFFF" />
                  </View>
                </View>
              )}
            </Pressable>
          </MB.MarkerView>
        );
      })}
    </>
  );
});

const styles = StyleSheet.create({
  hit: { alignItems: 'center', justifyContent: 'center' },
  hitPressed: { opacity: 0.9, transform: [{ scale: 0.96 }] },
  thumbRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: PURPLE_DEEP,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  thumb: { width: '100%', height: '100%' },
  iconOuter: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: PURPLE_DEEP,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  iconInner: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
