/**
 * Single source of truth for driving-mode navigation feel: camera, JS puck progress,
 * voice cue distances, and turn-card windows. Native Mapbox Navigation SDK uses its own
 * matched location / puck; only the JS path in `navigationProgressCore` consumes
 * {@link getProgressTuning} (via {@link buildNavModeProfile} / {@link getProgressTuning}).
 */

import type { DrivingMode } from '../types';
import type { OffRouteTuning } from './offRouteTuning';
import { offRouteTuningForMode } from './offRouteTuning';

// ── Shared types ─────────────────────────────────────────────────────────────

/** Map / follow UI (includes browse). */
export type NavMode = 'browse' | 'calm' | 'adaptive' | 'sport';

export type CameraConfig = {
  zoom: number;
  pitch: number;
  animationDuration: number;
  headingSmoothing: number;
  lookAheadMeters: number;
};

/** JS snap + display EMA (see `navigationProgressCore`). */
export type ProgressTuning = {
  leadScale: number;
  leadCapMeters: number;
  snapLookaheadSegments: number;
  alphaOffset: number;
};

/** Turn-by-turn speech bucket thresholds + TTS rate for {@link speakGuidance}. */
export type VoiceNavTuning = {
  preparatoryMaxM: number;
  advanceMaxM: number;
  advanceMinM: number;
  imminentM: number;
  guidanceRateMultiplier: number;
};

/** Turn card state machine distances (preview / active / confirm). */
export type TurnCardNavTuning = {
  activeManeuverMeters: number;
  previewBaseMaxM: number;
  previewBonusPerMph: number;
  previewDistanceCapM: number;
  confirmActiveMultiplier: number;
};

export type NavModeProfile = {
  progress: ProgressTuning;
  voice: VoiceNavTuning;
  turnCard: TurnCardNavTuning;
  offRoute: OffRouteTuning;
};

export const DEFAULT_PROGRESS_TUNING: ProgressTuning = {
  leadScale: 1,
  leadCapMeters: 28,
  snapLookaheadSegments: 52,
  alphaOffset: 0,
};

// ── Progress (JS puck) ──────────────────────────────────────────────────────

export function getProgressTuning(mode: DrivingMode): ProgressTuning {
  switch (mode) {
    case 'calm':
      return {
        leadScale: 0.92,
        leadCapMeters: 22,
        snapLookaheadSegments: 52,
        alphaOffset: -0.02,
      };
    case 'sport':
      return {
        leadScale: 1.2,
        leadCapMeters: 42,
        snapLookaheadSegments: 58,
        alphaOffset: 0.06,
      };
    case 'adaptive':
    default:
      return DEFAULT_PROGRESS_TUNING;
  }
}

/** @deprecated Prefer {@link getProgressTuning} — alias for existing imports. */
export const progressTuningForMode = getProgressTuning;

// ── Camera (follow / browse) ────────────────────────────────────────────────

export function getCameraConfig(mode: NavMode, speedMps: number): CameraConfig {
  switch (mode) {
    case 'calm':
      return {
        zoom: speedMps > 18 ? 14.4 : 15.3,
        pitch: 35,
        animationDuration: 700,
        headingSmoothing: 0.12,
        lookAheadMeters: 80,
      };
    case 'sport':
      return {
        zoom: speedMps > 18 ? 13.8 : 14.8,
        pitch: 58,
        animationDuration: 380,
        headingSmoothing: 0.22,
        lookAheadMeters: 135,
      };
    case 'adaptive':
      return {
        zoom: speedMps > 22 ? 14.0 : speedMps > 10 ? 14.8 : 15.8,
        pitch: speedMps > 18 ? 52 : 42,
        animationDuration: 480,
        headingSmoothing: 0.18,
        lookAheadMeters: speedMps > 18 ? 120 : 90,
      };
    case 'browse':
    default:
      return {
        zoom: 15.5,
        pitch: 20,
        animationDuration: 650,
        headingSmoothing: 0.1,
        lookAheadMeters: 40,
      };
  }
}

// ── Voice (JS turn-by-turn buckets) ───────────────────────────────────────────

export function getVoiceNavTuning(mode: DrivingMode): VoiceNavTuning {
  switch (mode) {
    case 'calm':
      return {
        preparatoryMaxM: 540,
        advanceMaxM: 280,
        advanceMinM: 105,
        imminentM: 88,
        guidanceRateMultiplier: 0.94,
      };
    case 'sport':
      return {
        preparatoryMaxM: 485,
        advanceMaxM: 260,
        advanceMinM: 78,
        imminentM: 78,
        guidanceRateMultiplier: 1.06,
      };
    case 'adaptive':
    default:
      return {
        preparatoryMaxM: 500,
        advanceMaxM: 260,
        advanceMinM: 100,
        imminentM: 82,
        guidanceRateMultiplier: 1,
      };
  }
}

// ── Turn card ─────────────────────────────────────────────────────────────────

export function getTurnCardNavTuning(mode: DrivingMode): TurnCardNavTuning {
  switch (mode) {
    case 'calm':
      return {
        activeManeuverMeters: 78,
        previewBaseMaxM: 200,
        previewBonusPerMph: 4.5,
        previewDistanceCapM: 520,
        confirmActiveMultiplier: 1.32,
      };
    case 'sport':
      return {
        activeManeuverMeters: 68,
        previewBaseMaxM: 190,
        previewBonusPerMph: 4.2,
        previewDistanceCapM: 360,
        confirmActiveMultiplier: 1.12,
      };
    case 'adaptive':
    default:
      return {
        activeManeuverMeters: 72,
        previewBaseMaxM: 200,
        previewBonusPerMph: 4.5,
        previewDistanceCapM: 460,
        confirmActiveMultiplier: 1.28,
      };
  }
}

export function previewDistanceMaxMeters(speedMph: number, mode: DrivingMode): number {
  const t = getTurnCardNavTuning(mode);
  const bonus = Math.max(0, speedMph - 28) * t.previewBonusPerMph;
  return Math.min(t.previewBaseMaxM + bonus, t.previewDistanceCapM);
}

// ── Combined profile (camera still needs speed — use {@link getCameraConfig} separately) ──

export function buildNavModeProfile(mode: DrivingMode): NavModeProfile {
  return {
    progress: getProgressTuning(mode),
    voice: getVoiceNavTuning(mode),
    turnCard: getTurnCardNavTuning(mode),
    offRoute: offRouteTuningForMode(mode),
  };
}
