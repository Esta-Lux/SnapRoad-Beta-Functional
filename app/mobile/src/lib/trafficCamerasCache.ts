/**
 * Disk-backed OHGO / traffic camera POI cache (~1 km grid cells).
 * MapScreen and NativeNavigationScreen read stale data instantly offline,
 * then refresh from the API when reachable.
 */
import type { CameraLocation, CameraViewFeed } from '../components/map/CameraMarkers';
import { storage } from '../utils/storage';

const STORAGE_PREFIX = 'snaproad_cameras_v1_';
const TTL_MS = 72 * 60 * 60 * 1000;

type CachedCell = {
  cameras: CameraLocation[];
  fetchedAtMs: number;
  gridKey: string;
};

function parseCameraViewsFromTraffic(raw: unknown): CameraViewFeed[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const list: CameraViewFeed[] = raw
    .map((v: Record<string, unknown>) => ({
      id: String(v?.id ?? ''),
      small_url: String(v?.small_url ?? v?.smallUrl ?? '').trim(),
      large_url: String(v?.large_url ?? v?.largeUrl ?? '').trim(),
      direction: String(v?.direction ?? '').trim(),
    }))
    .map((v) => ({
      ...v,
      small_url: v.small_url || v.large_url,
      large_url: v.large_url || v.small_url,
    }))
    .filter((v) => v.large_url.length > 0);
  return list.length ? list : undefined;
}

export function trafficCameraGridKey(lat: number, lng: number): string {
  return `${Math.round(lat * 100)},${Math.round(lng * 100)}`;
}

export function parseTrafficCamerasFromApiPayload(data: unknown): CameraLocation[] {
  const raw = data as { data?: unknown } | unknown[] | null;
  const items = Array.isArray(raw) ? raw : (raw as { data?: unknown })?.data;
  if (!Array.isArray(items)) return [];
  return items
    .map((rpt: Record<string, unknown>) => ({
      id: String(rpt.id ?? Math.random()),
      name: typeof rpt.title === 'string' ? rpt.title : 'Camera',
      description: typeof rpt.description === 'string' ? rpt.description : undefined,
      lat: Number(rpt.lat),
      lng: Number(rpt.lng),
      camera_views: parseCameraViewsFromTraffic(rpt.camera_views),
    }))
    .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
}

function readCell(gridKey: string): CachedCell | null {
  const raw = storage.getString(`${STORAGE_PREFIX}${gridKey}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedCell;
    if (!parsed || !Array.isArray(parsed.cameras)) return null;
    if (Date.now() - Number(parsed.fetchedAtMs) > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getCachedTrafficCameras(lat: number, lng: number): CameraLocation[] {
  const gridKey = trafficCameraGridKey(lat, lng);
  return readCell(gridKey)?.cameras ?? [];
}

export function setCachedTrafficCameras(lat: number, lng: number, cameras: CameraLocation[]): void {
  const gridKey = trafficCameraGridKey(lat, lng);
  const cell: CachedCell = { cameras, fetchedAtMs: Date.now(), gridKey };
  storage.set(`${STORAGE_PREFIX}${gridKey}`, JSON.stringify(cell));
}

/** Nearest grid cells within ~1 km for offline pan without a fresh fetch. */
export function getCachedTrafficCamerasNear(lat: number, lng: number): CameraLocation[] {
  const baseLat = Math.round(lat * 100);
  const baseLng = Math.round(lng * 100);
  const seen = new Set<string>();
  const out: CameraLocation[] = [];
  for (let dLat = -1; dLat <= 1; dLat += 1) {
    for (let dLng = -1; dLng <= 1; dLng += 1) {
      const cell = readCell(`${baseLat + dLat},${baseLng + dLng}`);
      if (!cell) continue;
      for (const cam of cell.cameras) {
        const id = String(cam.id);
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(cam);
      }
    }
  }
  return out;
}
