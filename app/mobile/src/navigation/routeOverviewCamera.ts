import type { RefObject } from 'react';
import type { Coordinate } from '../types';

function finiteCoordinate(c: Coordinate): boolean {
  return (
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    Math.abs(c.lat) <= 90 &&
    Math.abs(c.lng) <= 180
  );
}

function metersBetween(a: Coordinate, b: Coordinate): number {
  const rad = Math.PI / 180;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function polylineMeters(polyline: Coordinate[]): number {
  let total = 0;
  for (let i = 1; i < polyline.length; i += 1) {
    total += metersBetween(polyline[i - 1]!, polyline[i]!);
  }
  return total;
}

/** Normalize vertices from REST Directions, sticky SDK geometry, or `navLogicCoords`. */
export function coerceRouteOverviewPoint(p: {
  lat?: unknown;
  lng?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}): Coordinate | null {
  const lat = typeof p.lat === 'number' ? p.lat : typeof p.latitude === 'number' ? p.latitude : NaN;
  const lng = typeof p.lng === 'number' ? p.lng : typeof p.longitude === 'number' ? p.longitude : NaN;
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) return null;
  return { lat, lng };
}

function polylineFromCandidate(
  raw: readonly unknown[] | Coordinate[] | null | undefined,
): Coordinate[] | null {
  if (!raw || raw.length < 2) return null;
  const out: Coordinate[] = [];
  for (const pt of raw) {
    const c = coerceRouteOverviewPoint(pt as {
      lat?: unknown;
      lng?: unknown;
      latitude?: unknown;
      longitude?: unknown;
    });
    if (c) out.push(c);
  }
  return out.length >= 2 ? out : null;
}

export function firstPolylineUsableForOverview(
  candidates: (readonly unknown[] | Coordinate[] | null | undefined)[],
): Coordinate[] | null {
  for (const raw of candidates) {
    const poly = polylineFromCandidate(raw);
    if (poly) return poly;
  }
  return null;
}

/**
 * Prefer the physically longest finite polyline. During navigation the trimmed
 * "remaining" line is often listed before the full route and made overview look
 * like a tiny local preview. Vertex count alone is not enough because alternates
 * or simplified API payloads can have very different sampling densities.
 */
export function longestPolylineUsableForOverview(
  candidates: (readonly unknown[] | Coordinate[] | null | undefined)[],
): Coordinate[] | null {
  let best: Coordinate[] | null = null;
  let bestMeters = -1;
  for (const raw of candidates) {
    const poly = polylineFromCandidate(raw);
    if (!poly) continue;
    const meters = polylineMeters(poly);
    if (!best || meters > bestMeters) {
      best = poly;
      bestMeters = meters;
    }
  }
  return best;
}

export function computeRouteOverviewBounds(
  route: Coordinate[],
  extraPoints: Coordinate[],
): { ne: [number, number]; sw: [number, number] } | null {
  const safeRoute = route.filter(finiteCoordinate);
  const safeExtras = extraPoints.filter(finiteCoordinate);
  const lngs = [...safeRoute.map((c) => c.lng), ...safeExtras.map((c) => c.lng)].filter(Number.isFinite);
  const lats = [...safeRoute.map((c) => c.lat), ...safeExtras.map((c) => c.lat)].filter(Number.isFinite);
  if (lngs.length < 2 || lats.length < 2) return null;
  let maxLng = Math.max(...lngs);
  let minLng = Math.min(...lngs);
  let maxLat = Math.max(...lats);
  let minLat = Math.min(...lats);
  const spanLng = Math.max(maxLng - minLng, 0.00035);
  const spanLat = Math.max(maxLat - minLat, 0.00035);
  const padLng = Math.max(spanLng * 0.14, 0.0015);
  const padLat = Math.max(spanLat * 0.14, 0.0015);
  return {
    ne: [maxLng + padLng, maxLat + padLat],
    sw: [minLng - padLng, minLat - padLat],
  };
}

export function applyRouteOverviewCamera(
  cameraRef: RefObject<{ fitBounds?: (...args: unknown[]) => void; setCamera?: (cfg: Record<string, unknown>) => void } | null>,
  bounds: { ne: [number, number]; sw: [number, number] },
  padding: { topPad: number; sidePad: number; bottomPad: number },
  animationMs: number,
): void {
  const cam = cameraRef.current;
  if (!cam) return;
  const { topPad, sidePad, bottomPad } = padding;
  const pad = [topPad, sidePad, bottomPad, sidePad];
  try {
    // fitBounds alone — a follow-up setCamera(pitch/heading) resets zoom and shrinks the overview.
    if (typeof cam.setCamera === 'function') {
      cam.setCamera({
        bounds: { ne: bounds.ne, sw: bounds.sw },
        padding: {
          paddingTop: topPad,
          paddingRight: sidePad,
          paddingBottom: bottomPad,
          paddingLeft: sidePad,
        },
        heading: 0,
        pitch: 0,
        animationMode: 'easeTo',
        animationDuration: animationMs,
      });
      return;
    }
    if (typeof cam.fitBounds === 'function') {
      cam.fitBounds(bounds.ne, bounds.sw, pad, animationMs);
    }
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[routeOverviewCamera] fit failed', err);
    }
  }
}
