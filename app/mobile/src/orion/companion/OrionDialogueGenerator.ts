import { DIALOGUE_VARIANTS } from './dialogueVariants';
import {
  EVENT_CATEGORY,
  EVENT_DEFAULT_PRIORITY,
} from './constants';
import type { OrionMemoryEngine } from './OrionMemoryEngine';
import { getPersonalityKnobs } from './OrionPersonalityEngine';
import type { LlmDialogueProvider } from './llmDialogueProvider';
import { fillDialogueTemplate, normalizeMessageKey, truncateToMaxWords } from './templateFill';
import type {
  DialogueVariant,
  OrionCompanionEventType,
  OrionCompanionResult,
  OrionDriveContext,
  OrionMood,
} from './types';

function recentMessageKeys(memory: OrionMemoryEngine, limit = 12): Set<string> {
  const keys = new Set<string>();
  const entries = memory.getEntries();
  for (let i = entries.length - 1; i >= 0 && keys.size < limit; i -= 1) {
    keys.add(normalizeMessageKey(entries[i].message));
  }
  return keys;
}

function pickVariant(
  event: OrionCompanionEventType,
  ctx: OrionDriveContext,
  mood: OrionMood,
  memory: OrionMemoryEngine,
  seed: string,
): DialogueVariant | null {
  const pool = DIALOGUE_VARIANTS[event] ?? [];
  if (pool.length === 0) return null;

  const recent = recentMessageKeys(memory);
  const moodFiltered = pool.filter((v) => !v.moods?.length || v.moods.includes(mood));
  const candidates = (moodFiltered.length > 0 ? moodFiltered : pool).filter((v) => {
    const filled = fillDialogueTemplate(v.template, ctx);
    return !recent.has(normalizeMessageKey(filled));
  });

  const list = candidates.length > 0 ? candidates : moodFiltered.length > 0 ? moodFiltered : pool;

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return list[hash % list.length] ?? list[0] ?? null;
}

export function generateCompanionMessageSync(args: {
  event: OrionCompanionEventType;
  ctx: OrionDriveContext;
  mood: OrionMood;
  memory: OrionMemoryEngine;
}): { message: string | null; category: string; priority: OrionCompanionResult['priority'] } {
  const { event, ctx, mood, memory } = args;
  const category = EVENT_CATEGORY[event] ?? 'trip';
  const priority = EVENT_DEFAULT_PRIORITY[event] ?? 'normal';

  const seed = `${ctx.tripId ?? 'trip'}:${event}:${ctx.nowMs}:${mood}`;
  const variant = pickVariant(event, ctx, mood, memory, seed);
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

export async function generateCompanionMessage(args: {
  event: OrionCompanionEventType;
  ctx: OrionDriveContext;
  mood: OrionMood;
  memory: OrionMemoryEngine;
  llm?: LlmDialogueProvider;
}): Promise<{ message: string | null; category: string; priority: OrionCompanionResult['priority'] }> {
  const { event, ctx, mood, memory, llm } = args;
  const category = EVENT_CATEGORY[event] ?? 'trip';
  const priority = EVENT_DEFAULT_PRIORITY[event] ?? 'normal';

  if (llm?.generate) {
    try {
      const llmLine = await llm.generate(event, ctx);
      if (llmLine?.trim()) {
        const knobs = getPersonalityKnobs(mood);
        return {
          message: truncateToMaxWords(llmLine.trim(), knobs.maxWords),
          category,
          priority,
        };
      }
    } catch {
      /* fall through to templates */
    }
  }

  return generateCompanionMessageSync({ event, ctx, mood, memory });
}
