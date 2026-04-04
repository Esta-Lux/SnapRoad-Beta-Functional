import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import type { DrivingMode } from '../types';

export type MapPrecipitation = 'none' | 'rain' | 'snow';

export type MapWeatherState = {
  precipitation: MapPrecipitation;
  intensity: number;
  summary: string | null;
  temperatureF: number | null;
  isDay: boolean;
  loading: boolean;
};

const initial: MapWeatherState = {
  precipitation: 'none',
  intensity: 0,
  summary: null,
  temperatureF: null,
  isDay: true,
  loading: false,
};

type WeatherPayload = {
  precipitation?: string;
  intensity?: number;
  summary?: string;
  temperature_f?: number | null;
  is_day?: boolean;
};

type WeatherApiBody = {
  success?: boolean;
  data?: WeatherPayload;
};

/**
 * Polls SnapRoad `/api/weather/current` (Open-Meteo backend proxy) on a ~1° lat/lng grid
 * with a default 10-minute refresh for map precipitation + Orion context.
 */
export function useMapWeather(
  lat: number,
  lng: number,
  opts?: { enabled?: boolean; refreshMs?: number },
): MapWeatherState {
  const enabled = opts?.enabled ?? true;
  const refreshMs = opts?.refreshMs ?? 600_000;

  const gridKey = useMemo(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
    if (Math.abs(lat) < 1e-5 && Math.abs(lng) < 1e-5) return '';
    return `${lat.toFixed(2)}_${lng.toFixed(2)}`;
  }, [lat, lng]);

  const [state, setState] = useState<MapWeatherState>(initial);
  const lastGridRef = useRef('');
  const lastFetchAtRef = useRef(0);

  useEffect(() => {
    if (!enabled || !gridKey) {
      setState({ ...initial, loading: false });
      return;
    }

    const now = Date.now();
    const sameGrid = lastGridRef.current === gridKey;
    const due = now - lastFetchAtRef.current >= refreshMs;
    if (sameGrid && !due && lastFetchAtRef.current > 0) {
      return;
    }

    lastGridRef.current = gridKey;
    lastFetchAtRef.current = now;

    const [gLat, gLng] = gridKey.split('_').map(Number);
    let cancelled = false;

    setState((s) => ({ ...s, loading: true }));

    void (async () => {
      const res = await api.get<WeatherApiBody>(
        `/api/weather/current?lat=${encodeURIComponent(String(gLat))}&lng=${encodeURIComponent(String(gLng))}`,
      );

      if (cancelled) return;

      if (!res.success || res.data == null) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }

      const envelope = res.data;
      if (!envelope.success || envelope.data == null) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }

      const payload = envelope.data;
      const raw = typeof payload.precipitation === 'string' ? payload.precipitation : 'none';
      const precipitation: MapPrecipitation =
        raw === 'snow' || raw === 'rain' ? raw : 'none';
      const intensity =
        typeof payload.intensity === 'number' && Number.isFinite(payload.intensity)
          ? Math.max(0, Math.min(1, payload.intensity))
          : 0;
      const summary = typeof payload.summary === 'string' ? payload.summary : null;
      const temperatureF =
        typeof payload.temperature_f === 'number' && Number.isFinite(payload.temperature_f)
          ? payload.temperature_f
          : null;
      const isDay = payload.is_day !== false;

      setState({
        precipitation,
        intensity,
        summary,
        temperatureF,
        isDay,
        loading: false,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, gridKey, refreshMs]);

  return state;
}

/** Scale overlay strength by driving mode (calm = subtle, sport = bolder). */
export function weatherOverlayFactor(mode: DrivingMode, isLight: boolean): number {
  if (mode === 'calm') return isLight ? 0.55 : 0.5;
  if (mode === 'sport') return isLight ? 0.95 : 1;
  return isLight ? 0.72 : 0.78;
}
