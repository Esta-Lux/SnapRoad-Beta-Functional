import { haversineMeters } from '../../utils/distance';

export type MarkerDensityKind = 'camera' | 'friend' | 'offer' | 'report';
export type MarkerCoordinate = { lat: number; lng: number };

export function markerCapForZoom(kind: MarkerDensityKind, zoomLevel: number): number {
  switch (kind) {
    case 'camera':
      return zoomLevel >= 16 ? 168 : zoomLevel >= 14.5 ? 128 : zoomLevel >= 13 ? 96 : zoomLevel >= 11.5 ? 72 : 52;
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
  if (kind === 'camera') {
    if (zoomLevel >= 16) return 3000;
    if (zoomLevel >= 15) return 5000;
    if (zoomLevel >= 14) return 9000;
    if (zoomLevel >= 13) return 15000;
    if (zoomLevel >= 12) return 32000;
    if (zoomLevel >= 11) return 50000;
    return 70000;
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
