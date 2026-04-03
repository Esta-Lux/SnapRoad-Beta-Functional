import React, { useMemo } from 'react';
import MapboxGL from '../../utils/mapbox';
import type { DirectionsStep } from '../../lib/directions';
import {
  buildManeuverArrowPointFeatureCollection,
  buildManeuverSegmentFeatureCollection,
  getUpcomingManeuverStep,
} from '../../navigation/routeGeometry';
import { getManeuverArrowAsset } from '../../navigation/maneuverIcons';

const MANEUVER_CASING_STYLE = {
  lineColor: '#FFFFFF',
  lineWidth: 10,
  lineOpacity: 1,
  lineJoin: 'round' as const,
  lineCap: 'round' as const,
};

interface Props {
  steps: DirectionsStep[] | undefined;
  currentStepIndex: number;
  /** Tint for maneuver stroke (mode route blue). */
  maneuverLineColor: string;
  visible: boolean;
}

/**
 * Short upcoming-step linework + symbol arrow, tied to Mapbox step geometry (not MarkerView).
 */
export default React.memo(function ManeuverHighlightLayers({
  steps,
  currentStepIndex,
  maneuverLineColor,
  visible,
}: Props) {
  const upcoming = useMemo(
    () => (visible ? getUpcomingManeuverStep(steps, currentStepIndex) : null),
    [visible, steps, currentStepIndex],
  );

  const segmentShape = useMemo(
    () => buildManeuverSegmentFeatureCollection(upcoming),
    [upcoming],
  );

  const arrowShape = useMemo(
    () => buildManeuverArrowPointFeatureCollection(upcoming),
    [upcoming],
  );

  const arrowName = getManeuverArrowAsset(upcoming?.maneuver);

  if (!MapboxGL || !visible || !upcoming?.geometryCoordinates?.length) return null;

  return (
    <>
      <MapboxGL.Images
        images={{
          maneuverArrow: require('../../../assets/images/maneuver-arrow.png'),
        }}
      />

      <MapboxGL.ShapeSource id="sr-maneuver-segment" shape={segmentShape}>
        <MapboxGL.LineLayer
          id="sr-maneuver-casing"
          style={MANEUVER_CASING_STYLE}
          aboveLayerID="sr-route-ahead"
        />
        <MapboxGL.LineLayer
          id="sr-maneuver-fill"
          style={{
            lineColor: maneuverLineColor,
            lineWidth: 6,
            lineOpacity: 1,
            lineJoin: 'round',
            lineCap: 'round',
          }}
          aboveLayerID="sr-maneuver-casing"
        />
      </MapboxGL.ShapeSource>

      <MapboxGL.ShapeSource id="sr-maneuver-arrow" shape={arrowShape}>
        <MapboxGL.SymbolLayer
          id="sr-maneuver-arrow-layer"
          style={{
            iconImage: arrowName,
            iconRotate: ['get', 'bearing'],
            iconAllowOverlap: true,
            iconIgnorePlacement: true,
            iconSize: 0.7,
          }}
          aboveLayerID="sr-maneuver-fill"
        />
      </MapboxGL.ShapeSource>
    </>
  );
});
