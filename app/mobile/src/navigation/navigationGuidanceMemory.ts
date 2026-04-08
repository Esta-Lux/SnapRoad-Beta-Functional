import type { DrivingMode } from '../types';
import { speak } from '../utils/voice';

let lastTurnByTurnPhrase: string | null = null;

/** Skip non-critical distance buckets until this time (ms since epoch) — avoids stacking on start prompt. */
let guidanceSuppressedUntilMs = 0;

export function setNavigationGuidanceSuppressedUntil(ts: number) {
  guidanceSuppressedUntilMs = ts;
}

export function isNavigationGuidanceSuppressed(): boolean {
  return Date.now() < guidanceSuppressedUntilMs;
}

export function setLastTurnByTurnPhrase(phrase: string | null) {
  lastTurnByTurnPhrase = phrase?.trim() || null;
}

export function getLastTurnByTurnPhrase(): string | null {
  return lastTurnByTurnPhrase;
}

/** Long-press / repeat: wins over background audio. */
export function repeatLastTurnByTurn(drivingMode: DrivingMode, voiceMuted: boolean) {
  if (voiceMuted || !lastTurnByTurnPhrase) return;
  speak(lastTurnByTurnPhrase, 'high', drivingMode);
}
