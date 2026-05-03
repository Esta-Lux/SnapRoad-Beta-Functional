/**
 * Pure helpers for the **Insights & Recap** dashboard.
 *
 * The sheet bucketizes trips and gem transactions into a user-selected
 * range (Day / Week / Month / Custom) and renders KPI tiles + a daily
 * miles sparkline + a "vs previous period" delta. All of those are
 * straightforward derivations from `ProfileTripHistoryItem[]` and
 * `ProfileGemTxItem[]`, so we expose them here as React-free pure
 * functions: easy to unit test, easy to keep stable as the UI evolves.
 */
import type { ProfileGemTxItem, ProfileTripHistoryItem } from './types';

export type TimeRangePreset = 'day' | 'week' | 'month' | 'custom';

export type InsightsKpis = {
  trips: number;
  miles: number;
  /** Avg of `safety_score` across qualifying trips (0–100); 0 when no trips. */
  avgSafety: number;
  /** Sum of `gems_earned` across the trips bucket. */
  gemsFromTrips: number;
  /** Sum of `xp_earned` across the trips bucket. */
  xpFromTrips: number;
  /** Mph; 0 when no trips report `max_speed_mph`. */
  topSpeedMph: number;
  /** Mph; weighted by trip miles when present, else simple average. */
  avgSpeedMph: number;
  /** Sum of `fuel_used_gallons` across the bucket. */
  fuelGallons: number;
  /** Sum of `hard_braking_events` across the bucket. */
  hardBrakingTotal: number;
  /** Sum of `speeding_events` across the bucket. */
  speedingTotal: number;
  /** Longest single trip distance in miles. */
  longestTripMiles: number;
};

export type InsightsRange = { startMs: number; endMs: number };

export type InsightsDeltas = {
  /** `(current - previous) / previous`, or `null` when previous == 0. */
  trips: number | null;
  miles: number | null;
  gems: number | null;
  topSpeedMph: number | null;
  avgSafety: number | null;
};

export type InsightsDailyPoint = {
  /** Local-day midnight ms for this bucket. */
  dayStartMs: number;
  /** ISO 'YYYY-MM-DD' label, useful for the x-axis. */
  isoDate: string;
  miles: number;
  trips: number;
  gems: number;
};

/* ── Range helpers ─────────────────────────────────────────────────── */

export function startOfDayMs(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/**
 * Resolve the active range from a preset + optional custom dates. Same
 * semantics as the previous in-component logic, but now exported so the
 * dashboard and unit tests share the contract.
 */
export function getPresetRange(
  preset: TimeRangePreset,
  customStart: string,
  customEnd: string,
  nowMs: number = Date.now(),
): InsightsRange {
  if (preset === 'day') {
    return { startMs: startOfDayMs(new Date(nowMs)), endMs: nowMs };
  }
  if (preset === 'week') {
    return { startMs: nowMs - 7 * 24 * 60 * 60 * 1000, endMs: nowMs };
  }
  if (preset === 'month') {
    return { startMs: nowMs - 30 * 24 * 60 * 60 * 1000, endMs: nowMs };
  }
  const s = Date.parse(`${customStart}T00:00:00`);
  const e = Date.parse(`${customEnd}T23:59:59.999`);
  if (!Number.isFinite(s) || !Number.isFinite(e) || s > e) {
    return { startMs: nowMs - 7 * 24 * 60 * 60 * 1000, endMs: nowMs };
  }
  return { startMs: s, endMs: e };
}

/**
 * The "previous" period of equal length, ending at `range.startMs`.
 * Used for delta arrows on the KPI tiles ("+12% vs last week").
 */
export function getPreviousRange(range: InsightsRange): InsightsRange {
  const span = Math.max(0, range.endMs - range.startMs);
  return { startMs: range.startMs - span, endMs: range.startMs };
}

/* ── Trip / gem timestamp helpers ──────────────────────────────────── */

export function tripTimeMs(t: ProfileTripHistoryItem): number {
  const candidates = [t.tripEndedAtIso, t.startedAtIso].filter(Boolean) as string[];
  for (const s of candidates) {
    const ms = Date.parse(s);
    if (Number.isFinite(ms)) return ms;
  }
  return 0;
}

export function txTimeMs(dateStr: string): number {
  const ms = Date.parse(dateStr);
  return Number.isFinite(ms) ? ms : 0;
}

export function filterTripsInRange(
  trips: ProfileTripHistoryItem[],
  range: InsightsRange,
): ProfileTripHistoryItem[] {
  return trips.filter((t) => {
    const ms = tripTimeMs(t);
    if (ms <= 0) return false;
    return ms >= range.startMs && ms <= range.endMs;
  });
}

export function filterGemTxInRange(
  gemTx: ProfileGemTxItem[],
  range: InsightsRange,
): ProfileGemTxItem[] {
  return gemTx.filter((g) => {
    const ms = txTimeMs(g.date);
    return ms >= range.startMs && ms <= range.endMs;
  });
}

/* ── KPI computation ───────────────────────────────────────────────── */

export function computeKpis(trips: ProfileTripHistoryItem[]): InsightsKpis {
  if (trips.length === 0) {
    return {
      trips: 0,
      miles: 0,
      avgSafety: 0,
      gemsFromTrips: 0,
      xpFromTrips: 0,
      topSpeedMph: 0,
      avgSpeedMph: 0,
      fuelGallons: 0,
      hardBrakingTotal: 0,
      speedingTotal: 0,
      longestTripMiles: 0,
    };
  }

  let miles = 0;
  let safetySum = 0;
  let safetyCount = 0;
  let gems = 0;
  let xp = 0;
  let topSpeed = 0;
  let weightedSpeedSum = 0;
  let weightedSpeedDenom = 0;
  let plainSpeedSum = 0;
  let plainSpeedCount = 0;
  let fuel = 0;
  let hard = 0;
  let speeding = 0;
  let longest = 0;

  for (const t of trips) {
    const m = Number(t.distance_miles ?? 0);
    if (Number.isFinite(m) && m > 0) {
      miles += m;
      if (m > longest) longest = m;
    }
    const s = Number(t.safety_score ?? 0);
    if (Number.isFinite(s) && s > 0) {
      safetySum += s;
      safetyCount += 1;
    }
    const g = Number(t.gems_earned ?? 0);
    if (Number.isFinite(g)) gems += g;
    const x = Number(t.xp_earned ?? 0);
    if (Number.isFinite(x)) xp += x;
    const peak = Number(t.max_speed_mph ?? 0);
    if (Number.isFinite(peak) && peak > topSpeed) topSpeed = peak;
    const avg = Number(t.avg_speed_mph ?? 0);
    if (Number.isFinite(avg) && avg > 0) {
      const w = Number.isFinite(m) && m > 0 ? m : 0;
      if (w > 0) {
        weightedSpeedSum += avg * w;
        weightedSpeedDenom += w;
      } else {
        plainSpeedSum += avg;
        plainSpeedCount += 1;
      }
    }
    const f = Number(t.fuel_used_gallons ?? 0);
    if (Number.isFinite(f) && f > 0) fuel += f;
    hard += Number(t.hard_braking_events ?? 0) || 0;
    speeding += Number(t.speeding_events ?? 0) || 0;
  }

  const avgSpeed =
    weightedSpeedDenom > 0
      ? weightedSpeedSum / weightedSpeedDenom
      : plainSpeedCount > 0
        ? plainSpeedSum / plainSpeedCount
        : 0;

  return {
    trips: trips.length,
    miles,
    avgSafety: safetyCount > 0 ? safetySum / safetyCount : 0,
    gemsFromTrips: gems,
    xpFromTrips: xp,
    topSpeedMph: topSpeed,
    avgSpeedMph: avgSpeed,
    fuelGallons: fuel,
    hardBrakingTotal: hard,
    speedingTotal: speeding,
    longestTripMiles: longest,
  };
}

/* ── Period-over-period deltas ─────────────────────────────────────── */

function pctDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null;
  return (current - previous) / previous;
}

