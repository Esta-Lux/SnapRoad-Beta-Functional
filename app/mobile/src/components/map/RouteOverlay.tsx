import React, { useMemo } from 'react';
import MapboxGL from '../../utils/mapbox';
import type { Coordinate } from '../../types';
import type { CongestionLevel } from '../../lib/directions';
import {
  buildRouteSplitRingsFromProgress,
  type RouteSplitForOverlay,
} from '../../utils/distance';
import { TRAFFIC_CONGESTION_HEX } from '../../constants/trafficCongestion';
import {
  ROUTE_SOURCE_ID,
  ROUTE_SOURCE_ID_MINIMAL,
  RouteLineLayerIds,
} from '../../map/mapLayerRegistry';

const ROUTE_CONGESTION_COLOR = {
  moderate: '#FF9500',
  heavy: '#FF9500',
  severe: '#FF3B30',
} as const;

interface Props {
  polyline: Coordinate[];
  isNavigating: boolean;
  /** Authoritative split from navigation (segmentIndex + tOnSegment); no GPS / projection in this component. */
  routeSplit?: RouteSplitForOverlay | null;
  /**
   * Fraction of the route that has been traveled, in [0, 1]. When provided
   * (typical nav path **without** congestion shading) the component renders
   * a **single stable GeoJSON feature** for the whole polyline and uses the
   * GPU-side `lineTrimOffset` paint property on the ahead / passed layers to
   * hide the appropriate portion. This eliminates the per-tick GeoJSON
   * re-upload that was causing the route line to visibly "snap" with every
   * progress event — the puck now appears to *slide* along a continuous
   * polyline, matching Apple Maps / native Mapbox Navigation UI.
   *
   * When `undefined` (congestion shading active, or not navigating) we fall
   * back to the legacy feature-split path.
   */
  fractionTraveled?: number | null;
  /** From `DRIVING_MODES[drivingMode]` */
  routeColor: string;
  casingColor: string;
  passedColor: string;
  routeWidth?: number;
  glowColor?: string;
  glowOpacity?: number;
  congestion?: CongestionLevel[];
  showCongestion?: boolean;
  isRerouting?: boolean;
  /** Anchor below a known basemap label layer (style-specific). */
  belowLayerID?: string;
  /**
   * Mapbox Standard / Standard-Satellite: use slots (not legacy layer ids) for stack order.
   * `top` keeps the route above 3D buildings; `middle` sits behind extrusions and reads as “missing”.
   */
  layerSlot?: 'bottom' | 'middle' | 'top';
  /** Degraded path: one source + one line (fewer native layer inserts). */
  routeRenderVariant?: 'full' | 'minimal';
}

function lngLatToCoords(ring: [number, number][]): Coordinate[] {
  return ring.map(([lng, lat]) => ({ lng, lat }));
}

