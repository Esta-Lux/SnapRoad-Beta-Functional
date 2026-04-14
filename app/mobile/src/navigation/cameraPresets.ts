import type { DrivingMode } from '../types';
import { getCameraConfig } from './navigationCamera'; // re-exports from navModeProfile

export type CameraPadding = {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
};

export type CameraPreset = {
  zoom: number;
  pitch: number;
  padding: CameraPadding;
  animationDuration: number;
};

type Args = {
  mode: DrivingMode;
  /** Ground speed in m/s */
  speedMps: number;
  nextManeuverDistanceMeters: number;
  /** Added to preset padding (safe areas). */
  safeAreaTop: number;
  safeAreaBottom: number;
};

type SpeedZoomPoint = { speed: number; zoom: number };

/**
 * Reserved top space for the floating turn instruction card (primary row + optional
 * lane strip / “then” line). Keeps forward road framed below the card instead of under it.
 */
export const NAV_TURN_CARD_RESERVE_PX = 168;

/**
 * Bottom map chrome while navigating: {@link NavigationStatusStrip} + End button + margins.
 * FAB column offsets should stay at or above this so controls do not overlap the strip.
 */
export const NAV_MAP_BOTTOM_CHROME_PX = 224;

/** @deprecated Use {@link NAV_TURN_CARD_RESERVE_PX} */
export const NAV_UI_HEIGHT = NAV_TURN_CARD_RESERVE_PX;

// SPORT high-speed camera constants
/** MPH threshold above which SPORT mode extends the camera look-ahead. */
const SPORT_HIGH_SPEED_MPH = 60;
/** Maximum zoom pullback (zoom levels) at very high SPORT speeds. */
const SPORT_MAX_ZOOM_PULLBACK = 0.3;
/** Zoom reduction per MPH above {@link SPORT_HIGH_SPEED_MPH}. */
const SPORT_ZOOM_RATE_PER_MPH = 0.008;
/** Maximum extra top-padding (px) added for SPORT look-ahead. */
const SPORT_MAX_PAD_TOP_BOOST = 50;
/** Top-padding increase per MPH above {@link SPORT_HIGH_SPEED_MPH}. */
const SPORT_PAD_RATE_PER_MPH = 1.5;

const LONG_ROAD_METERS = 260;
const OPEN_ROAD_METERS = 700;

const SPEED_ZOOM_CURVES: Record<DrivingMode, SpeedZoomPoint[]> = {
  calm: [
    { speed: 0, zoom: 18.35 },
    { speed: 8, zoom: 18.05 },
    { speed: 18, zoom: 17.75 },
    { speed: 30, zoom: 17.45 },
    { speed: 45, zoom: 17.05 },
    { speed: 60, zoom: 16.65 },
    { speed: 75, zoom: 16.35 },
    { speed: 90, zoom: 16.05 },
  ],
  adaptive: [
    { speed: 0, zoom: 18.45 },
    { speed: 12, zoom: 18.1 },
    { speed: 28, zoom: 17.65 },
    { speed: 42, zoom: 17.25 },
    { speed: 58, zoom: 16.85 },
    { speed: 72, zoom: 16.45 },
    { speed: 88, zoom: 16.1 },
  ],
  sport: [
    { speed: 0, zoom: 18.65 },
    { speed: 15, zoom: 18.2 },
    { speed: 32, zoom: 17.75 },
    { speed: 48, zoom: 17.25 },
    { speed: 65, zoom: 16.75 },
    { speed: 82, zoom: 16.25 },
    { speed: 100, zoom: 15.85 },
  ],
};

const MODE_CONFIG: Record<
  DrivingMode,
  {
    basePitch: number;
    minPitch: number;
    maxPitch: number;
    basePadBottom: number;
    padTop: number;
    padLeft: number;
    padRight: number;
    padTopSpeed: number;
    turnApproachPadBoost: number;
    turnApproachMeters: number;
    transitionMs: number;
  }
