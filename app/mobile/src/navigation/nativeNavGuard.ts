import type { DrivingMode } from '../types';

type LatLng = { lat: number; lng: number };

export interface NativeNavRouteParams {
  origin: LatLng;
  destination: LatLng & { name?: string };
  voiceMuted?: boolean;
  drivingMode?: string;
  mapStyleUrl?: string;
}

export interface NormalizedNativeNavParams {
  origin: LatLng;
  destination: LatLng & { name?: string };
  voiceMuted: boolean;
  drivingMode: DrivingMode;
  mapStyleUrl?: string;
}

const VALID_MODES: ReadonlySet<DrivingMode> = new Set(['calm', 'adaptive', 'sport']);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validLat(lat: unknown): lat is number {
  return isFiniteNumber(lat) && lat >= -90 && lat <= 90;
}

function validLng(lng: unknown): lng is number {
  return isFiniteNumber(lng) && lng >= -180 && lng <= 180;
}

function normalizeCoord(value: unknown): LatLng | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as { lat?: unknown; lng?: unknown };
  if (!validLat(v.lat) || !validLng(v.lng)) return null;
  return { lat: v.lat, lng: v.lng };
}

function normalizeDrivingMode(mode: unknown): DrivingMode {
  if (typeof mode !== 'string') return 'adaptive';
  return VALID_MODES.has(mode as DrivingMode) ? (mode as DrivingMode) : 'adaptive';
}

function normalizeMapStyleUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

export function normalizeNativeNavParams(value: unknown): NormalizedNativeNavParams | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as NativeNavRouteParams;

  const origin = normalizeCoord(raw.origin);
  const destinationCoord = normalizeCoord(raw.destination);
  if (!origin || !destinationCoord) return null;

  const name =
    raw.destination && typeof raw.destination.name === 'string' && raw.destination.name.trim()
      ? raw.destination.name.trim()
      : undefined;

  return {
    origin,
    destination: { ...destinationCoord, ...(name ? { name } : {}) },
    voiceMuted: Boolean(raw.voiceMuted),
    drivingMode: normalizeDrivingMode(raw.drivingMode),
    mapStyleUrl: normalizeMapStyleUrl(raw.mapStyleUrl),
  };
}

