import React, { useMemo } from 'react';
import { View, Image, StyleSheet, Pressable } from 'react-native';
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

const MARKER_VIEW_MAX = 48;

export default React.memo(function PhotoReportMarkers({ reports, onReportTap }: Props) {
  const geoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: reports
        .filter((r) => r.lat != null && r.lng != null && isFinite(r.lat) && isFinite(r.lng))
        .map((r) => ({
          type: 'Feature' as const,
          properties: { id: r.id, type: r.type, description: r.description ?? '' },
          geometry: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
        })),
    }),
    [reports],
  );

  const showThumbs = reports.length > 0 && reports.length <= MARKER_VIEW_MAX;
  const thumbById = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of reports) {
      const u = r.photo_url || r.thumbnail_url;
      if (u) m.set(String(r.id), u);
    }
    return m;
  }, [reports]);

  if (!isMapAvailable() || !MapboxGL || !reports.length) return null;

  const Mbx = MapboxGL;

  return (
    <>
      <Mbx.ShapeSource
        id="sr-photo-reports"
        shape={geoJSON as GeoJSON.FeatureCollection}
        onPress={(e: any) => {
          const id = e.features?.[0]?.properties?.id;
          const r = reports.find((x) => String(x.id) === String(id));
          if (r && onReportTap) onReportTap(r);
        }}
      >
        <Mbx.CircleLayer
          id="sr-photo-reports-glow"
          style={{
            circleColor: '#8B5CF6',
            circleRadius: ['interpolate', ['linear'], ['zoom'], 11, 10, 14, 16, 18, 22],
            circleOpacity: showThumbs ? 0.08 : 0.15,
            circleBlur: 0.7,
          }}
          minZoomLevel={11}
        />
        <Mbx.CircleLayer
          id="sr-photo-reports-circle"
          style={{
            circleColor: '#8B5CF6',
            circleRadius: ['interpolate', ['linear'], ['zoom'], 11, 5, 14, 8, 18, 12],
            circleStrokeWidth: 2,
            circleStrokeColor: '#ffffff',
            circleOpacity: showThumbs ? 0.35 : 0.92,
          }}
          minZoomLevel={11}
        />
      </Mbx.ShapeSource>
      {showThumbs &&
        reports.map((r) => {
          const uri = thumbById.get(String(r.id));
          if (!uri) return null;
          return (
            <Mbx.MarkerView key={`pr-thumb-${r.id}`} coordinate={[r.lng, r.lat]} anchor={{ x: 0.5, y: 0.5 }}>
              <Pressable style={styles.thumbHit} onPress={() => onReportTap?.(r)} accessibilityRole="button">
                <Image source={{ uri }} style={styles.thumb} />
              </Pressable>
            </Mbx.MarkerView>
          );
        })}
    </>
  );
});

const styles = StyleSheet.create({
  thumbHit: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  thumb: { width: '100%', height: '100%' },
});
