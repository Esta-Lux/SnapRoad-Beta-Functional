import type { RefObject } from 'react';
import type { Coordinate } from '../types';

/** Normalize vertices from REST Directions, sticky SDK geometry, or `navLogicCoords`. */
export function coerceRouteOverviewPoint(p: {
  lat?: unknown;
  lng?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}): Coordinate | null {
  const lat = typeof p.lat === 'number' ? p.lat : typeof p.latitude === 'number' ? p.latitude : NaN;
  const lng = typeof p.lng === 'number' ? p.lng : typeof p.longitude === 'number' ? p.longitude : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function firstPolylineUsableForOverview(
  candidates: (readonly unknown[] | Coordinate[] | null | undefined)[],
): Coordinate[] | null {
  for (const raw of candidates) {
    if (!raw || raw.length < 2) continue;
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
    if (out.length >= 2) return out;
  }
  return null;
}

export function computeRouteOverviewBounds(
  route: Coordinate[],
  extraPoints: Coordinate[],
): { ne: [number, number]; sw: [number, number] } | null {
  const lngs = [...route.map((c) => c.lng), ...extraPoints.map((c) => c.lng)].filter(Number.isFinite);
  const lats = [...route.map((c) => c.lat), ...extraPoints.map((c) => c.lat)].filter(Number.isFinite);
  if (lngs.length < 2 || lats.length < 2) return null;
  let maxLng = Math.max(...lngs);
  let minLng = Math.min(...lngs);
  let maxLat = Math.max(...lats);
  let minLat = Math.min(...lats);
  const spanLng = Math.max(maxLng - minLng, 0.00035);
  const spanLat = Math.max(maxLat - minLat, 0.00035);
  const padLng = Math.max(spanLng * 0.12, 0.001);
  const padLat = Math.max(spanLat * 0.12, 0.001);
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
  try {
    if (typeof cam.fitBounds === 'function') {
      cam.fitBounds(bounds.ne, bounds.sw, [topPad, sidePad, bottomPad, sidePad], animationMs);
    }
    requestAnimationFrame(() => {
      try {
        cam.setCamera?.({
          heading: 0,
          pitch: 32,
          animationMode: 'easeTo',
          animationDuration: Math.min(420, animationMs),
        });
      } catch {
        /* bird's-eye polish */
      }
    });
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[routeOverviewCamera] fit failed', err);
    }
  }
}
