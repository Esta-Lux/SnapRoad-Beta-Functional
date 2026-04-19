import { haversineMeters } from '../../utils/distance';

export type MarkerDensityKind = 'camera' | 'cameraNavigating' | 'friend' | 'offer' | 'report';
export type MarkerCoordinate = { lat: number; lng: number };

/**
 * Per-zoom marker cap. Keep these permissive for cameras — OHGO returns hundreds
 * of points across a state and users expect to see all of them at driving zoom.
 * `cameraNavigating` removes the low-zoom culling so cameras stay visible while
 * the user pans/zooms during an active trip on the JS map (hybrid mode).
 */
export function markerCapForZoom(kind: MarkerDensityKind, zoomLevel: number): number {
  switch (kind) {
    case 'camera':
      if (zoomLevel >= 16) return 360;
      if (zoomLevel >= 14.5) return 280;
      if (zoomLevel >= 13) return 220;
      if (zoomLevel >= 11.5) return 180;
      if (zoomLevel >= 10) return 140;
      return 100;
    case 'cameraNavigating':
      if (zoomLevel >= 16) return 420;
      if (zoomLevel >= 14.5) return 340;
      if (zoomLevel >= 13) return 280;
      if (zoomLevel >= 11.5) return 240;
      if (zoomLevel >= 10) return 200;
      return 180;
    case 'friend':
      return zoomLevel >= 15.5 ? 40 : zoomLevel >= 14 ? 26 : 16;
    case 'offer':
      return zoomLevel >= 15.5 ? 104 : zoomLevel >= 14 ? 72 : zoomLevel >= 12.25 ? 44 : 28;
    case 'report':
      return zoomLevel >= 15.5 ? 100 : zoomLevel >= 14 ? 70 : 40;
    default:
      return 40;
  }
}

export function approxVisibleRadiusMeters(zoomLevel: number): number {
  if (zoomLevel >= 17) return 1200;
  if (zoomLevel >= 16) return 2000;
  if (zoomLevel >= 15) return 3500;
  if (zoomLevel >= 14) return 6000;
  if (zoomLevel >= 13) return 10000;
  if (zoomLevel >= 12) return 22000;
  return 30000;
}

function visibleRadiusMetersForKind(kind: MarkerDensityKind, zoomLevel: number): number {
  if (kind === 'camera' || kind === 'cameraNavigating') {
    // Generous coverage: backend caps at ~80 km and OHGO returns hundreds of points.
    // We want to surface them all the way down to state-level browse zoom so users
    // never feel like “half the cameras are missing”.
    if (zoomLevel >= 16) return 3500;
    if (zoomLevel >= 15) return 6000;
    if (zoomLevel >= 14) return 12000;
    if (zoomLevel >= 13) return 22000;
    if (zoomLevel >= 12) return 40000;
    if (zoomLevel >= 11) return 65000;
    return 95000;
  }
  if (kind === 'offer') {
    if (zoomLevel >= 16) return 2600;
    if (zoomLevel >= 15) return 4200;
    if (zoomLevel >= 14) return 7600;
    if (zoomLevel >= 13) return 13000;
    if (zoomLevel >= 12) return 22000;
  }
  return approxVisibleRadiusMeters(zoomLevel);
}

export function sortAndCapMarkers<T extends MarkerCoordinate>(
  items: T[],
  reference: MarkerCoordinate | null,
  zoomLevel: number,
  kind: MarkerDensityKind,
): T[] {
  const valid = items.filter(
    (item) =>
      Number.isFinite(item.lat) &&
      Number.isFinite(item.lng) &&
      !(Math.abs(item.lat) < 1e-7 && Math.abs(item.lng) < 1e-7),
  );
  if (!valid.length) return [];
  if (!reference) return valid.slice(0, markerCapForZoom(kind, zoomLevel));

  const radiusM = visibleRadiusMetersForKind(kind, zoomLevel);
  const withDistance = valid
    .map((item) => ({
      item,
      distanceM: haversineMeters(reference.lat, reference.lng, item.lat, item.lng),
    }))
    .filter((entry) => entry.distanceM <= radiusM);

  const source = withDistance.length > 0 ? withDistance : valid.map((item) => ({
    item,
    distanceM: haversineMeters(reference.lat, reference.lng, item.lat, item.lng),
  }));

  source.sort((a, b) => a.distanceM - b.distanceM);
  return source.slice(0, markerCapForZoom(kind, zoomLevel)).map((entry) => entry.item);
}
