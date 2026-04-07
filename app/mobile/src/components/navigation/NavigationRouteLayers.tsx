import React, { useMemo } from 'react';
import MapboxGL from '../../utils/mapbox';
import type { DrivingMode } from '../../types';
import { ROUTE_THEME_BY_MODE } from '../../navigation/routeTheme';
import type { RoutePoint } from '../../navigation/routeGeometry';
import { buildArrowHead } from '../../navigation/routeGeometry';

type Props = {
  mode: DrivingMode;
  traveledRoute: RoutePoint[];
  remainingRoute: RoutePoint[];
  maneuverRoute: RoutePoint[];
  showArrowHead?: boolean;
  /** Dim lines while a new route is loading (reroute). */
  lineOpacity?: number;
};

function toLineString(points: RoutePoint[]) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: points.map((p) => [p.lng, p.lat]),
    },
  };
}

function toMultiLineString(lines: RoutePoint[][]) {
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
  arrow: 'nav-arrowhead-layer',
} as const;

export default React.memo(function NavigationRouteLayers({
  mode,
  traveledRoute,
  remainingRoute,
  maneuverRoute,
  showArrowHead = true,
  lineOpacity = 1,
}: Props) {
  const theme = ROUTE_THEME_BY_MODE[mode];
  const remainingFeature = useMemo(() => toLineString(remainingRoute), [remainingRoute]);
  const traveledFeature = useMemo(() => toLineString(traveledRoute), [traveledRoute]);
  const maneuverFeature = useMemo(() => toLineString(maneuverRoute), [maneuverRoute]);

  const arrowFeature = useMemo(() => {
    if (!showArrowHead || maneuverRoute.length < 2) return null;
    const end = maneuverRoute[maneuverRoute.length - 1]!;
    const prev = maneuverRoute[maneuverRoute.length - 2]!;
    const arrow = buildArrowHead(end, prev);
    return toMultiLineString([
      [arrow[0]!, arrow[1]!],
      [arrow[1]!, arrow[2]!],
    ]);
  }, [maneuverRoute, showArrowHead]);

  if (!MapboxGL) return null;

  const op = lineOpacity;

  return (
    <>
      <MapboxGL.ShapeSource id="nav-remaining-casing-source" shape={remainingFeature}>
        <MapboxGL.LineLayer
          id={NAV_ROUTE_LAYER_IDS.remainingCasing}
          style={{
            lineColor: theme.casingColor,
            lineWidth: theme.casingWidth,
            lineOpacity: op,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </MapboxGL.ShapeSource>

      <MapboxGL.ShapeSource id="nav-remaining-source" shape={remainingFeature}>
        <MapboxGL.LineLayer
          id={NAV_ROUTE_LAYER_IDS.remaining}
          aboveLayerID={NAV_ROUTE_LAYER_IDS.remainingCasing}
          style={{
            lineColor: theme.routeColor,
            lineWidth: theme.routeWidth,
            lineOpacity: op,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </MapboxGL.ShapeSource>

      <MapboxGL.ShapeSource id="nav-traveled-source" shape={traveledFeature}>
        <MapboxGL.LineLayer
          id={NAV_ROUTE_LAYER_IDS.traveled}
          aboveLayerID={NAV_ROUTE_LAYER_IDS.remaining}
          style={{
            lineColor: theme.traveledColor,
            lineWidth: theme.traveledWidth,
            lineOpacity: op,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </MapboxGL.ShapeSource>

      {maneuverRoute.length >= 2 ? (
        <MapboxGL.ShapeSource id="nav-maneuver-source" shape={maneuverFeature}>
          <MapboxGL.LineLayer
            id={NAV_ROUTE_LAYER_IDS.maneuver}
            aboveLayerID={NAV_ROUTE_LAYER_IDS.traveled}
            style={{
              lineColor: theme.maneuverColor,
              lineWidth: theme.maneuverWidth,
              lineOpacity: op,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </MapboxGL.ShapeSource>
      ) : null}

      {arrowFeature ? (
        <MapboxGL.ShapeSource id="nav-arrowhead-source" shape={arrowFeature}>
          <MapboxGL.LineLayer
            id={NAV_ROUTE_LAYER_IDS.arrow}
            aboveLayerID={maneuverRoute.length >= 2 ? NAV_ROUTE_LAYER_IDS.maneuver : NAV_ROUTE_LAYER_IDS.traveled}
            style={{
              lineColor: theme.maneuverColor,
              lineWidth: Math.max(3, theme.maneuverWidth - 3),
              lineOpacity: op,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </MapboxGL.ShapeSource>
      ) : null}
    </>
  );
});
