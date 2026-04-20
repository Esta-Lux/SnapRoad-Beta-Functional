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

/**
 * Build a compact list for the native nav map overlay (GeoJSON features are driven from this JSON).
 */
export type NativeNavMapPoi = { lat: number; lng: number; id: string; name: string };

export function camerasForNativeMapOverlay(
  items: CameraCandidate[],
): NativeNavMapPoi[] {
  const out: NativeNavMapPoi[] = [];
  for (const rpt of items) {
    const cLat = Number(rpt.lat);
    const cLng = Number(rpt.lng);
    if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) continue;
    const id = String(rpt.id ?? `${cLat},${cLng}`);
    const name =
      (typeof rpt.title === 'string' && rpt.title.trim()) ||
      (typeof rpt.name === 'string' && rpt.name.trim()) ||
      'Traffic camera';
    out.push({ lat: cLat, lng: cLng, id, name });
  }
  return out;
}

/**
 * Single GeoJSON payload for the native nav `trafficCameras` prop: OHGO cameras plus the same
 * categories MapScreen shows during hybrid navigation (photo reports, traffic-safety POIs,
 * community incidents). The native layer uses one tap target + label; names are prefixed by
 * category so the alert reads clearly.
 */
export function mergeNativeNavMapPois(opts: {
  cameras: CameraCandidate[];
  photoReports?: Array<{ id: string; lat: number; lng: number; description?: string }>;
  trafficZones?: Array<{ id: string; lat: number; lng: number; kind?: string; maxspeed?: unknown }>;
  incidents?: Array<{ id: string | number; lat: number; lng: number; title?: string; type?: string }>;
  maxFeatures?: number;
}): NativeNavMapPoi[] {
  const max = opts.maxFeatures ?? 140;
  const seen = new Set<string>();
  const out: NativeNavMapPoi[] = [];

  const push = (lat: number, lng: number, id: string, name: string) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const k = `${Math.round(lat * 10000)}:${Math.round(lng * 10000)}:${id}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ lat, lng, id, name });
  };

  for (const c of opts.cameras) {
    const cLat = Number(c.lat);
    const cLng = Number(c.lng);
    if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) continue;
    const id = `cam-${String(c.id ?? `${cLat},${cLng}`)}`;
    const name =
      (typeof c.title === 'string' && c.title.trim()) ||
      (typeof c.name === 'string' && c.name.trim()) ||
      'Traffic camera';
    push(cLat, cLng, id, name);
  }

  for (const p of opts.photoReports ?? []) {
    const id = `photo-${p.id}`;
    const label =
      p.description && p.description.trim().length > 0
        ? `Photo report · ${p.description.trim().slice(0, 96)}`
        : 'Photo report';
    push(Number(p.lat), Number(p.lng), id, label);
  }

  for (const z of opts.trafficZones ?? []) {
    if (!z?.id) continue;
    const id = `zone-${z.id}`;
    const kind = typeof z.kind === 'string' ? z.kind : 'speed_camera';
    const ms = z.maxspeed != null ? String(z.maxspeed) : '';
    const label = ms ? `Speed camera · ${kind} (${ms})` : `Speed camera · ${kind}`;
    push(Number(z.lat), Number(z.lng), id, label);
  }

  for (const inc of opts.incidents ?? []) {
    const id = `inc-${String(inc.id)}`;
    const title =
      (typeof inc.title === 'string' && inc.title.trim()) || String(inc.type ?? 'Community report');
    push(Number(inc.lat), Number(inc.lng), id, `Incident · ${title}`);
  }

  return out.slice(0, max);
}

/**
 * Heuristic aligned with native Mapbox Navigation banner filtering: duplicate camera / enforcement
 * lines are suppressed there because SnapRoad draws camera POIs on the map (`trafficCameras`).
 */
export function shouldSuppressSdkCameraInstructionLine(text: string): boolean {
  const s = text.trim().toLowerCase();
  if (!s) return false;
  if (/\bphoto\s+enforcement\b/.test(s)) return true;
  if (/\btraffic\s+enforcement\b/.test(s)) return true;
  if (/\bspeed\s+trap\b/.test(s)) return true;
  if (/\bred[-\s]?light\s+camera\b/.test(s)) return true;
  if (/\b(speed|traffic|red[-\s]?light)?\s*cams?\b/.test(s)) return true;
  if (/\b(speed|traffic)\s+camera\b/.test(s)) return true;
  return false;
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
