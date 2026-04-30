import type { DrivingMode } from '../types';
import { getCameraConfig } from './navigationCamera';
import {
  basePitchForMode,
  baseZoomForMode,
  inverseLerp01,
  mphFromMps,
  turnAnticipationOffsets,
  sportAccelerationOffsets,
  sportHighwayZoomPull,
  sportHighwayTopPad,
  LONG_ROAD_METERS,
  OPEN_ROAD_METERS,
} from './speedAwareCamera';

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
  safeAreaTop: number;
  safeAreaBottom: number;
  /** Longitudinal acceleration (m/s²) for Sport chase-cam lunge / pull-back. */
  accelerationMps2?: number;
};

/**
 * Reserved top space for the floating turn instruction card.
 */
export const NAV_TURN_CARD_RESERVE_PX = 152;

export const NAV_MAP_BOTTOM_CHROME_PX = 284;

/** @deprecated Use {@link NAV_TURN_CARD_RESERVE_PX} */
export const NAV_UI_HEIGHT = NAV_TURN_CARD_RESERVE_PX;

const MODE_CONFIG: Record<
  DrivingMode,
  {
    minPitch: number;
    maxPitch: number;
    basePadBottom: number;
    padTop: number;
    padLeft: number;
    padRight: number;
    padTopSpeed: number;
    turnApproachPadBoost: number;
    turnApproachMeters: number;
    /** Calm: gentle 3s; Adaptive: 1.5s; Sport: snappy. */
    transitionMs: number;
  }
> = {
  calm: {
    minPitch: 44,
    maxPitch: 68,
    basePadBottom: NAV_MAP_BOTTOM_CHROME_PX,
    padTop: 286,
    padLeft: 30,
    padRight: 30,
    padTopSpeed: 42,
    turnApproachPadBoost: 20,
    turnApproachMeters: 200,
    transitionMs: 1320,
  },
  adaptive: {
    minPitch: 42,
    maxPitch: 66,
    basePadBottom: NAV_MAP_BOTTOM_CHROME_PX,
    padTop: 270,
    padLeft: 28,
    padRight: 28,
    padTopSpeed: 38,
    turnApproachPadBoost: 20,
    turnApproachMeters: 200,
    transitionMs: 920,
  },
  sport: {
    minPitch: 48,
    maxPitch: 64,
    basePadBottom: NAV_MAP_BOTTOM_CHROME_PX,
    padTop: 242,
    padLeft: 24,
    padRight: 24,
    padTopSpeed: 30,
    turnApproachPadBoost: 22,
    turnApproachMeters: 200,
    transitionMs: 420,
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Same grid as {@link useCameraController} maneuver distance — keeps follow zoom/pitch from
 * thrashing on every 1 m change from the native progress stream.
 */
export function maneuverDistanceBucketMeters(meters: number): number {
  if (!Number.isFinite(meters) || meters <= 0) return 400;
  const m = Math.min(2000, meters);
  if (m < 48) return Math.round(m / 8) * 8;
  if (m < 120) return Math.round(m / 14) * 14;
  if (m < 220) return Math.round(m / 24) * 24;
  if (m < 700) return Math.round(m / 60) * 60;
  return Math.round(m / 120) * 120;
}

/** ~5 mph bands in m/s — matches {@link useCameraController} `speedMphBucket`. */
export function bucketSpeedMpsTo5Mph(speedMps: number): number {
  const mph = Math.max(0, speedMps * 2.236936);
  const b = Math.round(mph / 5) * 5;
  return b * 0.44704;
}

/**
 * Follow-camera: speed-based zoom/pitch curves, turn anticipation, Sport accel / tuck.
 */
export function getCameraPreset({
  mode,
  speedMps,
  nextManeuverDistanceMeters,
  safeAreaTop,
  safeAreaBottom,
  accelerationMps2 = 0,
}: Args): CameraPreset {
  const cfg = MODE_CONFIG[mode];
  const mph = mphFromMps(speedMps);
  const longRoad01 = inverseLerp01(nextManeuverDistanceMeters, LONG_ROAD_METERS, OPEN_ROAD_METERS);
  const turnNear01 = 1 - inverseLerp01(nextManeuverDistanceMeters, 45, 200);

  let zoom = baseZoomForMode(mode, mph);
  const { dPitch, dZoom, holdCalmZoom } = turnAnticipationOffsets(
    mode,
    nextManeuverDistanceMeters,
    longRoad01,
  );
  zoom += dZoom;
  if (holdCalmZoom) {
    zoom = Math.min(zoom + 0.12, 18.9);
  }
  const sportBoost =
    mode === 'sport' ? sportAccelerationOffsets(mph, accelerationMps2) : { dPitch: 0, dZoom: 0 };
  if (mode === 'sport') {
    zoom -= sportHighwayZoomPull(mph);
    zoom += sportBoost.dZoom;
  }

  zoom = clamp(zoom, mode === 'sport' ? 13.9 : 14.0, 19.0);

  let pitch = basePitchForMode(mode, mph) + dPitch;
  if (mode === 'sport') {
    pitch += sportBoost.dPitch;
  }
  const openRoadPitchBoost =
    mode === 'calm' ? 2.4 * longRoad01 : mode === 'adaptive' ? 3.0 * longRoad01 : 2.4 * longRoad01;
  pitch += openRoadPitchBoost;

  pitch = clamp(pitch, cfg.minPitch, cfg.maxPitch);

  const overHighway = Math.max(0, mph - cfg.padTopSpeed);
  const speedTopBoost = Math.min(36, overHighway * 0.48);
  let paddingTop =
    cfg.padTop +
    safeAreaTop +
    NAV_TURN_CARD_RESERVE_PX +
    speedTopBoost +
    longRoad01 * (mode === 'calm' ? 42 : mode === 'adaptive' ? 58 : 72);
  let paddingBottom = cfg.basePadBottom + safeAreaBottom;
  if (nextManeuverDistanceMeters < cfg.turnApproachMeters) {
    paddingTop += cfg.turnApproachPadBoost * (0.5 + 0.5 * turnNear01);
    paddingBottom += (mode === 'calm' ? 24 : mode === 'adaptive' ? 30 : 36) * clamp(turnNear01, 0, 1);
  }
  if (mode === 'sport') {
    paddingTop += sportHighwayTopPad(mph);
  }
  paddingBottom -= (mode === 'calm' ? 20 : mode === 'adaptive' ? 28 : 38) * longRoad01;
  paddingBottom = Math.max(cfg.basePadBottom + safeAreaBottom - (mode === 'sport' ? 38 : 30), paddingBottom);

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
 * Live navigation: same geometry as {@link getCameraPreset}; eases {@link getCameraConfig} into duration only.
 */
export function getLiveNavigationCameraPreset(args: Args): CameraPreset {
  const base = getCameraPreset(args);
  const enh = getCameraConfig(args.mode, args.speedMps);
  const minAnim = args.mode === 'sport' ? 180 : args.mode === 'adaptive' ? 260 : 420;
  const maxAnim = args.mode === 'calm' ? 1100 : args.mode === 'adaptive' ? 760 : 480;
  const animationDuration = Math.round(
    clamp(base.animationDuration * 0.55 + enh.animationDuration * 0.45, minAnim, maxAnim),
  );
  return {
    zoom: base.zoom,
    pitch: base.pitch,
    padding: base.padding,
    animationDuration,
  };
}

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
    accelerationMps2: 0,
  }).padding;
}
