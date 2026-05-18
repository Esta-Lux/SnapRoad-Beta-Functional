import { shouldSpeakNow } from './OrionCadenceEngine';
import { buildOrionDriveContext, deriveOrionStressLevel } from './OrionContextEngine';
import { generateCompanionMessage, generateCompanionMessageSync } from './OrionDialogueGenerator';
import type { OrionMemoryEngine } from './OrionMemoryEngine';
import { selectMood } from './OrionPersonalityEngine';
import type { LlmDialogueProvider } from './llmDialogueProvider';
import type {
  NavVoiceState,
  OrionCompanionEventType,
  OrionCompanionResult,
  OrionDriveContextInput,
} from './types';

export type EvaluateOptions = {
  memory: OrionMemoryEngine;
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

export async function evaluateOrionCompanion(
  event: OrionCompanionEventType,
  rawContext: OrionDriveContextInput,
  options: EvaluateOptions,
): Promise<OrionCompanionResult> {
  const ctx = buildOrionDriveContext(rawContext);
  const stress = deriveOrionStressLevel(ctx);
  const mood = selectMood(ctx, event, stress);
  const navVoice: NavVoiceState = { ...DEFAULT_NAV_VOICE, ...options.navVoice };

  const { message, category, priority } = await generateCompanionMessage({
    event,
    ctx,
    mood,
    memory: options.memory,
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

  return {
    shouldSpeak: true,
    message,
    category,
    mood,
    priority,
    eventType: event,
  };
}

/** Synchronous evaluate for insights preview (templates only). */
export function evaluateOrionCompanionSync(
  event: OrionCompanionEventType,
  rawContext: OrionDriveContextInput,
  options: EvaluateOptions,
): OrionCompanionResult {
  const ctx = buildOrionDriveContext(rawContext);
  const stress = deriveOrionStressLevel(ctx);
  const mood = selectMood(ctx, event, stress);
  const navVoice: NavVoiceState = { ...DEFAULT_NAV_VOICE, ...options.navVoice };

  const { message, category, priority } = generateCompanionMessageSync({
    event,
    ctx,
    mood,
    memory: options.memory,
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
    speakRoll: options.speakRoll ?? 0,
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

  return {
    shouldSpeak: true,
    message,
    category,
    mood,
    priority,
    eventType: event,
  };
}
