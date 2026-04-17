import type { DrivingMode } from '../types';
import { speak } from '../utils/voice';
import { navLogicSdkEnabled } from './navFeatureFlags';
import { getNavSdkState } from './navSdkStore';
import { shouldSuppressJsTurnGuidance } from './navVoiceGate';

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

/**
 * Long-press / repeat: wins over background audio.
 * Logic-SDK trips replay the last native `onVoiceInstruction` line (no ref API on the module).
 */
export function repeatLastTurnByTurn(drivingMode: DrivingMode, voiceMuted: boolean) {
  if (voiceMuted) return;
  if (navLogicSdkEnabled() && shouldSuppressJsTurnGuidance()) {
    const t = getNavSdkState().lastVoiceInstructionText?.trim();
    if (t) speak(t, 'high', drivingMode, { rateSource: 'navigation_fixed' });
    return;
  }
  if (!lastTurnByTurnPhrase) return;
  speak(lastTurnByTurnPhrase, 'high', drivingMode, { rateSource: 'navigation_fixed' });
}