export function computeDeltas(current: InsightsKpis, previous: InsightsKpis): InsightsDeltas {
  return {
    trips: pctDelta(current.trips, previous.trips),
    miles: pctDelta(current.miles, previous.miles),
    gems: pctDelta(current.gemsFromTrips, previous.gemsFromTrips),
    topSpeedMph: pctDelta(current.topSpeedMph, previous.topSpeedMph),
    avgSafety: pctDelta(current.avgSafety, previous.avgSafety),
  };
}

/* ── Daily sparkline buckets ───────────────────────────────────────── */

/**
 * Bucketize trips into per-day points across the range. We always emit
 * points for the whole range (so a missing day is rendered as 0, not as
 * a gap). The returned list is ordered ascending by `dayStartMs`.
 *
 * Cap at 31 days so the sparkline never blows up if someone selects a
 * very wide custom range (matches the visual design — the sparkline is
 * a strip, not a full chart).
 */
export function bucketizeDaily(
  trips: ProfileTripHistoryItem[],
  range: InsightsRange,
  maxBuckets: number = 31,
): InsightsDailyPoint[] {
  const startDay = startOfDayMs(new Date(range.startMs));
  const endDay = startOfDayMs(new Date(range.endMs));
  const dayMs = 24 * 60 * 60 * 1000;
  const fullDays = Math.max(1, Math.floor((endDay - startDay) / dayMs) + 1);
  const days = Math.min(maxBuckets, fullDays);
  const cutoffStart = days < fullDays ? endDay - (days - 1) * dayMs : startDay;

  const points: InsightsDailyPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const dayStart = cutoffStart + i * dayMs;
    points.push({
      dayStartMs: dayStart,
      isoDate: new Date(dayStart).toISOString().slice(0, 10),
      miles: 0,
      trips: 0,
      gems: 0,
    });
  }

  const indexByDay = new Map<number, number>();
  for (let i = 0; i < points.length; i += 1) indexByDay.set(points[i]!.dayStartMs, i);

  for (const t of trips) {
    const ms = tripTimeMs(t);
    if (ms <= 0) continue;
    const ds = startOfDayMs(new Date(ms));
    const idx = indexByDay.get(ds);
    if (idx == null) continue;
    points[idx]!.miles += Number(t.distance_miles ?? 0) || 0;
    points[idx]!.trips += 1;
    points[idx]!.gems += Number(t.gems_earned ?? 0) || 0;
  }

  return points;
}

/* ── Formatters (display helpers) ──────────────────────────────────── */

export function formatPctDelta(d: number | null): string {
  if (d == null || !Number.isFinite(d)) return '—';
  const pct = Math.round(d * 100);
  if (pct === 0) return '0%';
  return `${pct > 0 ? '+' : ''}${pct}%`;
}
