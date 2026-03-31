import { useRef, useMemo } from 'react';
import type { DrivingMode } from '../types';

interface CameraParams {
  speed: number;
  drivingMode: DrivingMode;
  isNavigating: boolean;
  cameraLocked: boolean;
  heading?: number;
  nextStepDistance?: number;
}

interface CameraSettings {
  followZoomLevel: number;
  followPitch: number;
  followPadding: { paddingBottom: number; paddingTop: number; paddingLeft: number; paddingRight: number };
  animationDuration: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

interface SpeedZoomPoint { speed: number; zoom: number }

const SPEED_ZOOM_CURVES: Record<DrivingMode, SpeedZoomPoint[]> = {
  calm: [
    { speed: 0, zoom: 17.5 },
    { speed: 10, zoom: 17.0 },
    { speed: 25, zoom: 16.5 },
    { speed: 45, zoom: 16.0 },
    { speed: 65, zoom: 15.5 },
    { speed: 80, zoom: 15.0 },
  ],
  adaptive: [
    { speed: 0, zoom: 17.8 },
    { speed: 15, zoom: 17.2 },
    { speed: 35, zoom: 16.5 },
    { speed: 55, zoom: 15.8 },
    { speed: 75, zoom: 15.2 },
  ],
  sport: [
    { speed: 0, zoom: 18.0 },
    { speed: 20, zoom: 17.5 },
    { speed: 40, zoom: 17.0 },
    { speed: 60, zoom: 16.2 },
    { speed: 80, zoom: 15.5 },
    { speed: 100, zoom: 15.0 },
  ],
};

const MODE_CONFIG: Record<DrivingMode, {
  basePitch: number;
  minPitch: number;
  maxPitch: number;
  basePadBottom: number;
  padTopSpeed: number;
  turnApproachPadBoost: number;
  transitionMs: number;
}> = {
  calm: {
    basePitch: 50,
    minPitch: 40,
    maxPitch: 58,
    basePadBottom: 180,
    padTopSpeed: 60,
    turnApproachPadBoost: 40,
    transitionMs: 1000,
  },
  adaptive: {
    basePitch: 48,
    minPitch: 35,
    maxPitch: 55,
    basePadBottom: 160,
    padTopSpeed: 50,
    turnApproachPadBoost: 30,
    transitionMs: 700,
  },
  sport: {
    basePitch: 42,
    minPitch: 25,
    maxPitch: 50,
    basePadBottom: 140,
    padTopSpeed: 40,
    turnApproachPadBoost: 20,
    transitionMs: 350,
  },
};

function interpolateZoom(speed: number, curve: SpeedZoomPoint[]): number {
  if (speed <= curve[0].speed) return curve[0].zoom;
  for (let i = 0; i < curve.length - 1; i++) {
    const lo = curve[i];
    const hi = curve[i + 1];
    if (speed >= lo.speed && speed <= hi.speed) {
      const t = (speed - lo.speed) / (hi.speed - lo.speed);
      return lo.zoom + t * (hi.zoom - lo.zoom);
    }
  }
  return curve[curve.length - 1].zoom;
}

/**
 * Cinematic camera controller for navigation.
 *
 * - Per-mode speed-to-zoom curves with smooth interpolation
 * - Dynamic pitch that flattens at higher speeds for stability
 * - Approaching-turn padding boost to show more road ahead
 * - Mode-specific animation timing (calm=smooth, sport=snappy)
 * - Works across all 4 map styles (Standard, Satellite, Streets, Dark)
 */
export function useCameraController({
  speed,
  drivingMode,
  isNavigating,
  cameraLocked,
  heading,
  nextStepDistance,
}: CameraParams): CameraSettings | null {
  const prevZoom = useRef(17);
  const prevPitch = useRef(48);

  return useMemo(() => {
    if (!isNavigating || !cameraLocked) return null;

    const cfg = MODE_CONFIG[drivingMode] ?? MODE_CONFIG.adaptive;
    const curve = SPEED_ZOOM_CURVES[drivingMode] ?? SPEED_ZOOM_CURVES.adaptive;
    const speedMph = Math.max(0, speed);

    // --- Zoom: interpolate along the mode's speed curve ---
    const rawZoom = interpolateZoom(speedMph, curve);
    const smoothedZoom = lerp(prevZoom.current, rawZoom, 0.3);
    prevZoom.current = smoothedZoom;

    // --- Pitch: flattens at speed for visual stability ---
    const speedFactor = Math.min(speedMph / 70, 1);
    const rawPitch = cfg.basePitch - speedFactor * (cfg.basePitch - cfg.minPitch);
    const clampedPitch = Math.max(cfg.minPitch, Math.min(cfg.maxPitch, rawPitch));
    const smoothedPitch = lerp(prevPitch.current, clampedPitch, 0.25);
    prevPitch.current = smoothedPitch;

    // --- Padding: base + speed offset + turn-approach boost ---
    const speedPadTop = Math.min(speedMph * 0.8, cfg.padTopSpeed);
    const approachingTurn = nextStepDistance != null && nextStepDistance < 300;
    const turnBoost = approachingTurn ? cfg.turnApproachPadBoost : 0;

    const paddingBottom = cfg.basePadBottom + turnBoost;
    const paddingTop = speedPadTop;

    return {
      followZoomLevel: Math.round(smoothedZoom * 10) / 10,
      followPitch: Math.round(smoothedPitch),
      followPadding: {
        paddingBottom: Math.round(paddingBottom),
        paddingTop: Math.round(paddingTop),
        paddingLeft: 0,
        paddingRight: 0,
      },
      animationDuration: cfg.transitionMs,
    };
  }, [speed, drivingMode, isNavigating, cameraLocked, nextStepDistance]);
}
