export type OrionHandsFreeInteractionMode = 'explore' | 'navigation';

type HandsFreeBaseInput = {
  interactionMode: OrionHandsFreeInteractionMode;
  sessionActive: boolean;
  visible: boolean;
};

export function shouldKeepHandsFreeConversationOpen(input: HandsFreeBaseInput): boolean {
  return input.interactionMode === 'navigation' && input.sessionActive && input.visible;
}

export function shouldRestartHandsFreeListening(
  input: HandsFreeBaseInput & {
    isThinking: boolean;
    isSpeaking: boolean;
    errorMessage?: string | null;
  },
): boolean {
  if (!shouldKeepHandsFreeConversationOpen(input)) return false;
  if (input.isThinking || input.isSpeaking) return false;
  if (!input.errorMessage) return true;
  return /no.?match|no.?speech/i.test(input.errorMessage);
}
