import { orionCompanionV1Enabled } from './orionCompanionFlags';
import type { GuidanceBucket } from '../../navigation/orionGuidanceStyle';

/**
 * When the proactive companion is on, turn cues stay clean (instruction only).
 * Companion owns between-turn personality; buddy tails would double-speak with Orion.
 */
export function shouldSkipOrionBuddyTail(_bucket: GuidanceBucket): boolean {
  if (orionCompanionV1Enabled()) return true;
  return false;
}
