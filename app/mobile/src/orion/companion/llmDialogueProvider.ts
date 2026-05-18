import type { OrionCompanionEventType, OrionDriveContext } from './types';

export type LlmDialogueProvider = {
  generate?(event: OrionCompanionEventType, ctx: OrionDriveContext): Promise<string | null>;
};

export const nullLlmDialogueProvider: LlmDialogueProvider = {};
