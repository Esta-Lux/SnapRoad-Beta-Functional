import type { TripSummary } from '../types/tripSummary';
import type { ProfileGemTxItem } from '../components/profile/types';
import { storage } from './storage';

export const LOCAL_COMPLETED_TRIPS_KEY = 'snaproad_local_completed_trips_v1';

type LocalTripRow = TripSummary & {
  id: string;
  trip_id?: string | null;
  local_only: true;
};

const MAX_LOCAL_TRIPS = 120;

function parseRows(raw: string | undefined): LocalTripRow[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is LocalTripRow => Boolean(x && typeof x === 'object' && (x as LocalTripRow).id));
  } catch {
    return [];
  }
}

export async function readLocalCompletedTrips(): Promise<LocalTripRow[]> {
  const raw = await storage.getStringAsync(LOCAL_COMPLETED_TRIPS_KEY);
  return parseRows(raw);
}

function tripDedupeKey(row: Record<string, unknown>): string {
  const ended = String(row.ended_at ?? row.endedAt ?? row.tripEndedAtIso ?? row.date ?? '');
  const dest = String(row.destination ?? row.destination_label ?? row.to ?? '').trim().toLowerCase();
  const distance = Math.round(Number(row.distance_miles ?? row.distance ?? 0) * 10) / 10;
  return `${ended.slice(0, 16)}|${dest}|${distance}`;
}

export function mergeCompletedTripRows(remoteRows: unknown[], localRows: unknown[]): unknown[] {
  const out: unknown[] = [];
  const seen = new Set<string>();
  for (const row of remoteRows) {
    const obj = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    const id = String(obj.id ?? obj.trip_id ?? '');
    const key = tripDedupeKey(obj);
    if (id) seen.add(id);
    if (key) seen.add(key);
    out.push(row);
  }
  for (const row of localRows) {
    const obj = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    const id = String(obj.trip_id ?? '');
    const key = id || tripDedupeKey(obj);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push(row);
  }
  return out;
}

export async function persistLocalCompletedTrip(summary: TripSummary): Promise<void> {
  if (summary.counted === false) return;
  const ended = summary.ended_at || new Date().toISOString();
  const id = summary.profile_totals ? `server:${summary.ended_at ?? ended}` : `local:${ended}:${summary.distance}`;
  const row: LocalTripRow = {
    ...summary,
    id,
    trip_id: null,
    local_only: true,
    ended_at: ended,
    started_at: summary.started_at || ended,
  };
  const existing = await readLocalCompletedTrips();
  const merged = mergeCompletedTripRows([], [row, ...existing]) as LocalTripRow[];
  const sorted = merged
    .sort((a, b) => Date.parse(b.ended_at || '') - Date.parse(a.ended_at || ''))
    .slice(0, MAX_LOCAL_TRIPS);
  storage.set(LOCAL_COMPLETED_TRIPS_KEY, JSON.stringify(sorted));
}

export function gemTransactionsFromTrips(rows: Array<Record<string, unknown>>): ProfileGemTxItem[] {
  return rows
    .map((row, idx): ProfileGemTxItem | null => {
      const amount = Number(row.gems_earned ?? row.gemsEarned ?? row.gems ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) return null;
      const date = String(row.ended_at ?? row.endedAt ?? row.tripEndedAtIso ?? new Date().toISOString());
      return {
        id: `trip-gems-${String(row.id ?? row.trip_id ?? idx)}`,
        type: 'earned',
        amount,
        source: 'Trip reward',
        date,
      };
    })
    .filter((x): x is ProfileGemTxItem => x != null);
}
