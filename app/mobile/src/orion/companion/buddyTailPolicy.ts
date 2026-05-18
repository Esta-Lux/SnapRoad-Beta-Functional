import { BUDDY_TAIL_SUPPRESS_AFTER_COMPANION_MS } from './constants';
import { getOrionCompanionMemory } from './orionCompanionShared';
import { getOrionTripSession } from './orionCompanionShared';
import { orionCompanionV1Enabled } from './orionCompanionFlags';
import type { GuidanceBucket } from '../../navigation/orionGuidanceStyle';

export function shouldSkipOrionBuddyTail(bucket: GuidanceBucket): boolean {
  if (!orionCompanionV1Enabled()) return false;
  if (bucket === 'imminent') return true;

  const session = getOrionTripSession();
  if (session.phase === 'stressed' || session.phase === 'closing') return true;

  const memory = getOrionCompanionMemory();
  const lastAt = memory.lastSpokenAtMs();
  if (lastAt > 0 && Date.now() - lastAt < BUDDY_TAIL_SUPPRESS_AFTER_COMPANION_MS) {
    return true;
  }

  const entries = memory.getEntries();
  const recent = entries[entries.length - 1];
  if (recent && Date.now() - recent.timestampMs < BUDDY_TAIL_SUPPRESS_AFTER_COMPANION_MS) {
    if (recent.category === 'traffic_humor' || recent.category === 'trip') return true;
  }

  return false;
}
