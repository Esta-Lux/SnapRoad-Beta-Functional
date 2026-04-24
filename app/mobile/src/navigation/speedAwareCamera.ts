/**
 * Speed- and context-aware follow framing for Calm / Adaptive / Sport.
 * All angles are **Mapbox GL pitch** (0 = nadir, higher = more horizon / “into” the road).
 */
import type { DrivingMode } from '../types';

type MphValuePoint = { mph: number; v: number };

const LONG_ROAD_METERS = 260;
const OPEN_ROAD_METERS = 700;

const SPORT_HIGH_MPH = 60;
const SPORT_MAX_ZOOM_PULL = 0.32;
const SPORT_ZOOM_PER_MPH = 0.009;
const SPORT_PAD_TOP_PER_MPH = 1.55;
const SPORT_MAX_PAD_TOP = 56;

/* ── Zoom (Mapbox level): lower = farther out / more corridor visible ──── */
const ZOOM_CALM: MphValuePoint[] = [
  { mph: 0, v: 18.45 },
  { mph: 25, v: 18.0 },
  { mph: 45, v: 17.35 },
  { mph: 65, v: 16.65 },
  { mph: 85, v: 16.0 },
  { mph: 100, v: 15.55 },
];

const ZOOM_ADAPTIVE: MphValuePoint[] = [
  { mph: 0, v: 18.5 },
  { mph: 22, v: 18.05 },
  { mph: 38, v: 17.45 },
  { mph: 55, v: 16.85 },
  { mph: 72, v: 16.25 },
  { mph: 90, v: 15.7 },
  { mph: 100, v: 15.35 },
];

const ZOOM_SPORT: MphValuePoint[] = [
  { mph: 0, v: 18.75 },
  { mph: 20, v: 18.15 },
  { mph: 40, v: 17.35 },
  { mph: 60, v: 16.45 },
  { mph: 80, v: 15.55 },
  { mph: 100, v: 14.85 },
];

/* ── Pitch (degrees): Calm = high / predictive; Sport = low chase at speed ─ */
const PITCH_CALM: MphValuePoint[] = [
  { mph: 0, v: 50 },
  { mph: 25, v: 54 },
  { mph: 45, v: 57 },
  { mph: 65, v: 60 },
  { mph: 85, v: 63 },
  { mph: 100, v: 65 },
];

const PITCH_ADAPTIVE: MphValuePoint[] = [
  { mph: 0, v: 48 },
  { mph: 24, v: 50 },
  { mph: 40, v: 52 },
  { mph: 58, v: 55 },
  { mph: 75, v: 58 },
  { mph: 100, v: 60 },
];

const PITCH_SPORT: MphValuePoint[] = [
  { mph: 0, v: 56 },
  { mph: 20, v: 50 },
  { mph: 40, v: 44 },
  { mph: 60, v: 36 },
  { mph: 80, v: 28 },
  { mph: 100, v: 22 },
];

const CALM_TURN_HOLD_M = 500;
const ADAPT_TURN_IN_M = 500;
const ADAPT_TURN_TIGHT_M = 80;
const SPORT_TUCK_M = 150;

const ACCEL_SPORT_PITCH = 0.45;
const ACCEL_SPORT_ZOOM = 0.04;
const BRAKE_SPORT_PITCH = 0.5;
const BRAKE_SPORT_ZOOM = 0.05;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function inverseLerp(v: number, a: number, b: number) {
  if (b <= a) return 0;
  return clamp((v - a) / (b - a), 0, 1);
}

/** Mph from m/s. */
export function mphFromMps(mps: number) {
  return Math.max(0, mps) * 2.2369362920544;
}

function interpolate1D(mph: number, pts: MphValuePoint[]) {
  if (mph <= pts[0].mph) return pts[0].v;
  for (let i = 1; i < pts.length; i++) {
    if (mph <= pts[i].mph) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const t = (mph - p0.mph) / Math.max(1e-6, p1.mph - p0.mph);
      return p0.v + t * (p1.v - p0.v);
    }
  }
  return pts[pts.length - 1].v;
}

/**
 * @param holdZoom — Calm: hold corridor zoom when a maneuver is within this distance (m).
 */
