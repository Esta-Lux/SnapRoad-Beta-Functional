import type { DrivingMode } from '../types';

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

const BASE_PRESETS: Record<DrivingMode, CameraPreset> = {
  calm: {
    zoom: 15.8,
    pitch: 58,
    padding: {
      paddingTop: 95,
      paddingBottom: 350,
      paddingLeft: 30,
      paddingRight: 30,
    },
    animationDuration: 800,
  },
  adaptive: {
    zoom: 16.2,
    pitch: 64,
    padding: {
      paddingTop: 90,
      paddingBottom: 335,
      paddingLeft: 28,
      paddingRight: 28,
    },
    animationDuration: 650,
  },
  sport: {
    zoom: 16.6,
    pitch: 68,
    padding: {
      paddingTop: 80,
      paddingBottom: 315,
      paddingLeft: 24,
      paddingRight: 24,
    },
    animationDuration: 500,
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Mode-based follow-camera preset: zoom, pitch, symmetric padding, animation.
 * Tuned for course-follow + bottom-weighted puck (turn card / ETA space).
 */
export function getCameraPreset({
  mode,
  speedMps,
  nextManeuverDistanceMeters,
  safeAreaTop,
  safeAreaBottom,
}: Args): CameraPreset {
  const base = BASE_PRESETS[mode];

  const speedKmh = speedMps * 3.6;

  const speedZoomAdjustment =
    speedKmh > 80 ? -0.25 :
    speedKmh > 50 ? -0.15 :
    speedKmh > 25 ? -0.05 : 0;

  const maneuverZoomAdjustment =
    nextManeuverDistanceMeters < 60 ? 0.35 :
    nextManeuverDistanceMeters < 120 ? 0.2 : 0;

  const maneuverPitchAdjustment =
    nextManeuverDistanceMeters < 60 ? -6 :
    nextManeuverDistanceMeters < 120 ? -4 : 0;

  const zoom = clamp(
    base.zoom + speedZoomAdjustment + maneuverZoomAdjustment,
    15.3,
    17.3,
  );

  const pitch = clamp(
    base.pitch + maneuverPitchAdjustment,
    48,
    70,
  );

  const padding: CameraPadding = {
    paddingTop: base.padding.paddingTop + safeAreaTop,
    paddingBottom: base.padding.paddingBottom + safeAreaBottom,
    paddingLeft: base.padding.paddingLeft,
    paddingRight: base.padding.paddingRight,
  };

  return {
    ...base,
    zoom,
    pitch,
    padding,
    animationDuration: base.animationDuration,
  };
}
