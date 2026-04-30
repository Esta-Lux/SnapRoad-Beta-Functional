import type { DrivingMode } from '../types';

export type NavCameraFollowTuning = {
  minUpdateIntervalMs: number;
  minMoveMeters: number;
  minHeadingDeltaDeg: number;
  animationDurationMs: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Cadence for the JS-owned navigation camera.
 *
 * The location puck can update every RAF frame, but Mapbox camera animations should
 * not be restarted every frame. These values keep the camera slightly behind the
 * puck on purpose: enough damping to feel like a glide, short enough to avoid lag.
 */
export function getNavCameraFollowTuning(
  mode: DrivingMode,
  speedMps: number,
  nextManeuverDistanceMeters: number,
): NavCameraFollowTuning {
  const speed = Number.isFinite(speedMps) ? Math.max(0, speedMps) : 0;
  const maneuver = Number.isFinite(nextManeuverDistanceMeters)
    ? Math.max(0, nextManeuverDistanceMeters)
    : 400;
  const nearTurn01 = 1 - clamp((maneuver - 40) / 180, 0, 1);

  if (speed < 0.75) {
    return {
      minUpdateIntervalMs: 520,
      minMoveMeters: 3.1,
      minHeadingDeltaDeg: 10,
      animationDurationMs: mode === 'sport' ? 260 : mode === 'adaptive' ? 320 : 380,
    };
  }

  const modeBase =
    mode === 'sport'
      ? { interval: 90, move: 0.45, heading: 1.8, anim: 170 }
      : mode === 'calm'
        ? { interval: 180, move: 0.9, heading: 3.8, anim: 340 }
        : { interval: 130, move: 0.65, heading: 2.6, anim: 250 };

  const speed01 = clamp(speed / 24, 0, 1);
  return {
    minUpdateIntervalMs: Math.round(clamp(modeBase.interval - speed01 * 28 - nearTurn01 * 22, 72, 230)),
    minMoveMeters: Number(clamp(modeBase.move + speed01 * 0.22 - nearTurn01 * 0.18, 0.34, 1.2).toFixed(2)),
    minHeadingDeltaDeg: Number(clamp(modeBase.heading - nearTurn01 * 0.8, 1.1, 4.4).toFixed(1)),
    animationDurationMs: Math.round(clamp(modeBase.anim - speed01 * 38 - nearTurn01 * 28, 135, 380)),
  };
}
