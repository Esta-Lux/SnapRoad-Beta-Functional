import type { DrivingMode } from '../../types';
import { passesAdvisorySpeechGates } from './advisorySpeechGates';
import { buildOrionDriveContext } from './OrionContextEngine';
import type { OrionMemoryEngine } from './OrionMemoryEngine';
import { orionCompanionV1Enabled } from './orionCompanionFlags';
import type {
  NavVoiceState,
  OrionAdvisoryCategory,
  OrionCompanionPriority,
  OrionCompanionResult,
  OrionDriveContextInput,
  OrionHudLineMeta,
  OrionMood,
} from './types';

export type AdvisorySpeechInput = {
  message: string;
  category: OrionAdvisoryCategory;
  priority: OrionCompanionPriority;
  drivingMode: DrivingMode;
  voiceMuted?: boolean;
  navVoice: NavVoiceState;
  memory: OrionMemoryEngine;
  rawContext?: OrionDriveContextInput;
  mood?: OrionMood;
  recordMemory?: boolean;
  preApproved?: boolean;
  onUiLine?: (meta: OrionHudLineMeta) => void;
};

export type AdvisorySpeechResult = {
  spoken: boolean;
  reason?: string;
};

function priorityToSpeak(priority: OrionCompanionPriority): 'high' | 'normal' {
  return priority === 'urgent' ? 'high' : 'normal';
}

export function requestOrionAdvisorySpeech(input: AdvisorySpeechInput): AdvisorySpeechResult {
  const {
    message,
    category,
    priority,
    drivingMode,
    voiceMuted = false,
    navVoice,
    memory,
    rawContext = {},
    mood = 'calm',
    recordMemory = true,
    preApproved = false,
    onUiLine,
  } = input;

  if (!orionCompanionV1Enabled()) {
    if (voiceMuted || !message.trim()) {
      return { spoken: false, reason: 'voice_muted' };
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { speak } = require('../../utils/voice') as typeof import('../../utils/voice');
    speak(message, priorityToSpeak(priority), drivingMode, { rateSource: 'advisory' });
    onUiLine?.({ text: message, source: 'advisory' });
    return { spoken: true };
  }

  const ctx = buildOrionDriveContext({ ...rawContext, nowMs: rawContext.nowMs ?? Date.now() });
  const gate = passesAdvisorySpeechGates({
    ctx,
    message,
    category,
    priority,
    mood,
    memory,
    navVoice,
    voiceMuted,
    preApproved,
  });

  if (!gate.allowed) {
    return { spoken: false, reason: gate.reason };
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { speak } = require('../../utils/voice') as typeof import('../../utils/voice');
  speak(message, priorityToSpeak(priority), drivingMode, { rateSource: 'advisory' });

  if (recordMemory) {
    const pseudo: OrionCompanionResult = {
      shouldSpeak: true,
      message,
      category,
      mood,
      priority,
      eventType: 'drive_started',
    };
    memory.recordSpoken(pseudo, ctx.nowMs);
  }

  onUiLine?.({
    text: message,
    mood: category === 'trip' || category === 'traffic_humor' ? mood : undefined,
    source: 'advisory',
  });

  return { spoken: true };
}

export function deliverCompanionSpeech(input: {
  result: OrionCompanionResult;
  drivingMode: DrivingMode;
  voiceMuted?: boolean;
  navVoice: NavVoiceState;
  memory: OrionMemoryEngine;
  rawContext?: OrionDriveContextInput;
  onUiLine?: (meta: OrionHudLineMeta) => void;
}): AdvisorySpeechResult {
  const { result, drivingMode, voiceMuted, navVoice, memory, rawContext, onUiLine } = input;

  if (!result.shouldSpeak || !result.message?.trim()) {
    return { spoken: false, reason: 'not_approved' };
  }

  return requestOrionAdvisorySpeech({
    message: result.message,
    category: result.category as OrionAdvisoryCategory,
    priority: result.priority,
    drivingMode,
    voiceMuted,
    navVoice,
    memory,
    rawContext,
    mood: result.mood,
    recordMemory: true,
    preApproved: true,
    onUiLine: (meta) =>
      onUiLine?.({
        ...meta,
        source: 'companion',
        mood: result.mood,
      }),
  });
}
