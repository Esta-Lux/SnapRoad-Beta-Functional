import { api } from '../../api/client';
import type { OrionCompanionEventType, OrionDriveContext, OrionMood } from './types';
import type { OrionPreferences } from '../../types/orionPreferences';

export type LlmDialogueProvider = {
  generate?(
    event: OrionCompanionEventType,
    ctx: OrionDriveContext,
    mood: OrionMood,
  ): Promise<string | null>;
};

export const nullLlmDialogueProvider: LlmDialogueProvider = {};

export function createApiLlmDialogueProvider(
  getPrefs: () => OrionPreferences,
): LlmDialogueProvider {
  return {
    async generate(event, ctx, mood) {
      const prefs = getPrefs();
      if (!prefs.use_llm_buddy || !prefs.auto_buddy) return null;
      try {
        const res = await api.post<{ line?: string | null; success?: boolean }>('/api/orion/buddy-line', {
          event_type: event,
          mood: prefs.mood === 'auto' ? mood : prefs.mood,
          max_words: prefs.chattiness === 'minimal' ? 12 : prefs.chattiness === 'chatty' ? 18 : 15,
          context: {
            ...ctx,
            drivingMode: ctx.drivingMode,
            orionPreferences: prefs,
          },
        });
        const payload = res.data as { line?: string | null } | undefined;
        const line = payload?.line;
        return typeof line === 'string' && line.trim() ? line.trim() : null;
      } catch {
        return null;
      }
    },
  };
}
