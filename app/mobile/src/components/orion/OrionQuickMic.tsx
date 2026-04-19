import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PermissionsAndroid, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { api } from '../../api/client';
import {
  configureAudioSessionForVoiceInput,
  restoreDefaultAudioSession,
  speakOrionReply,
  stopSpeaking,
} from '../../utils/voice';
import type { OrionContext, OrionPlaceSuggestion } from './OrionChat';

type VoiceType = {
  destroy: () => Promise<void>;
  removeAllListeners: () => void;
  onSpeechStart: ((ev?: unknown) => void) | null;
  onSpeechEnd: ((ev?: unknown) => void) | null;
  onSpeechResults: ((ev: { value?: string[] }) => void) | null;
  onSpeechPartialResults: ((ev: { value?: string[] }) => void) | null;
  onSpeechError: ((ev: { error?: { message?: string } }) => void) | null;
  start: (locale: string) => Promise<void>;
  stop: () => Promise<void>;
  cancel: () => Promise<void>;
  isAvailable?: () => Promise<boolean>;
};

function loadVoice(): VoiceType | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-voice/voice');
    return (mod.default ?? mod) as VoiceType;
  } catch {
    return null;
  }
}

const Voice = loadVoice();

type OrionAction = { type: string; name?: string; lat?: number; lng?: number; address?: string };

export type OrionQuickInteractionMode = 'explore' | 'navigation';

interface Props {
  visible: boolean;
  isPremium: boolean;
  /** Explore: tap opens full Orion chat; long-press starts voice. Navigation: tap is voice only (backend + TTS). */
  interactionMode?: OrionQuickInteractionMode;
  context?: OrionContext;
  onOpenChat: () => void;
  onSuggestions?: (items: OrionPlaceSuggestion[]) => void;
  onAction?: (action: OrionAction) => void;
  onReply?: (text: string) => void;
}