> = {
  calm: {
    basePitch: 52,
    minPitch: 42,
    maxPitch: 58,
    basePadBottom: NAV_MAP_BOTTOM_CHROME_PX,
    padTop: 350,
    padLeft: 30,
    padRight: 30,
    padTopSpeed: 52,
    turnApproachPadBoost: 22,
    turnApproachMeters: 180,
    transitionMs: 900,
  },
  adaptive: {
    basePitch: 50,
    minPitch: 40,
    maxPitch: 56,
    basePadBottom: NAV_MAP_BOTTOM_CHROME_PX,
    padTop: 330,
    padLeft: 28,
    padRight: 28,
    padTopSpeed: 48,
    turnApproachPadBoost: 20,
    turnApproachMeters: 180,
    transitionMs: 720,
  },
  sport: {
    basePitch: 54,
    minPitch: 42,
    maxPitch: 60,
    basePadBottom: NAV_MAP_BOTTOM_CHROME_PX,
    padTop: 310,
    padLeft: 24,
    padRight: 24,
    padTopSpeed: 44,
    turnApproachPadBoost: 18,
    turnApproachMeters: 180,
    transitionMs: 500,
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** miles per hour from m/s */
function mphFromMps(speedMps: number): number {
  return Math.max(0, speedMps) * 2.2369362920544;
}

function interpolateZoom(mph: number, curve: SpeedZoomPoint[]): number {
  const pts = curve;
  if (mph <= pts[0].speed) return pts[0].zoom;
  for (let i = 1; i < pts.length; i++) {
    if (mph <= pts[i].speed) {
      const a = pts[i - 1];
      const b = pts[i];
      const t = (mph - a.speed) / Math.max(1e-6, b.speed - a.speed);
      return a.zoom + t * (b.zoom - a.zoom);
    }
  }
  return pts[pts.length - 1].zoom;
}

function inverseLerp(value: number, low: number, high: number): number {
  if (high <= low) return 0;
  return clamp((value - low) / (high - low), 0, 1);
}

/**
 * Follow-camera preset: speed-interpolated zoom, mode pitch/padding, maneuver nudges.
 */
export function getCameraPreset({
  mode,
  speedMps,
  nextManeuverDistanceMeters,
  safeAreaTop,
  safeAreaBottom,
}: Args): CameraPreset {
  const cfg = MODE_CONFIG[mode];
  const curve = SPEED_ZOOM_CURVES[mode];
  const mph = mphFromMps(speedMps);
  const longRoad01 = inverseLerp(nextManeuverDistanceMeters, LONG_ROAD_METERS, OPEN_ROAD_METERS);
  const turnNear01 = 1 - inverseLerp(nextManeuverDistanceMeters, 45, 180);

  let zoom = interpolateZoom(mph, curve);
  const maneuverZoomAdjustment =
    nextManeuverDistanceMeters < 55 ? 0.42 : nextManeuverDistanceMeters < 115 ? 0.26 : 0;
  zoom += maneuverZoomAdjustment;
  const openRoadZoomPullback =
    mode === 'calm'
      ? 0.18 * longRoad01
      : mode === 'adaptive'
        ? 0.28 * longRoad01
        : 0.38 * longRoad01;
  zoom -= openRoadZoomPullback;

  // SPORT: at highway speeds pull back zoom slightly so more road is visible.
  if (mode === 'sport' && mph > SPORT_HIGH_SPEED_MPH) {
    zoom -= Math.min(SPORT_MAX_ZOOM_PULLBACK, (mph - SPORT_HIGH_SPEED_MPH) * SPORT_ZOOM_RATE_PER_MPH);
  }

  zoom = clamp(zoom, 15.15, 18.92);

  // ADAPTIVE: interpolate pitch between minPitch (standing) and maxPitch (highway),
  // giving users the "reactive" camera feel the mode name implies.
  let pitch: number;
  if (mode === 'adaptive') {
    const speedFraction = clamp(mph / 70, 0, 1);
    const basePitch = cfg.minPitch + speedFraction * (cfg.maxPitch - cfg.minPitch);
    const maneuverPitchAdj =
      nextManeuverDistanceMeters < 60 ? -6 : nextManeuverDistanceMeters < 120 ? -4 : 0;
    pitch = clamp(basePitch + maneuverPitchAdj + longRoad01 * 2, cfg.minPitch, cfg.maxPitch);
  } else {
    const maneuverPitchAdjustment =
      nextManeuverDistanceMeters < 60 ? -6 : nextManeuverDistanceMeters < 120 ? -4 : 0;
    const openRoadPitchBoost =
      mode === 'calm'
        ? 1.5 * longRoad01
        : 3.2 * longRoad01;
    pitch = clamp(cfg.basePitch + maneuverPitchAdjustment + openRoadPitchBoost, cfg.minPitch, cfg.maxPitch);
  }

  // Mapbox follow-padding behavior: larger bottom padding moves the puck UP.
  // For a lower puck position, bias to larger top padding and moderate bottom padding.
  const overHighway = Math.max(0, mph - cfg.padTopSpeed);
  const speedTopBoost = Math.min(34, overHighway * 0.45);
  let paddingTop =
    cfg.padTop +
    safeAreaTop +
    NAV_UI_HEIGHT +
    speedTopBoost +
    longRoad01 * (mode === 'calm' ? 34 : mode === 'adaptive' ? 52 : 68);
  let paddingBottom = cfg.basePadBottom + safeAreaBottom;
  if (nextManeuverDistanceMeters < cfg.turnApproachMeters) {
    paddingTop += cfg.turnApproachPadBoost * (0.55 + 0.45 * turnNear01);
    paddingBottom +=
      (mode === 'calm' ? 22 : mode === 'adaptive' ? 28 : 34) *
      clamp(turnNear01, 0, 1);
  }

  // SPORT: at high speed add extra top padding (look-ahead) so more road extends ahead.
  if (mode === 'sport' && mph > SPORT_HIGH_SPEED_MPH) {
    paddingTop += Math.min(SPORT_MAX_PAD_TOP_BOOST, (mph - SPORT_HIGH_SPEED_MPH) * SPORT_PAD_RATE_PER_MPH);
  }

  paddingBottom -=
    (mode === 'calm' ? 10 : mode === 'adaptive' ? 16 : 22) * longRoad01;
  paddingBottom = Math.max(cfg.basePadBottom + safeAreaBottom - 20, paddingBottom);

  /** Symmetric left/right padding keeps the route corridor centered ahead (no side-chase framing). */
  const padding: CameraPadding = {
    paddingTop,
    paddingBottom,
    paddingLeft: cfg.padLeft,
    paddingRight: cfg.padRight,
  };

  return {
    zoom,
    pitch,
    padding,
    animationDuration: cfg.transitionMs,
  };
}

/**
 * Live navigation: same zoom / pitch / padding as {@link getCameraPreset} (speed curves + maneuver nudges).
 * {@link getCameraConfig} uses low browse-style zoom (~14) — blending it here pulled follow zoom down and felt inconsistent.
 * We only blend animation duration so Calm / Adaptive / Sport still differ in how snappy the camera eases.
 */
export function getLiveNavigationCameraPreset(args: Args): CameraPreset {
  const base = getCameraPreset(args);
  const enh = getCameraConfig(args.mode, args.speedMps);
  const animationDuration = Math.round(
    clamp(base.animationDuration * 0.52 + enh.animationDuration * 0.48, 320, 980),
  );
  return {
    zoom: base.zoom,
    pitch: base.pitch,
    padding: base.padding,
    animationDuration,
  };
}

/**
 * Follow padding for the first navigation frames (before speed/maneuver-driven camera updates)
 * or when `camCtrl` is null — same formula as {@link getCameraPreset} to avoid padding jumps.
 */
export function getNavigationFollowPaddingFallback(
  mode: DrivingMode,
  safeAreaTop: number,
  safeAreaBottom: number,
): CameraPadding {
  return getCameraPreset({
    mode,
    speedMps: 0,
    nextManeuverDistanceMeters: 400,
    safeAreaTop,
    safeAreaBottom,
  }).padding;
}
