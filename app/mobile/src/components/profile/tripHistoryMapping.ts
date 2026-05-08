import type { ProfileTripHistoryItem } from './types';
import {
  sanitizeTripAverageSpeedMph,
  sanitizeTripDistanceMiles,
  sanitizeTripSpeedMph,
} from '../../utils/driveMetrics';

/** Accept flat arrays or legacy envelopes so Insights trip KPIs never silently read as empty. */
export function recentTripsListFromPayload(root: unknown): unknown[] {
  if (Array.isArray(root)) return root;
  const o = root && typeof root === 'object' ? (root as Record<string, unknown>) : null;
  if (!o) return [];
  const layer1 = o.data;
  const layer1Obj =
    layer1 && typeof layer1 === 'object' && !Array.isArray(layer1) ? (layer1 as Record<string, unknown>) : null;
  if (Array.isArray(o.recent_trips)) return o.recent_trips;
  if (layer1Obj && Array.isArray(layer1Obj.recent_trips)) return layer1Obj.recent_trips;
  if (Array.isArray(layer1)) return layer1;
  if (layer1Obj && Array.isArray(layer1Obj.data)) return layer1Obj.data as unknown[];
  return [];
}

function rawObject(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function nestedSummary(t: Record<string, unknown>): Record<string, unknown> {
  const summary = t.summary ?? t.trip_summary ?? t.tripSummary ?? t.metrics ?? t.service_driver_log;
  return summary && typeof summary === 'object' && !Array.isArray(summary)
    ? (summary as Record<string, unknown>)
    : {};
}

function firstValue(t: Record<string, unknown>, keys: string[]): unknown {
  const summary = nestedSummary(t);
  for (const key of keys) {
    const value = t[key] ?? summary[key];
    if (value != null && value !== '') return value;
  }
  return undefined;
}

function firstString(t: Record<string, unknown>, keys: string[], fallback = ''): string {
  const value = firstValue(t, keys);
  return typeof value === 'string' ? value.trim() : fallback;
}

function firstNumber(t: Record<string, unknown>, keys: string[], fallback = 0): number {
  const value = firstValue(t, keys);
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function saneAvgSpeed(rawAvg: number, distanceMiles: number, durationSeconds: number, maxSpeedMph: number): number {
  const avg = sanitizeTripSpeedMph(rawAvg, 130);
  if (avg > 0 && (!maxSpeedMph || avg <= maxSpeedMph)) return avg;
  return sanitizeTripAverageSpeedMph(distanceMiles, durationSeconds, maxSpeedMph || undefined);
}

function toIsoIfValid(s: string): string {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  } catch {
    /* noop */
  }
  return '';
}

function splitDisplayDateTime(anchorRaw: string, rawDate: string, rawTime: string): { date: string; time: string } {
  if (anchorRaw) {
    try {
      const d = new Date(anchorRaw);
      if (!Number.isNaN(d.getTime())) {
        return {
          date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
          time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        };
      }
    } catch {
      /* noop */
    }
  }
  if (rawDate && rawTime) return { date: rawDate, time: rawTime.slice(0, 5) };
  return { date: rawDate || anchorRaw || '—', time: rawTime };
}

export function mapProfileTripHistoryItem(raw: unknown, idx = 0): ProfileTripHistoryItem {
  const t = rawObject(raw);
  const rawEnded = firstString(t, ['ended_at', 'endedAt', 'date', 'created_at', 'createdAt']);
  const rawStarted = firstString(t, ['started_at', 'startedAt']);
  const rawTime = firstString(t, ['time']);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawEnded);
  const anchorRaw = dateOnly && rawTime ? `${rawEnded}T${rawTime}` : rawEnded || rawStarted;
  let tripEndedAtIso = toIsoIfValid(anchorRaw);
  let startedAtIso = toIsoIfValid(rawStarted);
  if (!tripEndedAtIso) tripEndedAtIso = startedAtIso;
  if (!startedAtIso) startedAtIso = tripEndedAtIso;
  const display = splitDisplayDateTime(anchorRaw, rawEnded, rawTime);

  const durSec = firstNumber(t, ['duration_seconds', 'durationSeconds', 'duration_sec', 'duration'], 0);
  const durMinRaw = firstValue(t, ['duration_minutes', 'durationMinutes', 'duration_min']);
  const durMin =
    durMinRaw != null && Number.isFinite(Number(durMinRaw))
      ? Number(durMinRaw)
      : Math.round(durSec / 60);

  const maxSpeedMph = sanitizeTripSpeedMph(
    firstNumber(t, ['max_speed_mph', 'maxSpeedMph', 'top_speed_mph', 'max_speed']),
  );
  const distanceMiles = sanitizeTripDistanceMiles(
    firstNumber(t, ['distance_miles', 'distanceMiles', 'distance']),
    durSec,
    maxSpeedMph || undefined,
  );
  const avgSpeedMph = saneAvgSpeed(
    firstNumber(t, ['avg_speed_mph', 'avgSpeedMph', 'avg_speed', 'average_speed_mph']),
    distanceMiles,
    durSec,
    maxSpeedMph,
  );

  return {
    id: String(firstValue(t, ['id', 'trip_id', 'tripId']) ?? idx),
    date: display.date,
    time: display.time,
    origin: firstString(
      t,
      ['origin', 'origin_label', 'originLabel', 'start_address', 'startAddress', 'start_location', 'startLocation', 'from'],
      'Start',
    ) || 'Start',
    destination: firstString(
      t,
      [
        'destination',
        'destination_label',
        'destinationLabel',
        'dest_label',
        'destLabel',
        'end_address',
        'endAddress',
        'end_location',
        'endLocation',
        'to',
      ],
      'End',
    ) || 'End',
    distance_miles: distanceMiles,
    duration_minutes: durMin,
    duration_seconds: durSec,
    gems_earned: firstNumber(t, ['gems_earned', 'gemsEarned', 'gems']),
    xp_earned: firstNumber(t, ['xp_earned', 'xpEarned', 'xp']),
    safety_score: firstNumber(t, ['safety_score', 'safetyScore', 'safety']),
    avg_speed_mph: avgSpeedMph,
    max_speed_mph: Math.max(maxSpeedMph, avgSpeedMph),
    fuel_used_gallons: firstNumber(t, ['fuel_used_gallons', 'fuelUsedGallons', 'fuel_gallons']),
    fuel_cost_estimate: firstNumber(t, ['fuel_cost_estimate', 'fuelCostEstimate', 'fuel_cost_usd', 'fuel_cost']),
    mileage_value_estimate: firstNumber(t, [
      'mileage_value_estimate',
      'mileageValueEstimate',
      'mileage_value_usd',
      'mileage_value',
    ]),
    hard_braking_events: firstNumber(t, ['hard_braking_events', 'hardBrakingEvents', 'hard_brakes']),
    hard_acceleration_events: firstNumber(t, [
      'hard_acceleration_events',
      'hardAccelerationEvents',
      'hard_accels',
    ]),
    speeding_events: firstNumber(t, ['speeding_events', 'speedingEvents', 'speeding']),
    incidents_reported: firstNumber(t, ['incidents_reported', 'incidentsReported']),
    tripEndedAtIso,
    startedAtIso,
  };
}
