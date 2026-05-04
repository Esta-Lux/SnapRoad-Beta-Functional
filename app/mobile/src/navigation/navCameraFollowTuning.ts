import type { DrivingMode } from '../types';

export type NavCameraFollowTuning = {
  minUpdateIntervalMs: number;
  minMoveMeters: number;
  minHeadingDeltaDeg: number;
  animationDurationMs: number;
};

export type NavCameraFollowCommandInput = {
  isNewSession: boolean;
  elapsedMs: number;
  movedMeters: number;
  headingDeltaDeg: number;
  zoomDelta: number;
  pitchDelta: number;
  stopped: boolean;
  tuning: NavCameraFollowTuning;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Cadence for the JS-owned navigation camera.
 *
 * The location puck can update every RAF frame, but Mapbox camera animations should
 * not be restarted every frame. These values keep center/bearing commands close
 * enough to the puck that the camera feels attached while still filtering stoplight
 * jitter and avoiding animation cancellation churn.
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

  if (speed < 1.05) {
    return {
      minUpdateIntervalMs: 920,
      minMoveMeters: 5.5,
      minHeadingDeltaDeg: 18,
      animationDurationMs: mode === 'sport' ? 280 : mode === 'adaptive' ? 340 : 400,
    };
  }

  const modeBase =
    mode === 'sport'
      ? { interval: 380, move: 11, heading: 10, anim: 240 }
      : mode === 'calm'
        ? { interval: 520, move: 13, heading: 12, anim: 300 }
        : { interval: 450, move: 12, heading: 11, anim: 270 };

  const speed01 = clamp(speed / 24, 0, 1);
  const minAnim = mode === 'sport' ? 200 : mode === 'adaptive' ? 210 : 230;
  return {
    minUpdateIntervalMs: Math.round(clamp(modeBase.interval - speed01 * 35 - nearTurn01 * 28, 260, 560)),
    minMoveMeters: Number(clamp(modeBase.move + speed01 * 0.4 - nearTurn01 * 1.5, 8, 14).toFixed(2)),
    minHeadingDeltaDeg: Number(clamp(modeBase.heading - nearTurn01 * 1.0, 9, 13).toFixed(1)),
    animationDurationMs: Math.round(clamp(modeBase.anim - speed01 * 35 - nearTurn01 * 20, minAnim, 340)),
  };
}

/**
 * Decides whether the JS-owned navigation camera should issue another `easeTo`.
 *
 * Mapbox cancels an in-flight camera animation when another animation for the same
 * camera setting starts. Treat the interval as a hard cadence for normal movement,
 * with only large route/camera discontinuities allowed through early.
 */
export function shouldIssueNavCameraFollowCommand({
  isNewSession,
  elapsedMs,
  movedMeters,
  headingDeltaDeg,
  zoomDelta,
  pitchDelta,
  stopped,
  tuning,
}: NavCameraFollowCommandInput): boolean {
  if (isNewSession) return true;
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return true;

  const moved = Number.isFinite(movedMeters) ? Math.max(0, movedMeters) : Infinity;
  const heading = Number.isFinite(headingDeltaDeg) ? Math.max(0, headingDeltaDeg) : Infinity;
  const zoom = Number.isFinite(zoomDelta) ? Math.max(0, zoomDelta) : Infinity;
  const pitch = Number.isFinite(pitchDelta) ? Math.max(0, pitchDelta) : Infinity;

  const urgentMoveM = Math.max(tuning.minMoveMeters * (stopped ? 2.4 : 2.2), stopped ? 12 : 22);
  const urgentHeadingDeg = Math.max(tuning.minHeadingDeltaDeg * 2.6, stopped ? 28 : 22);
  const urgentCameraFrame = zoom >= 0.18 || pitch >= 2.5;

  if (elapsedMs < tuning.minUpdateIntervalMs) {
    return moved >= urgentMoveM || heading >= urgentHeadingDeg || urgentCameraFrame;
  }

  return (
    moved >= tuning.minMoveMeters ||
    heading >= tuning.minHeadingDeltaDeg ||
    zoom >= 0.03 ||
    pitch >= 0.5
  );
}
