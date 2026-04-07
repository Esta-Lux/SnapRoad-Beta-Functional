import React, { useMemo } from 'react';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { DrivingMode } from '../../types';
import type { RoutePoint } from '../../navigation/navModel';
import { NAV_THEME } from '../../navigation/navTheme';

type Props = {
  mode: DrivingMode;
  traveledRoute: RoutePoint[];
  remainingRoute: RoutePoint[];
  maneuverRoute: RoutePoint[];
  lineOpacity?: number;
};

function lineFeature(points: RoutePoint[]) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: points.map((p) => [p.lng, p.lat]),
    },
  };
}

/** Stronger “remaining” / subtler “traveled” / assertive maneuver — mode-tuned (colors unchanged). */
const WIDTHS: Record<
  DrivingMode,
  { casing: number; remaining: number; traveled: number; maneuver: number }
> = {
  calm: { casing: 15, remaining: 10, traveled: 5, maneuver: 12 },
  adaptive: { casing: 17, remaining: 11, traveled: 5, maneuver: 14 },
  sport: { casing: 18, remaining: 12, traveled: 4, maneuver: 15 },
};

export const NAV_ROUTE_LAYER_IDS = {
  remainingCasing: 'nav-remaining-casing-layer',
  remaining: 'nav-remaining-layer',
  traveled: 'nav-traveled-layer',
  maneuver: 'nav-maneuver-layer',
} as const;

export default React.memo(function NavigationRouteLayers({
  mode,
  traveledRoute,
  remainingRoute,
  maneuverRoute,
  lineOpacity = 1,
}: Props) {
  const theme = NAV_THEME[mode];
  const w = WIDTHS[mode];
  const op = lineOpacity;
  const traveled = useMemo(() => lineFeature(traveledRoute), [traveledRoute]);
  const remaining = useMemo(() => lineFeature(remainingRoute), [remainingRoute]);
  const maneuver = useMemo(() => lineFeature(maneuverRoute), [maneuverRoute]);

  if (!isMapAvailable() || !MapboxGL) return null;
  const MB = MapboxGL;

  return (
    <>
      <MB.ShapeSource id="nav-remaining-casing-src" shape={remaining}>
        <MB.LineLayer
          id={NAV_ROUTE_LAYER_IDS.remainingCasing}
          style={{
            lineColor: theme.casing,
            lineWidth: w.casing,
            lineOpacity: op * 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </MB.ShapeSource>
      <MB.ShapeSource id="nav-remaining-src" shape={remaining}>
        <MB.LineLayer
          id={NAV_ROUTE_LAYER_IDS.remaining}
          aboveLayerID={NAV_ROUTE_LAYER_IDS.remainingCasing}
          style={{
            lineColor: theme.route,
            lineWidth: w.remaining,
            lineOpacity: op,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </MB.ShapeSource>
      <MB.ShapeSource id="nav-traveled-src" shape={traveled}>
        <MB.LineLayer
          id={NAV_ROUTE_LAYER_IDS.traveled}
          aboveLayerID={NAV_ROUTE_LAYER_IDS.remaining}
          style={{
            lineColor: theme.traveled,
            lineWidth: w.traveled,
            lineOpacity: op * 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </MB.ShapeSource>

      {maneuverRoute.length >= 2 ? (
        <MB.ShapeSource id="nav-maneuver-src" shape={maneuver}>
          <MB.LineLayer
            id={NAV_ROUTE_LAYER_IDS.maneuver}
            aboveLayerID={NAV_ROUTE_LAYER_IDS.traveled}
            style={{
              lineColor: theme.maneuver,
              lineWidth: w.maneuver,
              lineOpacity: op,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </MB.ShapeSource>
      ) : null}
    </>
  );
});