export default function OrionQuickMic({
  visible,
  isPremium,
  interactionMode = 'navigation',
  context,
  onOpenChat,
  onSuggestions,
  onAction,
  onReply,
}: Props) {
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const transcriptRef = useRef('');
  const orionSpeakingRef = useRef(false);

  const requestMicPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  const speakReply = useCallback((reply: string) => {
    const finish = () => {
      orionSpeakingRef.current = false;
      void restoreDefaultAudioSession();
    };
    try {
      void Voice?.cancel().catch(() => {});
      setIsListening(false);
      setPartialTranscript('');
      Speech.stop();
      stopSpeaking();
      orionSpeakingRef.current = true;
      speakOrionReply(reply, finish);
    } catch {
      finish();
    }
  }, []);

  const sendPrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;
      setIsThinking(true);
      try {
        const res = await api.post<{
          content?: string;
          text?: string;
          actions?: OrionAction[];
          suggestions?: OrionPlaceSuggestion[];
          data?: { actions?: OrionAction[]; suggestions?: OrionPlaceSuggestion[] };
        }>('/api/orion/completions', {
          messages: [{ role: 'user', content: trimmed }],
          context: {
            ...context,
            speedMph: context?.speedMph ?? context?.speed,
          },
        });
        if (!res.success) throw new Error(res.error || 'Orion request failed');
        const raw = (res.data ?? {}) as Record<string, unknown>;
        const inner = (raw.data ?? {}) as Record<string, unknown>;
        const reply =
          (typeof raw.content === 'string' ? raw.content : null)
          ?? (typeof raw.text === 'string' ? raw.text : null)
          ?? "I couldn't process that right now.";
        const actions = (raw.actions ?? inner.actions) as OrionAction[] | undefined;
        const suggestionsRaw = (raw.suggestions ?? inner.suggestions) as OrionPlaceSuggestion[] | undefined;
        const suggestions = Array.isArray(suggestionsRaw)
          ? suggestionsRaw
              .filter(
                (s) =>
                  s &&
                  typeof s.name === 'string' &&
                  typeof s.lat === 'number' &&
                  typeof s.lng === 'number' &&
                  Number.isFinite(s.lat) &&
                  Number.isFinite(s.lng),
              )
              .slice(0, 6)
          : [];
        onSuggestions?.(suggestions);
        onReply?.(reply);
        speakReply(reply);
        if (Array.isArray(actions) && actions.length && onAction) {
          const navFirst = actions.find((a) => a?.type === 'navigate');
          if (navFirst) onAction(navFirst);
          else actions.forEach((a) => onAction(a));
        }
      } catch {
        const fallback = "Sorry, I'm having trouble connecting. Try again in a moment.";
        onReply?.(fallback);
        speakReply(fallback);
      } finally {
        setIsThinking(false);
      }
    },
    [context, onAction, onReply, onSuggestions, speakReply],
  );

  const finalizeTranscript = useCallback(() => {
    const finalText = transcriptRef.current.trim() || partialTranscript.trim();
    transcriptRef.current = '';
    setPartialTranscript('');
    if (finalText) {
      void sendPrompt(finalText);
    }
  }, [partialTranscript, sendPrompt]);

  const stopListening = useCallback(async () => {
    if (!Voice) return;
    try {
      await Voice.stop();
    } catch {
      /* ignore */
    }
    setIsListening(false);
    finalizeTranscript();
  }, [finalizeTranscript]);

  const startListening = useCallback(async () => {
    if (!Voice || Platform.OS === 'web' || isThinking) return;
    const ok = await requestMicPermission();
    if (!ok) return;
    try {
      if (typeof Voice.isAvailable === 'function') {
        const avail = await Voice.isAvailable();
        if (!avail) return;
      }
    } catch {
      /* continue */
    }
    transcriptRef.current = '';
    setPartialTranscript('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopSpeaking();
    Speech.stop();
    await configureAudioSessionForVoiceInput();
    setIsListening(true);
    try {
      await Voice.start('en-US');
    } catch {
      setIsListening(false);
    }
  }, [isThinking, requestMicPermission]);

  useEffect(() => {
    if (!Voice || !visible) return;
    Voice.onSpeechStart = () => {
      transcriptRef.current = '';
      setPartialTranscript('');
    };
    Voice.onSpeechPartialResults = (e) => {
      if (orionSpeakingRef.current) return;
      const t = e?.value?.[0];
      if (t) {
        transcriptRef.current = t;
        setPartialTranscript(t);
      }
    };
    Voice.onSpeechResults = (e) => {
      if (orionSpeakingRef.current) return;
      const t = e?.value?.[0]?.trim();
      if (t) transcriptRef.current = t;
    };
    Voice.onSpeechEnd = () => {
      setIsListening(false);
      finalizeTranscript();
    };
    Voice.onSpeechError = () => {
      setIsListening(false);
      transcriptRef.current = '';
      setPartialTranscript('');
    };
    return () => {
      Voice.onSpeechStart = null;
      Voice.onSpeechPartialResults = null;
      Voice.onSpeechResults = null;
      Voice.onSpeechEnd = null;
      Voice.onSpeechError = null;
      void Voice.cancel().catch(() => {});
    };
  }, [finalizeTranscript, visible]);

  useEffect(() => {
    if (visible) return;
    transcriptRef.current = '';
    setPartialTranscript('');
    setIsListening(false);
    setIsThinking(false);
    void Voice?.cancel().catch(() => {});
  }, [visible]);

  const glowColor = useMemo(() => {
    if (isListening) return 'rgba(239,68,68,0.28)';
    if (isThinking) return 'rgba(99,102,241,0.24)';
    return 'transparent';
  }, [isListening, isThinking]);

  if (!visible) return null;

  const navMode = interactionMode === 'navigation';

  const handleFabPress = () => {
    if (!navMode) {
      if (isListening) {
        void stopListening();
        return;
      }
      onOpenChat();
      return;
    }
    if (!Voice) {
      onOpenChat();
      return;
    }
    if (isListening) {
      void stopListening();
    } else {
      void startListening();
    }
  };

  const handleLongPress = () => {
    if (navMode) return;
    if (!Voice) {
      onOpenChat();
      return;
    }
    if (isListening) {
      void stopListening();
    } else {
      void startListening();
    }
  };

  const fabIcon = !navMode
    ? isListening
      ? 'radio'
      : 'chatbubbles-outline'
    : isListening
      ? 'radio'
      : 'mic-outline';

  const fabA11y = navMode
    ? isListening
      ? 'Stop Orion voice'
      : 'Start Orion voice — speaks reply from assistant'
    : isListening
      ? 'Stop Orion voice'
      : 'Open Orion chat';

  return (
    <View style={styles.wrap}>
      {(isListening || isThinking) && (
        <View style={[styles.statePill, { backgroundColor: glowColor }]}>
          {isThinking ? <ActivityIndicator size="small" color="#EEF2FF" /> : <Ionicons name="mic" size={14} color="#FECACA" />}
          <Text style={styles.stateText}>
            {isListening ? `Listening${partialTranscript ? `: ${partialTranscript}` : '…'}` : 'Orion is thinking…'}
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.fabTap}
        onPress={handleFabPress}
        onLongPress={navMode ? undefined : handleLongPress}
        activeOpacity={0.82}
        accessibilityLabel={fabA11y}
        accessibilityHint={!navMode ? 'Long press for voice without opening chat' : undefined}
      >
        <LinearGradient colors={isPremium ? ['#7C3AED', '#5B21B6'] : ['#6366F1', '#4F46E5']} style={styles.grad}>
          <Ionicons name={fabIcon} size={22} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-end' },
  fabTap: { borderRadius: 24 },
  grad: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 12,
    elevation: 10,
  },
  statePill: {
    maxWidth: 280,
    marginBottom: 8,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(2,6,23,0.72)',
  },
  stateText: { color: '#E5E7EB', fontSize: 12, fontWeight: '600', flexShrink: 1 },
});

