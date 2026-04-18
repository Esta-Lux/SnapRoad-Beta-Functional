/**
 * Pure helpers for the native Mapbox Navigation screen. Extracted so we can unit-test
 * the camera-ahead filtering, bearing math, and merge paths without importing RN.
 */

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Initial bearing from (lat,lng) → (cLat,cLng) in degrees, normalized to [0, 360). */
export function bearingDegrees(lat: number, lng: number, cLat: number, cLng: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const y = Math.sin(toRad(cLng - lng)) * Math.cos(toRad(cLat));
  const x =
    Math.cos(toRad(lat)) * Math.sin(toRad(cLat)) -
    Math.sin(toRad(lat)) * Math.cos(toRad(cLat)) * Math.cos(toRad(cLng - lng));
  const raw = (Math.atan2(y, x) * 180) / Math.PI;
  return (raw + 360) % 360;
}

/** Shortest signed angular delta between `bearing` and `course`, in degrees [0, 180]. */
export function bearingDelta(bearing: number, course: number): number {
  return Math.abs(((bearing - course + 540) % 360) - 180);
}

export interface CameraCandidate {
  id?: unknown;
  title?: unknown;
  name?: unknown;
  lat?: unknown;
  lng?: unknown;
}

export interface CameraAhead {
  id: string;
  name: string;
  distanceMiles: number;
}

export interface PickCameraAheadOptions {
  /** Drop cameras farther than this (miles). */
  maxDistanceMiles?: number;
  /** Cone half-angle (degrees) relative to the driver's course. Defaults to 75. */
  coneHalfDegrees?: number;
}

/**
 * Given the driver's lat/lng/course and a list of camera candidates from the backend,
 * pick the nearest camera that is **ahead on course**. If no camera is ahead but one is
 * behind us, we prefer the ahead-candidate over a closer behind one. If course is not
 * known, falls back to nearest camera within the distance cap.
 *
 * Returns `null` when nothing matches — caller should clear any displayed chip.
 */
export function pickCameraAhead(
  lat: number,
  lng: number,
  course: number | null,
  candidates: CameraCandidate[],
  opts: PickCameraAheadOptions = {},
): CameraAhead | null {
  const maxMi = opts.maxDistanceMiles ?? 6;
  const cone = opts.coneHalfDegrees ?? 75;
  const hasCourse = course != null && Number.isFinite(course);

  let best: { id: string; name: string; distanceMiles: number; ahead: boolean } | null = null;
  for (const rpt of candidates) {
    const cLat = Number(rpt.lat);
    const cLng = Number(rpt.lng);
    if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) continue;
    const distMeters = haversineMeters(lat, lng, cLat, cLng);
    const miles = distMeters / 1609.34;
    if (miles > maxMi) continue;

    let isAhead = true;
    if (hasCourse) {
      const b = bearingDegrees(lat, lng, cLat, cLng);
      isAhead = bearingDelta(b, course as number) <= cone;
    }

    const id = String(rpt.id ?? `${cLat},${cLng}`);
    const name =
      (typeof rpt.title === 'string' && rpt.title.trim()) ||
      (typeof rpt.name === 'string' && rpt.name.trim()) ||
      'Traffic camera';
    const candidate = { id, name, distanceMiles: miles, ahead: isAhead };
    if (!best) {
      best = candidate;
      continue;
    }
    // Prefer a camera actually ahead over a closer one behind us.
    if (isAhead && !best.ahead) {
      best = candidate;
    } else if (isAhead === best.ahead && miles < best.distanceMiles) {
      best = candidate;
    }
  }

  if (!best) return null;
  // Only surface the chip if the chosen camera is ahead (or course unknown so we can't tell).
  if (!hasCourse || best.ahead) {
    return { id: best.id, name: best.name, distanceMiles: best.distanceMiles };
  }
  return null;
}

/** Normalize the shape returned by `/api/map/cameras` (supports wrapped + bare arrays). */
export function extractCameraList(body: unknown): CameraCandidate[] {
  if (Array.isArray(body)) return body as CameraCandidate[];
  if (body && typeof body === 'object') {
    const wrapped = (body as { data?: unknown }).data;
    if (Array.isArray(wrapped)) return wrapped as CameraCandidate[];
  }
  return [];
}