export default React.memo(function RouteOverlay({
  polyline,
  isNavigating,
  routeSplit = null,
  routeColor,
  casingColor,
  passedColor,
  routeWidth = 6,
  glowColor,
  glowOpacity = 0.15,
  congestion,
  showCongestion = false,
  isRerouting = false,
  belowLayerID,
  layerSlot,
  routeRenderVariant = 'full',
}: Props) {
  const hasCongestion = showCongestion && congestion && congestion.length > 0;
  /**
   * Keep `lineTrimOffset` disabled for active navigation. It is elegant when
   * stable, but Mapbox native can intermittently interpret trim ranges as a
   * fully hidden line right after Start. MapScreen now feeds a smoothed
   * `routeSplit`, so the geometry split still tracks the puck without the
   * disappearing-route failure mode.
   */
  const useTrimOffset = false;
  const trimFraction = 0;

  const fullCoords = useMemo(
    () => polyline.map((p): [number, number] => [p.lng, p.lat]),
    [polyline],
  );

  const geoJSON = useMemo(() => {
    if (polyline.length < 2)
      return { type: 'FeatureCollection' as const, features: [] };

    // Always include the full route as a 'base' feature so glow/casing are continuous.
    const baseLine: GeoJSON.Feature = {
      type: 'Feature',
      properties: { segment: 'base', congestion: 'unknown' },
      geometry: { type: 'LineString', coordinates: fullCoords },
    };

    /**
     * Stable-source fast path: one full-route feature per segment role; the
     * visible portion is trimmed on the GPU via `lineTrimOffset` paint
     * properties below. No polyline re-slicing in JS, so the native
     * ShapeSource never re-uploads geometry — the route appears to "slide"
     * smoothly under the puck.
     */
    if (useTrimOffset) {
      return {
        type: 'FeatureCollection' as const,
        features: [
          baseLine,
          {
            type: 'Feature' as const,
            properties: { segment: 'passed', congestion: 'passed' },
            geometry: { type: 'LineString' as const, coordinates: fullCoords },
          },
          {
            type: 'Feature' as const,
            properties: { segment: 'ahead', congestion: 'unknown' },
            geometry: { type: 'LineString' as const, coordinates: fullCoords },
          },
        ],
      };
    }

    if (!isNavigating || !routeSplit) {
      if (hasCongestion) {
        const cf = buildCongestionFeatures(polyline, congestion!, 'ahead');
        cf.features.unshift(baseLine);
        return cf;
      }
      return {
        type: 'FeatureCollection' as const,
        features: [
          baseLine,
          {
            type: 'Feature' as const,
            properties: { segment: 'ahead', congestion: 'unknown' },
            geometry: { type: 'LineString' as const, coordinates: fullCoords },
          },
        ],
      };
    }

    const rings = buildRouteSplitRingsFromProgress(
      polyline,
      routeSplit.segmentIndex,
      routeSplit.tOnSegment,
    );
    if (!rings) {
      return {
        type: 'FeatureCollection' as const,
        features: [
          baseLine,
          {
            type: 'Feature' as const,
            properties: { segment: 'ahead', congestion: 'unknown' },
            geometry: { type: 'LineString' as const, coordinates: fullCoords },
          },
        ],
      };
    }

    const features: GeoJSON.Feature[] = [baseLine];

    if (rings.passedLngLat.length >= 2) {
      features.push({
        type: 'Feature',
        properties: { segment: 'passed', congestion: 'passed' },
        geometry: { type: 'LineString', coordinates: rings.passedLngLat },
      });
    }

    if (rings.aheadLngLat.length >= 2) {
      const firstEdge = rings.firstAheadEdgeIndex;
      if (hasCongestion) {
        const aheadCoords = lngLatToCoords(rings.aheadLngLat);
        const edgeCount = aheadCoords.length - 1;
        const aheadCongestion: CongestionLevel[] = [];
        for (let e = 0; e < edgeCount; e++) {
          const edgeIdx = firstEdge + e;
          aheadCongestion.push(
            edgeIdx >= 0 && edgeIdx < congestion!.length ? congestion![edgeIdx]! : 'unknown',
          );
        }
        const cf = buildCongestionFeatures(aheadCoords, aheadCongestion, 'ahead');
        features.push(...cf.features);
      } else {
        features.push({
          type: 'Feature',
          properties: { segment: 'ahead', congestion: 'unknown' },
          geometry: { type: 'LineString', coordinates: rings.aheadLngLat },
        });
      }
    }

    return { type: 'FeatureCollection' as const, features };
  }, [polyline, fullCoords, isNavigating, routeSplit, hasCongestion, congestion, useTrimOffset]);

  if (polyline.length < 2 || !MapboxGL) return null;

  const useCongestionColor = hasCongestion;

  const aheadLineColor: any = useCongestionColor
    ? [
        'match',
        ['get', 'congestion'],
        'moderate',
        ROUTE_CONGESTION_COLOR.moderate,
        'heavy',
        ROUTE_CONGESTION_COLOR.heavy,
        'severe',
        ROUTE_CONGESTION_COLOR.severe,
        'low',
        routeColor,
        'unknown',
        routeColor,
        routeColor,
      ]
    : routeColor;

  const lineOpacity = isRerouting ? 0.35 : 1.0;
  const passedLineWidth = routeWidth;
  const passedLineOpacity = 0.92 * lineOpacity;
  const effectiveGlowColor = glowColor || routeColor;
  const neonGlowOpacity = Math.min(0.58, Math.max(glowOpacity * 1.14, isNavigating ? 0.24 : 0.16));
  /**
   * Apple-Maps-style stack: a solid halo casing slightly wider than the core, plus a soft outer glow.
   * Casing color is a solid hex (white on dark, navy on light); alpha lives here as `casingPaintOpacity`
   * so it can never collapse to ~0 (regression seen on dark / Sport with a low pre-baked alpha casing).
   * `casingWidthExtra` is the total casing line width minus the core (so the halo shows as
   * `casingWidthExtra / 2` on each side of the core line).
   */
  const casingWidthExtra = 3;
  const casingPaintOpacity = 0.7 * (isRerouting ? 0.5 : 1);
  /**
   * RNMapbox v11 + Mapbox Standard: when a `slot` is set, layer order within the slot is
   * driven by declaration order. Combining `slot` with `aboveLayerID` / `belowLayerID` can
   * silently drop the layer (insert-failure) on iOS — so we only pass the legacy anchors
   * when there's no slot.
   */
  const anchorBelowId = layerSlot ? undefined : belowLayerID;
  const lineSlot = layerSlot;
  const useSlotOrdering = Boolean(layerSlot);

  if (routeRenderVariant === 'minimal') {
    const minimalShape: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: fullCoords },
        },
      ],
    };
    return (
      <MapboxGL.ShapeSource id={ROUTE_SOURCE_ID_MINIMAL} shape={minimalShape} lineMetrics={false}>
        <MapboxGL.LineLayer
          id={RouteLineLayerIds.minimalLine}
          belowLayerID={anchorBelowId}
          slot={lineSlot}
          style={{
            lineColor: routeColor,
            lineWidth: routeWidth + 3,
            lineOpacity,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </MapboxGL.ShapeSource>
    );
  }

  return (
    <MapboxGL.ShapeSource
      id={ROUTE_SOURCE_ID}
      shape={geoJSON as GeoJSON.FeatureCollection}
      lineMetrics={useTrimOffset}
    >
      {/* Continuous outer glow on the full-route base feature — soft blur, no split seam */}
      <MapboxGL.LineLayer
        id={RouteLineLayerIds.glow}
        belowLayerID={anchorBelowId}
        slot={lineSlot}
        filter={['==', ['get', 'segment'], 'base']}
        style={{
          lineColor: effectiveGlowColor,
          lineWidth: routeWidth * 3,
          lineOpacity: neonGlowOpacity * (isRerouting ? 0.3 : 1),
          lineBlur: 10,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/* Continuous casing on the full-route base feature */}
      <MapboxGL.LineLayer
        id={RouteLineLayerIds.casing}
        aboveLayerID={useSlotOrdering ? undefined : RouteLineLayerIds.glow}
        slot={lineSlot}
        filter={['==', ['get', 'segment'], 'base']}
        style={{
          lineColor: casingColor,
          lineWidth: routeWidth + casingWidthExtra,
          lineOpacity: casingPaintOpacity,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/*
        Passed (gray) route.
        - In trim-offset mode the feature is the full polyline; we hide the
          *remaining* portion via `lineTrimOffset: [trimFraction, 1]` so
          only `[0, trimFraction]` stays visible (the part behind the puck).
        - In legacy mode the feature is already the passed-only slice, so
          no trim is applied.
      */}
      <MapboxGL.LineLayer
        id="sr-route-passed"
        slot={lineSlot}
        filter={['==', ['get', 'segment'], 'passed']}
        style={{
          lineColor: passedColor,
          lineWidth: passedLineWidth,
          lineOpacity: passedLineOpacity,
          lineCap: 'round',
          lineJoin: 'round',
          ...(useTrimOffset ? { lineTrimOffset: [trimFraction, 1] } : null),
        }}
      />

      {/*
        Ahead (colored) route.
        - In trim-offset mode the feature is the full polyline; we hide the
          *traveled* portion via `lineTrimOffset: [0, trimFraction]` so
          only `[trimFraction, 1]` (the road ahead) stays visible.
      */}
      <MapboxGL.LineLayer
        id={RouteLineLayerIds.ahead}
        aboveLayerID={useSlotOrdering ? undefined : RouteLineLayerIds.passed}
        slot={lineSlot}
        filter={['==', ['get', 'segment'], 'ahead']}
        style={{
          lineColor: aheadLineColor,
          lineWidth: routeWidth + 0.5,
          lineOpacity,
          lineCap: 'round',
          lineJoin: 'round',
          ...(useTrimOffset ? { lineTrimOffset: [0, trimFraction] } : null),
        }}
      />
    </MapboxGL.ShapeSource>
  );
});

function buildCongestionFeatures(
  coords: Coordinate[],
  congestion: CongestionLevel[],
  segment: string,
): { type: 'FeatureCollection'; features: GeoJSON.Feature[] } {
  const features: GeoJSON.Feature[] = [];
  if (coords.length < 2) return { type: 'FeatureCollection', features };

  let currentLevel = congestion[0] || 'unknown';
  let currentCoords: [number, number][] = [[coords[0].lng, coords[0].lat]];

  for (let i = 1; i < coords.length; i++) {
    const level = i - 1 < congestion.length ? congestion[i - 1] : 'unknown';
    const coord: [number, number] = [coords[i].lng, coords[i].lat];

    if (level !== currentLevel && currentCoords.length >= 1) {
      currentCoords.push(coord);
      features.push({
        type: 'Feature',
        properties: { segment, congestion: currentLevel },
        geometry: { type: 'LineString', coordinates: currentCoords },
      });
      currentLevel = level;
      currentCoords = [coord];
    } else {
      currentCoords.push(coord);
    }
  }

  if (currentCoords.length >= 2) {
    features.push({
      type: 'Feature',
      properties: { segment, congestion: currentLevel },
      geometry: { type: 'LineString', coordinates: currentCoords },
    });
  }

  return { type: 'FeatureCollection', features };
}
