import React, { useMemo } from 'react';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import { arrowHeadPoints } from '../../navigation/navGeometry';
import type { DrivingMode } from '../../types';
import type { RoutePoint } from '../../navigation/navModel';
import { NAV_THEME } from '../../navigation/navTheme';

type Props = {
  mode: DrivingMode;
  traveledRoute: RoutePoint[];
  remainingRoute: RoutePoint[];
  maneuverRoute: RoutePoint[];
  /** Dim lines while a new route is loading (reroute). */
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

function multiLineFeature(lines: RoutePoint[][]) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'MultiLineString' as const,
      coordinates: lines.map((line) => line.map((p) => [p.lng, p.lat])),
    },
  };
}

export const NAV_ROUTE_LAYER_IDS = {
  remainingCasing: 'nav-remaining-casing-layer',
  remaining: 'nav-remaining-layer',
  traveled: 'nav-traveled-layer',
  maneuver: 'nav-maneuver-layer',
  arrow: 'nav-maneuver-arrow-layer',
} as const;

export default React.memo(function NavigationRouteLayers({
  mode,
  traveledRoute,
  remainingRoute,
  maneuverRoute,
  lineOpacity = 1,
}: Props) {
  const theme = NAV_THEME[mode];
  const op = lineOpacity;
  const traveled = useMemo(() => lineFeature(traveledRoute), [traveledRoute]);
  const remaining = useMemo(() => lineFeature(remainingRoute), [remainingRoute]);
  const maneuver = useMemo(() => lineFeature(maneuverRoute), [maneuverRoute]);
  const arrowHead = useMemo(() => {
    if (maneuverRoute.length < 2) return null;
    const end = maneuverRoute[maneuverRoute.length - 1]!;
    const prev = maneuverRoute[maneuverRoute.length - 2]!;
    const pts = arrowHeadPoints(end, prev);
    return multiLineFeature([[pts[0]!, pts[1]!], [pts[1]!, pts[2]!]]);
  }, [maneuverRoute]);

  if (!isMapAvailable() || !MapboxGL) return null;
  const MB = MapboxGL;

  return (
    <>
      <MB.ShapeSource id="nav-remaining-casing-src" shape={remaining}>
        <MB.LineLayer
          id={NAV_ROUTE_LAYER_IDS.remainingCasing}
          style={{
            lineColor: theme.casing,
            lineWidth: 10,
            lineOpacity: op,
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
            lineWidth: 6,
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
            lineWidth: 6,
            lineOpacity: op,
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
              lineWidth: 8,
              lineOpacity: op,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </MB.ShapeSource>
      ) : null}

      {arrowHead ? (
        <MB.ShapeSource id="nav-maneuver-arrow-src" shape={arrowHead}>
          <MB.LineLayer
            id={NAV_ROUTE_LAYER_IDS.arrow}
            aboveLayerID={
              maneuverRoute.length >= 2 ? NAV_ROUTE_LAYER_IDS.maneuver : NAV_ROUTE_LAYER_IDS.traveled
            }
            style={{
              lineColor: theme.maneuver,
              lineWidth: 4,
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
