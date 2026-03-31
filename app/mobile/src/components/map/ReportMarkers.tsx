import React, { useMemo } from 'react';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { Incident } from '../../types';

/** Colour per incident type — matches web MapboxMapSnapRoad sr-reports palette. */
const INCIDENT_COLORS: Record<string, string> = {
  police:       '#2563EB',   // blue — law enforcement
  accident:     '#DC2626',   // red — collision
  crash:        '#DC2626',
  hazard:       '#D97706',   // amber — road hazard
  construction: '#F59E0B',   // yellow — work zone
  weather:      '#0EA5E9',   // sky blue — weather
  pothole:      '#92400E',   // dark brown — road damage
  closure:      '#7C3AED',   // purple — road closed
  camera:       '#6D28D9',
};

/**
 * Single uppercase letter shown on each marker — plain ASCII so it renders on all native devices.
 * Gives each type a distinct visual identity beyond just colour.
 */
const INCIDENT_LABELS: Record<string, string> = {
  police:       'P',
  accident:     'A',
  crash:        'A',
  hazard:       '!',
  construction: 'C',
  weather:      'W',
  pothole:      'O',
  closure:      'X',
  camera:       'C',
};

const DEFAULT_COLOR = '#D97706';
const DEFAULT_LABEL = '!';

interface Props {
  incidents: Incident[];
  onIncidentTap?: (inc: Incident) => void;
}

/**
 * Renders road-report incidents as a CircleLayer stack + SymbolLayer icon letter.
 * Each incident type has a distinct colour AND a distinct letter identifier.
 * Works on all map styles (streets-v12, standard, navigation-night-v1, dark-v11, etc.).
 */
export default React.memo(function ReportMarkers({ incidents, onIncidentTap }: Props) {
  const geojson = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: incidents
      .filter((inc) => isFinite(inc.lat) && isFinite(inc.lng))
      .map((inc) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [inc.lng, inc.lat] },
        properties: {
          id: String(inc.id),
          type: inc.type ?? 'hazard',
          color: INCIDENT_COLORS[inc.type] ?? DEFAULT_COLOR,
          label: INCIDENT_LABELS[inc.type] ?? DEFAULT_LABEL,
          description: inc.description ?? '',
        },
      })),
  }), [incidents]);

  if (!isMapAvailable() || !MapboxGL || incidents.length === 0) return null;
  const MB = MapboxGL;

  const handlePress = (e: any) => {
    if (!onIncidentTap) return;
    const feat = e?.features?.[0];
    if (!feat?.properties) return;
    const p = feat.properties;
    const match = incidents.find((inc) => String(inc.id) === String(p.id));
    if (match) onIncidentTap(match);
  };

  return (
    <MB.ShapeSource
      id="sr-reports-src"
      shape={geojson}
      onPress={handlePress}
      hitbox={{ width: 26, height: 26 }}
    >
      {/* 1. Soft colour glow for context */}
      <MB.CircleLayer
        id="sr-reports-glow"
        layerIndex={88}
        style={{
          circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 11, 14, 17, 18, 26],
          circleColor: ['get', 'color'],
          circleOpacity: 0.18,
          circleBlur: 0.8,
        }}
      />
      {/* 2. White background disc — ensures icon letter is readable on any map style */}
      <MB.CircleLayer
        id="sr-reports-bg"
        layerIndex={89}
        style={{
          circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 8, 14, 12, 18, 18],
          circleColor: '#ffffff',
          circleOpacity: 0.95,
          circlePitchAlignment: 'map',
        }}
      />
      {/* 3. Coloured fill dot matching the incident type */}
      <MB.CircleLayer
        id="sr-reports-dot"
        layerIndex={90}
        style={{
          circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 6, 14, 9, 18, 14],
          circleColor: ['get', 'color'],
          circleStrokeWidth: 0,
          circleOpacity: 0.95,
          circlePitchAlignment: 'map',
        }}
      />
      {/* 4. Single-character icon label — plain ASCII, renders reliably on native */}
      <MB.SymbolLayer
        id="sr-reports-icon"
        layerIndex={91}
        style={{
          textField: ['get', 'label'],
          textSize: ['interpolate', ['linear'], ['zoom'], 10, 8, 14, 11, 18, 15],
          textColor: '#ffffff',
          textHaloColor: ['get', 'color'],
          textHaloWidth: 1.5,
          textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          textAnchor: 'center',
          textAllowOverlap: true,
          textIgnorePlacement: true,
          symbolPlacement: 'point',
          visibility: 'visible',
        }}
      />
    </MB.ShapeSource>
  );
});
