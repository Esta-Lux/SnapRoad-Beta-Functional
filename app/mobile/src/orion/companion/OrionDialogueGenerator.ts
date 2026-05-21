import { DIALOGUE_VARIANTS } from './dialogueVariants';
import {
  EVENT_CATEGORY,
  EVENT_DEFAULT_PRIORITY,
} from './constants';
import type { OrionMemoryEngine } from './OrionMemoryEngine';
import { getPersonalityKnobs } from './OrionPersonalityEngine';
import type { OrionTripSession } from './OrionTripSession';
import type { LlmDialogueProvider } from './llmDialogueProvider';
import { fillDialogueTemplate, firstName, truncateToMaxWords } from './templateFill';
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

function hashToUnit(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.codePointAt(i) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
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

function variantWeight(
  variant: DialogueVariant,
  event: OrionCompanionEventType,
  ctx: OrionDriveContext,
  mood: OrionMood,
  memory: OrionMemoryEngine,
): number {
  let weight = variant.weight ?? 1;
  const variantMoodMatch = variant.moods?.includes(mood);
  if (variantMoodMatch) weight *= 1.35;
  if (event === 'smooth_drive' && ctx.trafficLevel === 'light' && (mood === 'witty' || mood === 'sassy')) {
    weight *= 1.25;
  }
  if (event === 'drive_started' && firstName(ctx.userName) && variant.template.includes('{{userName}}')) {
    weight *= 1.2;
  }
  if (memory.recentlyUsedPattern(event, mood, variant.patternKey)) {
    weight *= 0.25;
  }
  const lastUsed = memory.lastUsedVariantAt(variant.id);
  if (lastUsed > 0) {
    const hours = Math.max(0, (ctx.nowMs - lastUsed) / 3_600_000);
    weight *= Math.min(1, 0.35 + hours * 0.08);
  }
  return Math.max(0.01, weight);
}

function weightedPick(
  variants: DialogueVariant[],
  event: OrionCompanionEventType,
  ctx: OrionDriveContext,
  mood: OrionMood,
  memory: OrionMemoryEngine,
  seed: string,
): DialogueVariant | null {
  if (variants.length === 0) return null;
  const weighted = variants.map((variant) => ({
    variant,
    weight: variantWeight(variant, event, ctx, mood, memory),
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let target = hashToUnit(seed) * total;
  for (const item of weighted) {
    target -= item.weight;
    if (target <= 0) return item.variant;
  }
  return weighted.at(-1)?.variant ?? null;
}

function leastRecentlyUsed(variants: DialogueVariant[], memory: OrionMemoryEngine): DialogueVariant[] {
  return [...variants].sort(
    (a, b) => memory.lastUsedVariantAt(a.id) - memory.lastUsedVariantAt(b.id),
  );
}

type PickVariantArgs = GenerateMessageArgs & {
  seed: string;
};

function eligibleVariants(
  pool: DialogueVariant[],
  stress: OrionStressLevel,
  session: OrionTripSession | undefined,
): DialogueVariant[] {
  return pool.filter((v) => stressAllowsVariant(stress, v) && sessionAllowsVariant(session, v));
}

function pickVariant(args: PickVariantArgs): DialogueVariant | null {
  const { event, ctx, mood, memory, phase, stress, session, seed } = args;
  const pool = DIALOGUE_VARIANTS[event] ?? [];
  if (pool.length === 0) return null;

  const eligible = pool.filter(
    (v) =>
      phaseAllowsVariant(phase, v) &&
      stressAllowsVariant(stress, v) &&
      sessionAllowsVariant(session, v),
  );
  const fallbackEligible = eligibleVariants(pool, stress, session);
  let arcBase = eligible;
  if (arcBase.length === 0) arcBase = fallbackEligible;
  if (arcBase.length === 0) arcBase = pool;
  const moodFiltered = arcBase.filter((v) => !v.moods?.length || v.moods.includes(mood));
  const base = moodFiltered.length > 0 ? moodFiltered : arcBase;

  const candidates = base.filter((v) => {
    const filled = fillDialogueTemplate(v.template, ctx);
    if (memory.hasVariantInTrip(v.id, ctx.tripId)) return false;
    if (memory.isDuplicateMessage(filled)) return false;
    if (memory.recentlyUsedPattern(event, mood, v.patternKey, 2)) return false;
    return true;
  });

  let list = candidates.length > 0 ? candidates : leastRecentlyUsed(base, memory);

  if (event === 'drive_started' && firstName(ctx.userName)) {
    const named = list.filter((v) => v.template.includes('{{userName}}'));
    if (named.length > 0) list = named;
  }

  return weightedPick(list, event, ctx, mood, memory, seed) ?? list[0] ?? null;
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
  variantId?: string | null;
  patternKey?: string | null;
  tripId?: string | null;
} {
  const { event, ctx, mood, memory, phase, stress, session } = args;
  const category = EVENT_CATEGORY[event] ?? 'trip';
  const priority = EVENT_DEFAULT_PRIORITY[event] ?? 'normal';

  const seed = `${ctx.tripId ?? 'trip'}:${event}:${phase}:${ctx.nowMs}:${mood}`;
  const variant = pickVariant({ event, ctx, mood, memory, phase, stress, session, seed });
  if (!variant) {
    return { message: null, category, priority };
  }

  const filled = fillDialogueTemplate(variant.template, ctx);
  const knobs = getPersonalityKnobs(mood);
  return {
    message: truncateToMaxWords(filled, knobs.maxWords),
    category,
    priority,
    variantId: variant.id,
    patternKey: variant.patternKey ?? null,
    tripId: ctx.tripId,
  };
}

export async function generateCompanionMessage(args: GenerateMessageArgs): Promise<{
  message: string | null;
  category: string;
  priority: OrionCompanionResult['priority'];
  variantId?: string | null;
  patternKey?: string | null;
  tripId?: string | null;
}> {
  const { llm } = args;
  if (llm?.generate) {
    try {
      const llmLine = await llm.generate(args.event, args.ctx, args.mood);
      if (llmLine?.trim()) {
        const knobs = getPersonalityKnobs(args.mood);
        return {
          message: truncateToMaxWords(llmLine.trim(), knobs.maxWords),
          category: EVENT_CATEGORY[args.event] ?? 'trip',
          priority: EVENT_DEFAULT_PRIORITY[args.event] ?? 'normal',
          variantId: null,
          patternKey: null,
          tripId: args.ctx.tripId,
        };
      }
    } catch {
      /* fall through */
    }
  }

  return generateCompanionMessageSync(args);
}
