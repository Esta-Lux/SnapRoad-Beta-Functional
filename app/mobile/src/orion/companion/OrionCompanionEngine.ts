import { shouldSpeakNow } from './OrionCadenceEngine';
import { buildOrionDriveContext, deriveOrionStressLevel } from './OrionContextEngine';
import { generateCompanionMessage, generateCompanionMessageSync } from './OrionDialogueGenerator';
import type { OrionMemoryEngine } from './OrionMemoryEngine';
import { selectMood } from './OrionPersonalityEngine';
import {
  deriveTripPhase,
  markDriveStarted,
  markSmoothDriveMentioned,
  updateSessionPhase,
} from './OrionTripArcEngine';
import type { OrionTripSession } from './OrionTripSession';
import type { LlmDialogueProvider } from './llmDialogueProvider';
import type {
  NavVoiceState,
  OrionCompanionEventType,
  OrionCompanionResult,
  OrionDriveContextInput,
} from './types';

export type EvaluateOptions = {
  memory: OrionMemoryEngine;
  session?: OrionTripSession;
  navVoice?: Partial<NavVoiceState>;
  llm?: LlmDialogueProvider;
  speakRoll?: number;
};

const DEFAULT_NAV_VOICE: NavVoiceState = {
  guidanceSuppressed: false,
  msSinceLastSdkVoice: Number.POSITIVE_INFINITY,
  advisorySdkHoldoffMs: 3000,
  imminentManeuver: false,
};

function applySessionAfterSpeak(
  session: OrionTripSession | undefined,
  event: OrionCompanionEventType,
  spoke: boolean,
): void {
  if (!session || !spoke) return;
  if (event === 'drive_started') markDriveStarted(session);
  if (event === 'smooth_drive') markSmoothDriveMentioned(session);
}

function resolvePhase(
  ctx: ReturnType<typeof buildOrionDriveContext>,
  stress: ReturnType<typeof deriveOrionStressLevel>,
  event: OrionCompanionEventType,
  session: OrionTripSession | undefined,
): void {
  if (!session) return;
  const next = deriveTripPhase(ctx, stress, event, session);
  updateSessionPhase(session, next, ctx.nowMs);
}

function evaluateInternal(
  event: OrionCompanionEventType,
  rawContext: OrionDriveContextInput,
  options: EvaluateOptions,
  sync: boolean,
): OrionCompanionResult {
  const ctx = buildOrionDriveContext(rawContext);
  const stress = deriveOrionStressLevel(ctx);
  const session = options.session;

  resolvePhase(ctx, stress, event, session);
  const phase = session?.phase ?? deriveTripPhase(ctx, stress, event, {
    tripId: ctx.tripId,
    startedAtMs: ctx.nowMs,
    phase: 'cruising',
    flags: {
      openedWithLine: false,
      mentionedSmoothDrive: false,
      mentionedHalfwayEta: false,
    },
    lastPhaseChangeMs: ctx.nowMs,
  });

  const mood = selectMood(ctx, event, stress, phase);
  const navVoice: NavVoiceState = { ...DEFAULT_NAV_VOICE, ...options.navVoice };

  const genArgs = {
    event,
    ctx,
    mood,
    memory: options.memory,
    phase,
    stress,
    session,
    llm: options.llm,
  };

  const { message, category, priority, variantId, patternKey, tripId } = sync
    ? generateCompanionMessageSync(genArgs)
    : { message: null, category: 'trip', priority: 'normal' as const, variantId: null, patternKey: null, tripId: ctx.tripId };

  const cadence = shouldSpeakNow({
    event,
    ctx,
    mood,
    priority,
    memory: options.memory,
    navVoice,
    category,
    candidateMessage: message,
    speakRoll: options.speakRoll,
  });

  if (!cadence.allowed || !message) {
    return {
      shouldSpeak: false,
      message: null,
      category,
      mood,
      priority,
      eventType: event,
    };
  }

  applySessionAfterSpeak(session, event, true);

  return {
    shouldSpeak: true,
    message,
    category,
    mood,
    priority,
    eventType: event,
    variantId,
    patternKey,
    tripId,
  };
}

export async function evaluateOrionCompanion(
  event: OrionCompanionEventType,
  rawContext: OrionDriveContextInput,
  options: EvaluateOptions,
): Promise<OrionCompanionResult> {
  const ctx = buildOrionDriveContext(rawContext);
  const stress = deriveOrionStressLevel(ctx);
  const session = options.session;

  resolvePhase(ctx, stress, event, session);
  const phase = session?.phase ?? 'cruising';

  const mood = selectMood(ctx, event, stress, phase);
  const navVoice: NavVoiceState = { ...DEFAULT_NAV_VOICE, ...options.navVoice };

  const { message, category, priority, variantId, patternKey, tripId } = await generateCompanionMessage({
    event,
    ctx,
    mood,
    memory: options.memory,
    phase,
    stress,
    session,
    llm: options.llm,
  });

  const cadence = shouldSpeakNow({
    event,
    ctx,
    mood,
    priority,
    memory: options.memory,
    navVoice,
    category,
    candidateMessage: message,
    speakRoll: options.speakRoll,
  });

  if (!cadence.allowed || !message) {
    return {
      shouldSpeak: false,
      message: null,
      category,
      mood,
      priority,
      eventType: event,
    };
  }

  applySessionAfterSpeak(session, event, true);

  return {
    shouldSpeak: true,
    message,
    category,
    mood,
    priority,
    eventType: event,
    variantId,
    patternKey,
    tripId,
  };
}

export function evaluateOrionCompanionSync(
  event: OrionCompanionEventType,
  rawContext: OrionDriveContextInput,
  options: EvaluateOptions,
): OrionCompanionResult {
  return evaluateInternal(event, rawContext, options, true);
}
