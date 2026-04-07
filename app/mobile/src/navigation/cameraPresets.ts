import type { DrivingMode } from '../types';
import { getCameraConfig } from './navigationCamera';

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

/** Reserved top UI space (turn banner / cards) to keep route context visible ahead. */
export const NAV_UI_HEIGHT = 120;

const SPEED_ZOOM_CURVES: Record<DrivingMode, SpeedZoomPoint[]> = {
  calm: [
    { speed: 0, zoom: 18.2 },
    { speed: 10, zoom: 17.9 },
    { speed: 25, zoom: 17.5 },
    { speed: 45, zoom: 17.0 },
    { speed: 65, zoom: 16.6 },
    { speed: 80, zoom: 16.2 },
  ],
  adaptive: [
    { speed: 0, zoom: 18.4 },
    { speed: 15, zoom: 18.0 },
    { speed: 35, zoom: 17.5 },
    { speed: 55, zoom: 17.0 },
    { speed: 75, zoom: 16.5 },
  ],
  sport: [
    { speed: 0, zoom: 18.6 },
    { speed: 20, zoom: 18.1 },
    { speed: 40, zoom: 17.6 },
    { speed: 60, zoom: 17.0 },
    { speed: 80, zoom: 16.4 },
    { speed: 100, zoom: 15.9 },
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
    basePadBottom: 100,
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
    basePadBottom: 90,
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
    basePadBottom: 80,
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

  let zoom = interpolateZoom(mph, curve);
  const maneuverZoomAdjustment =
    nextManeuverDistanceMeters < 60 ? 0.35 : nextManeuverDistanceMeters < 120 ? 0.2 : 0;
  zoom += maneuverZoomAdjustment;
  zoom = clamp(zoom, 15.4, 18.8);

  const maneuverPitchAdjustment =
    nextManeuverDistanceMeters < 60 ? -6 : nextManeuverDistanceMeters < 120 ? -4 : 0;
  const pitch = clamp(cfg.basePitch + maneuverPitchAdjustment, cfg.minPitch, cfg.maxPitch);

  // Mapbox follow-padding behavior: larger bottom padding moves the puck UP.
  // For a lower puck position, bias to larger top padding and moderate bottom padding.
  const overHighway = Math.max(0, mph - cfg.padTopSpeed);
  const speedTopBoost = Math.min(34, overHighway * 0.45);
  let paddingTop = cfg.padTop + safeAreaTop + NAV_UI_HEIGHT + speedTopBoost;
  let paddingBottom = cfg.basePadBottom + safeAreaBottom;
  if (nextManeuverDistanceMeters < cfg.turnApproachMeters) {
    paddingTop += cfg.turnApproachPadBoost;
  }

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
 * Live navigation: keep UI-aware padding/zoom from {@link getCameraPreset}, blend pitch/zoom/animation
 * with {@link getCameraConfig} so Calm / Adaptive / Sport feel distinct during follow mode.
 */
export function getLiveNavigationCameraPreset(args: Args): CameraPreset {
  const base = getCameraPreset(args);
  const enh = getCameraConfig(args.mode, args.speedMps);
  const zoom = clamp(base.zoom * 0.68 + (enh.zoom + 2.35) * 0.32, 15.1, 18.65);
  const pitch = clamp(enh.pitch * 0.62 + base.pitch * 0.38, 38, 60);
  return {
    zoom,
    pitch,
    padding: base.padding,
    animationDuration: enh.animationDuration,
  };
}
