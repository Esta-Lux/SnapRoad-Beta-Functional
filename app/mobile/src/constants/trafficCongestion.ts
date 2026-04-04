/**
 * Single palette for Mapbox traffic tile overlay + Directions congestion route segments.
 * Keep route LineLayer `match` expressions and TrafficLayer lineColor in sync.
 */
export const TRAFFIC_CONGESTION_HEX = {
  low: '#34C759',
  moderate: '#FFD60A',
  heavy: '#FF9500',
  severe: '#FF3B30',
  unknown: '#6B7280',
} as const;

/** Full road / closure emphasis (Mapbox traffic `closed` field). */
export const TRAFFIC_CLOSED_ROAD_HEX = '#1F2937';
