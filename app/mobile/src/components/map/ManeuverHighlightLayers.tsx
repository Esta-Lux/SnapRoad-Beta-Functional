import React, { useMemo } from 'react';
import MapboxGL from '../../utils/mapbox';
import type { DirectionsStep } from '../../lib/directions';
import {
  buildManeuverSegmentFeatureCollection,
  getUpcomingManeuverStep,
} from '../../navigation/routeGeometry';

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
 * Short highlight along the upcoming maneuver (no on-map arrow glyph — turn card carries the icon).
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

  if (!MapboxGL || !visible || !upcoming?.geometryCoordinates?.length) return null;

  return (
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
  );
});