export function basePitchForMode(mode: DrivingMode, mph: number) {
  switch (mode) {
    case 'calm':
      return interpolate1D(mph, PITCH_CALM);
    case 'sport':
      return interpolate1D(mph, PITCH_SPORT);
    case 'adaptive':
    default:
      return interpolate1D(mph, PITCH_ADAPTIVE);
  }
}

export function baseZoomForMode(mode: DrivingMode, mph: number) {
  const pts = mode === 'calm' ? ZOOM_CALM : mode === 'sport' ? ZOOM_SPORT : ZOOM_ADAPTIVE;
  return interpolate1D(mph, pts);
}

type TurnExtras = { dPitch: number; dZoom: number; holdCalmZoom: boolean };

export function turnAnticipationOffsets(
  mode: DrivingMode,
  nextManeuverDistanceMeters: number,
  longRoad01: number,
): TurnExtras {
  const d = nextManeuverDistanceMeters;
  const holdCalmZoom = mode === 'calm' && d < CALM_TURN_HOLD_M && d > 12;

  let dPitch = 0;
  let dZoom = 0;

  if (mode === 'adaptive' || mode === 'sport') {
    if (d < ADAPT_TURN_IN_M) {
      const p = 1 - d / ADAPT_TURN_IN_M;
      dPitch += (mode === 'sport' ? 7 : 6) * p * p;
      dZoom += (mode === 'sport' ? 0.5 : 0.42) * p;
    }
    if (d < ADAPT_TURN_TIGHT_M) {
      const p = 1 - d / ADAPT_TURN_TIGHT_M;
      dPitch += (mode === 'sport' ? 8 : 7) * p * p;
      dZoom += (mode === 'sport' ? 0.4 : 0.36) * p;
    }
  } else {
    const maneuverZoomAdjustment = d < 55 ? 0.42 : d < 115 ? 0.26 : 0;
    dZoom += maneuverZoomAdjustment;
    dPitch += d < 60 ? -6.5 : d < 120 ? -4.2 : 0;
  }

  const openRoadZoomPullback =
    mode === 'calm' ? 0.2 * longRoad01 : mode === 'adaptive' ? 0.3 * longRoad01 : 0.4 * longRoad01;
  dZoom -= openRoadZoomPullback;

  if (mode === 'sport' && d < SPORT_TUCK_M) {
    const u = 1 - d / SPORT_TUCK_M;
    dPitch += 7 * u * u;
    dZoom += 0.22 * u;
  }

  return { dPitch, dZoom, holdCalmZoom };
}

export function sportAccelerationOffsets(mph: number, accelerationMps2: number) {
  if (!Number.isFinite(accelerationMps2) || Math.abs(accelerationMps2) < 0.4) {
    return { dPitch: 0, dZoom: 0 };
  }
  if (mph < SPORT_HIGH_MPH * 0.4) {
    return { dPitch: 0, dZoom: 0 };
  }
  const a = clamp(accelerationMps2, -6, 6);
  if (a > 0) {
    return {
      dPitch: -Math.min(4, a * ACCEL_SPORT_PITCH),
      dZoom: Math.min(0.28, a * ACCEL_SPORT_ZOOM),
    };
  }
  return {
    dPitch: Math.min(5.5, -a * BRAKE_SPORT_PITCH),
    dZoom: -Math.min(0.3, -a * BRAKE_SPORT_ZOOM),
  };
}

export function sportHighwayZoomPull(mph: number) {
  if (mph <= SPORT_HIGH_MPH) return 0;
  return Math.min(SPORT_MAX_ZOOM_PULL, (mph - SPORT_HIGH_MPH) * SPORT_ZOOM_PER_MPH);
}

export function sportHighwayTopPad(mph: number) {
  if (mph <= SPORT_HIGH_MPH) return 0;
  return Math.min(SPORT_MAX_PAD_TOP, (mph - SPORT_HIGH_MPH) * SPORT_PAD_TOP_PER_MPH);
}

export { LONG_ROAD_METERS, OPEN_ROAD_METERS, inverseLerp as inverseLerp01 };
