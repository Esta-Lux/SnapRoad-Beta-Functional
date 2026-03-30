import React, { useMemo } from 'react';
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
 * Renders OHGO traffic cameras as a CircleLayer stack that looks like a camera lens icon.
 * Three layers: outer glow → white iris ring → dark lens center.
 * Works on all map styles (streets-v12, standard, navigation-night-v1, dark-v11).
 */
export default React.memo(function CameraMarkers({ cameras, onCameraTap }: Props) {
  const geojson = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: cameras
      .filter((c) => isFinite(c.lat) && isFinite(c.lng))
      .map((c) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
        properties: {
          id: String(c.id),
          name: c.name || 'Traffic camera',
          description: c.description || '',
          lat: c.lat,
          lng: c.lng,
          camera_views_json: JSON.stringify(c.camera_views ?? []),
        },
      })),
  }), [cameras]);

  if (!isMapAvailable() || !MapboxGL || cameras.length === 0) return null;
  const MB = MapboxGL;

  const handlePress = (e: any) => {
    if (!onCameraTap) return;
    const feat = e?.features?.[0];
    if (!feat?.properties) return;
    const p = feat.properties;

    let views: CameraViewFeed[] | undefined;
    try {
      const raw = typeof p.camera_views_json === 'string'
        ? JSON.parse(p.camera_views_json)
        : p.camera_views_json;
      if (Array.isArray(raw) && raw.length > 0) views = raw;
    } catch {}

    onCameraTap({
      id: p.id ?? '',
      name: typeof p.name === 'string' ? p.name : 'Traffic camera',
      description: typeof p.description === 'string' ? p.description : undefined,
      lat: Number(p.lat),
      lng: Number(p.lng),
      camera_views: views,
    });
  };

  return (
    <MB.ShapeSource
      id="sr-cameras-src"
      shape={geojson}
      onPress={handlePress}
      hitbox={{ width: 28, height: 28 }}
    >
      {/* 1. Soft blue glow around the whole marker */}
      <MB.CircleLayer
        id="sr-cameras-glow"
        layerIndex={90}
        style={{
          circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 10, 14, 16, 18, 24],
          circleColor: '#2563EB',
          circleOpacity: 0.18,
          circleBlur: 1.0,
        }}
      />
      {/* 2. White iris ring — the lens housing */}
      <MB.CircleLayer
        id="sr-cameras-iris"
        layerIndex={91}
        style={{
          circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 6, 14, 10, 18, 15],
          circleColor: '#ffffff',
          circleOpacity: 0.95,
          circlePitchAlignment: 'map',
        }}
      />
      {/* 3. Dark navy lens center — camera aperture */}
      <MB.CircleLayer
        id="sr-cameras-lens"
        layerIndex={92}
        style={{
          circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 3.5, 14, 6, 18, 9],
          circleColor: '#1E3A8A',
          circleOpacity: 1,
          circlePitchAlignment: 'map',
        }}
      />
      {/* 4. Plain-text "CAM" label — visible at zoom 14+, plain ASCII so it renders on native */}
      <MB.SymbolLayer
        id="sr-cameras-label"
        layerIndex={93}
        style={{
          textField: 'CAM',
          textSize: ['interpolate', ['linear'], ['zoom'], 12, 0, 14, 7, 18, 10],
          textColor: '#ffffff',
          textHaloColor: '#1E3A8A',
          textHaloWidth: 1.2,
          textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          textAnchor: 'center',
          textAllowOverlap: true,
          textIgnorePlacement: true,
          textLetterSpacing: 0.02,
          symbolPlacement: 'point',
          visibility: 'visible',
        }}
      />
    </MB.ShapeSource>
  );
});
