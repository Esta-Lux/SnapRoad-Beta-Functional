import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { Incident } from '../../types';
import { sortAndCapMarkers, type MarkerCoordinate } from './markerDensity';

/** Tile colour per incident type — matches SnapRoad report palette. */
const INCIDENT_COLORS: Record<string, string> = {
  police: '#2563EB',
  accident: '#DC2626',
  crash: '#DC2626',
  hazard: '#D97706',
  construction: '#F59E0B',
  weather: '#0EA5E9',
  pothole: '#92400E',
  closure: '#7C3AED',
  camera: '#6D28D9',
};

const DEFAULT_COLOR = '#D97706';

/** Match `CameraMarkers` puck dimensions (28 / 22 / 11). */
const ICON_SZ = 11;

function incidentIconName(type?: string): keyof typeof Ionicons.glyphMap {
  const t = (type ?? 'hazard').toLowerCase();
  if (t === 'police') return 'shield';
  if (t === 'accident' || t === 'crash') return 'car-sport';
  if (t === 'construction') return 'construct';
  if (t === 'weather') return 'partly-sunny-outline';
  if (t === 'pothole') return 'alert-circle';
  if (t === 'closure') return 'close-circle';
  if (t === 'camera') return 'videocam';
  return 'warning';
}

interface Props {
  incidents: Incident[];
  onIncidentTap?: (inc: Incident) => void;
  zoomLevel: number;
  referenceCoordinate?: MarkerCoordinate | null;
}

/**
 * Road-report incidents as MarkerView + Ionicons (no CircleLayer dots).
 */
export default React.memo(function ReportMarkers({
  incidents,
  onIncidentTap,
  zoomLevel,
  referenceCoordinate = null,
}: Props) {
  const list = useMemo(() => {
    return sortAndCapMarkers(incidents, referenceCoordinate, zoomLevel, 'report');
  }, [incidents, referenceCoordinate, zoomLevel]);

  if (!isMapAvailable() || !MapboxGL || list.length === 0) return null;
  const MB = MapboxGL;

  return (
    <>
      {list.map((inc) => {
        const fill = INCIDENT_COLORS[inc.type] ?? DEFAULT_COLOR;
        const icon = incidentIconName(inc.type);
        return (
          <MB.MarkerView
            key={String(inc.id)}
            id={`sr-report-mv-${inc.id}`}
            coordinate={[inc.lng, inc.lat]}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap
            // Keep incident markers visible above Standard 3D buildings at
            // pitched navigation camera angles.
            allowOverlapWithPuck
          >
            <Pressable
              onPress={() => onIncidentTap?.(inc)}
              style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
              hitSlop={6}
            >
              <View style={[styles.puckOuter, { borderColor: 'rgba(255,255,255,0.82)', backgroundColor: `${fill}38` }]}>
                <View style={[styles.puckInner, { backgroundColor: fill }]}>
                  <Ionicons name={icon} size={ICON_SZ} color="#FFFFFF" />
                </View>
              </View>
            </Pressable>
          </MB.MarkerView>
        );
      })}
    </>
  );
});

const styles = StyleSheet.create({
  hit: { alignItems: 'center', justifyContent: 'center' },
  hitPressed: { opacity: 0.88, transform: [{ scale: 0.95 }] },
  puckOuter: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
