import { DIALOGUE_VARIANTS } from './dialogueVariants';
import {
  EVENT_CATEGORY,
  EVENT_DEFAULT_PRIORITY,
} from './constants';
import type { OrionMemoryEngine } from './OrionMemoryEngine';
import { getPersonalityKnobs } from './OrionPersonalityEngine';
import type { OrionTripSession } from './OrionTripSession';
import type { LlmDialogueProvider } from './llmDialogueProvider';
import { fillDialogueTemplate, firstName, normalizeMessageKey, truncateToMaxWords } from './templateFill';
import type {
  DialogueVariant,
  OrionCompanionEventType,
  OrionCompanionResult,
  OrionDriveContext,
  OrionMood,
  OrionStressLevel,
  OrionTripPhase,
} from './types';

const STRESS_RANK: Record<OrionStressLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function recentMessageKeys(memory: OrionMemoryEngine, limit = 12): Set<string> {
  const keys = new Set<string>();
  const entries = memory.getEntries();
  for (let i = entries.length - 1; i >= 0 && keys.size < limit; i -= 1) {
    keys.add(normalizeMessageKey(entries[i].message));
  }
  return keys;
}

function stressAllowsVariant(stress: OrionStressLevel, variant: DialogueVariant): boolean {
  if (!variant.maxStress) return true;
  return STRESS_RANK[stress] <= STRESS_RANK[variant.maxStress];
}

function phaseAllowsVariant(phase: OrionTripPhase, variant: DialogueVariant): boolean {
  if (!variant.phases?.length) return true;
  return variant.phases.includes(phase);
}

function sessionAllowsVariant(session: OrionTripSession | undefined, variant: DialogueVariant): boolean {
  if (!variant.requiresOpenedWithLine) return true;
  return Boolean(session?.flags.openedWithLine);
}

function pickVariant(
  event: OrionCompanionEventType,
  ctx: OrionDriveContext,
  mood: OrionMood,
  memory: OrionMemoryEngine,
  phase: OrionTripPhase,
  stress: OrionStressLevel,
  session: OrionTripSession | undefined,
  seed: string,
): DialogueVariant | null {
  const pool = DIALOGUE_VARIANTS[event] ?? [];
  if (pool.length === 0) return null;

  const recent = recentMessageKeys(memory);
  const moodFiltered = pool.filter((v) => !v.moods?.length || v.moods.includes(mood));
  const arcFiltered = moodFiltered.filter(
    (v) =>
      phaseAllowsVariant(phase, v) &&
      stressAllowsVariant(stress, v) &&
      sessionAllowsVariant(session, v),
  );
  const base = arcFiltered.length > 0 ? arcFiltered : moodFiltered;

  const candidates = base.filter((v) => {
    const filled = fillDialogueTemplate(v.template, ctx);
    return !recent.has(normalizeMessageKey(filled));
  });

  let list = candidates.length > 0 ? candidates : base;

  if (event === 'drive_started' && firstName(ctx.userName)) {
    const named = list.filter((v) => v.template.includes('{{userName}}'));
    if (named.length > 0) list = named;
  }

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return list[hash % list.length] ?? list[0] ?? null;
}

export type GenerateMessageArgs = {
  event: OrionCompanionEventType;
  ctx: OrionDriveContext;
  mood: OrionMood;
  memory: OrionMemoryEngine;
  phase: OrionTripPhase;
  stress: OrionStressLevel;
  session?: OrionTripSession;
  llm?: LlmDialogueProvider;
};

export function generateCompanionMessageSync(args: GenerateMessageArgs): {
  message: string | null;
  category: string;
  priority: OrionCompanionResult['priority'];
} {
  const { event, ctx, mood, memory, phase, stress, session } = args;
  const category = EVENT_CATEGORY[event] ?? 'trip';
  const priority = EVENT_DEFAULT_PRIORITY[event] ?? 'normal';

  const seed = `${ctx.tripId ?? 'trip'}:${event}:${phase}:${ctx.nowMs}:${mood}`;
  const variant = pickVariant(event, ctx, mood, memory, phase, stress, session, seed);
  if (!variant) {
    return { message: null, category, priority };
  }

  const filled = fillDialogueTemplate(variant.template, ctx);
  const knobs = getPersonalityKnobs(mood);
  return {
    message: truncateToMaxWords(filled, knobs.maxWords),
    category,
    priority,
  };
}

export async function generateCompanionMessage(args: GenerateMessageArgs): Promise<{
  message: string | null;
  category: string;
  priority: OrionCompanionResult['priority'];
}> {
  const { llm } = args;
  if (llm?.generate) {
    try {
      const llmLine = await llm.generate(args.event, args.ctx);
      if (llmLine?.trim()) {
        const knobs = getPersonalityKnobs(args.mood);
        return {
          message: truncateToMaxWords(llmLine.trim(), knobs.maxWords),
          category: EVENT_CATEGORY[args.event] ?? 'trip',
          priority: EVENT_DEFAULT_PRIORITY[args.event] ?? 'normal',
        };
      }
    } catch {
      /* fall through */
    }
  }

  return generateCompanionMessageSync(args);
}
