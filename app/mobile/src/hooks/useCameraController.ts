import { useRef, useMemo } from 'react';
import type { DrivingMode } from '../types';
import { DRIVING_MODES } from '../constants/modes';

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
    { speed: 0, zoom: 17.0 },
    { speed: 15, zoom: 16.5 },
    { speed: 30, zoom: 16.0 },
    { speed: 50, zoom: 15.5 },
    { speed: 70, zoom: 15.0 },
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
    { speed: 60, zoom: 16.3 },
    { speed: 80, zoom: 15.5 },
    { speed: 100, zoom: 15.0 },
  ],
};

const ANIM_DURATIONS: Record<DrivingMode, { highway: number; city: number; slow: number }> = {
  calm: { highway: 500, city: 700, slow: 900 },
  adaptive: { highway: 300, city: 500, slow: 800 },
  sport: { highway: 200, city: 350, slow: 500 },
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

/** Cinematic follow camera: pitch/padding from `DRIVING_MODES`, speed–zoom curves per mode. */
export function useCameraController({
  speed,
  drivingMode,
  isNavigating,
  cameraLocked,
  heading,
  nextStepDistance,
}: CameraParams): CameraSettings | null {
  const prevZoom = useRef(17);
  const prevPitch = useRef(55);
  const prevHeading = useRef<number | null>(null);

  return useMemo(() => {
    if (!isNavigating || !cameraLocked) return null;

    const cfg = DRIVING_MODES[drivingMode];
    const curve = SPEED_ZOOM_CURVES[drivingMode] ?? SPEED_ZOOM_CURVES.adaptive;
    const durations = ANIM_DURATIONS[drivingMode] ?? ANIM_DURATIONS.adaptive;
    const speedMph = Math.max(0, speed);

    const approachingTurn = nextStepDistance != null && nextStepDistance < 300;
    const turnZoomBoost = approachingTurn ? 0.25 : 0;
    const rawZoom = interpolateZoom(speedMph, curve) + turnZoomBoost;
    const smoothedZoom = lerp(prevZoom.current, rawZoom, 0.3);
    prevZoom.current = smoothedZoom;

    const basePitch = cfg.navPitch;
    const speedFactor = Math.min(speedMph / 80, 1);
    const rawPitch = basePitch - speedFactor * 15;
    const clampedPitch = Math.max(basePitch - 20, Math.min(basePitch, rawPitch));
    const smoothedPitch = lerp(prevPitch.current, clampedPitch, 0.25);
    prevPitch.current = smoothedPitch;

    const turnBoost = approachingTurn ? 40 : 0;
    const paddingBottom = cfg.cameraPaddingBottom + turnBoost;
    const paddingTop = Math.min(speedMph * 0.8, 60);

    let animDuration: number;
    if (speedMph > 50) animDuration = durations.highway;
    else if (speedMph > 20) animDuration = durations.city;
    else animDuration = durations.slow;

    if (typeof heading === 'number' && Number.isFinite(heading)) {
      const prev = prevHeading.current;
      prevHeading.current = heading;
      if (typeof prev === 'number') {
        let delta = Math.abs(heading - prev);
        if (delta > 180) delta = 360 - delta;
        if (delta > 18 && speedMph < 20) {
          animDuration = Math.max(160, Math.round(animDuration * 0.7));
        }
      }
    }

    return {
      followZoomLevel: Math.round(smoothedZoom * 10) / 10,
      followPitch: Math.round(smoothedPitch),
      followPadding: {
        paddingBottom: Math.round(paddingBottom),
        paddingTop: Math.round(paddingTop),
        paddingLeft: 0,
        paddingRight: 0,
      },
      animationDuration: animDuration,
    };
  }, [speed, drivingMode, isNavigating, cameraLocked, heading, nextStepDistance]);
}
