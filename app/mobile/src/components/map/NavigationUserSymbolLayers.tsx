import React, { useMemo } from 'react';
import MapboxGL from '../../utils/mapbox';
import { NavigationUserLayerIds, RouteLineLayerIds } from '../../map/mapLayerRegistry';

const ARROW_IMG = require('../../../assets/navigation-user-arrow.png');

export type NavigationUserSymbolLayersProps = {
  /** When false, nothing is rendered (avoid registering Images / sources). */
  visible: boolean;
  lng: number;
  lat: number;
  /** Degrees, clockwise from north — same convention as Mapbox `iconRotate`. */
  bearingDeg: number;
  /** Horizontal GPS accuracy in meters (optional accuracy halo). */
  accuracyMeters?: number | null;
  /** From `effectiveNavRouteColors` / driving mode — SDF tint. */
  routeColor: string;
  routeCasing: string;
  /** Insert arrow above this layer (typically the top route line). */
  aboveLayerID?: string;
};

/**
 * GPU SymbolLayer user position during navigation — avoids MarkerView / PointAnnotation bridge cost.
 * Requires {@link MapboxGL.Images} + ShapeSource + SymbolLayer; optional CircleLayer for accuracy.
 */
export default React.memo(function NavigationUserSymbolLayers({
  visible,
  lng,
  lat,
  bearingDeg,
  accuracyMeters,
  routeColor,
  routeCasing,
  aboveLayerID = RouteLineLayerIds.ahead,
}: NavigationUserSymbolLayersProps) {
  const arrowShape = useMemo(
    (): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'snaproad-nav-user-arrow',
          properties: {
            bearing: Number.isFinite(bearingDeg) ? bearingDeg : 0,
          },
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        },
      ],
    }),
    [lng, lat, bearingDeg],
  );

  const accPx = useMemo(() => {
    const a = accuracyMeters;
    if (a == null || !Number.isFinite(a) || a <= 0) return null;
    return Math.min(Math.max(a * 0.32, 6), 48);
  }, [accuracyMeters]);

  const accShape = useMemo((): GeoJSON.FeatureCollection | null => {
    if (accPx == null) return null;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'snaproad-nav-user-acc',
          properties: { r: accPx },
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        },
      ],
    };
  }, [lng, lat, accPx]);

  if (!visible || !MapboxGL) return null;

  return (
    <>
      <MapboxGL.Images
        images={{
          [NavigationUserLayerIds.imageName]: { image: ARROW_IMG, sdf: true },
        }}
      />
      {accShape ? (
        <MapboxGL.ShapeSource id={NavigationUserLayerIds.sourceAccuracy} shape={accShape}>
          <MapboxGL.CircleLayer
            id={NavigationUserLayerIds.layerAcc}
            aboveLayerID={aboveLayerID}
            style={{
              circleRadius: ['get', 'r'],
              circleColor: routeCasing,
              circleOpacity: 0.14,
              circlePitchAlignment: 'map',
            }}
          />
        </MapboxGL.ShapeSource>
      ) : null}
      <MapboxGL.ShapeSource id={NavigationUserLayerIds.source} shape={arrowShape}>
        <MapboxGL.SymbolLayer
          id={NavigationUserLayerIds.layerArrow}
          aboveLayerID={accShape ? NavigationUserLayerIds.layerAcc : aboveLayerID}
          style={{
            iconImage: NavigationUserLayerIds.imageName,
            iconRotate: ['get', 'bearing'],
            iconRotationAlignment: 'map',
            iconPitchAlignment: 'map',
            iconAllowOverlap: true,
            iconIgnorePlacement: true,
            iconSize: 0.38,
            iconColor: routeColor,
            iconHaloColor: routeCasing,
            iconHaloWidth: 1.25,
          }}
        />
      </MapboxGL.ShapeSource>
    </>
  );
});
