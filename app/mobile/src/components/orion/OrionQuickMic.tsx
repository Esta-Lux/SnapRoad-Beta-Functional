import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, PermissionsAndroid, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { api } from '../../api/client';
import {
  configureAudioSessionForVoiceInput,
  restoreDefaultAudioSession,
  speakOrionReply,
} from '../../utils/voice';
import type { OrionContext, OrionPlaceSuggestion } from './OrionChat';
import type { DrivingMode } from '../../types';

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

function normalizeDrivingMode(mode?: string): DrivingMode {
  return mode === 'calm' || mode === 'sport' || mode === 'adaptive' ? mode : 'adaptive';
}

export type OrionQuickInteractionMode = 'explore' | 'navigation';

interface Props {
  visible: boolean;
  isPremium: boolean;
  /** Explore: tap opens full Orion chat; long-press starts voice. Navigation: tap is voice only (backend + TTS). */
  interactionMode?: OrionQuickInteractionMode;
  /** When true, FAB matches map HUD stack (44px circle, centered in column). */
  compactHudFab?: boolean;
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
  compactHudFab = false,
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
  const speechFinalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      orionSpeakingRef.current = true;
      speakOrionReply(reply, finish, normalizeDrivingMode(context?.drivingMode));
    } catch {
      finish();
    }
  }, [context?.drivingMode]);

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

  const clearSpeechFinalizeTimer = useCallback(() => {
    if (speechFinalizeTimerRef.current != null) {
      clearTimeout(speechFinalizeTimerRef.current);
      speechFinalizeTimerRef.current = null;
    }
  }, []);

  const scheduleFinalizeAfterSpeechEnd = useCallback(() => {
    clearSpeechFinalizeTimer();
    const delayMs = Platform.OS === 'android' ? 400 : 140;
    speechFinalizeTimerRef.current = setTimeout(() => {
      speechFinalizeTimerRef.current = null;
      finalizeTranscript();
    }, delayMs);
  }, [clearSpeechFinalizeTimer, finalizeTranscript]);

  const stopListening = useCallback(async () => {
    clearSpeechFinalizeTimer();
    if (!Voice) return;
    try {
      await Voice.stop();
    } catch {
      /* ignore */
    }
    setIsListening(false);
    finalizeTranscript();
  }, [clearSpeechFinalizeTimer, finalizeTranscript]);

  const startListening = useCallback(async () => {
    if (!Voice || Platform.OS === 'web' || isThinking) return;
    const ok = await requestMicPermission();
    if (!ok) {
      Alert.alert('Microphone', 'Enable microphone access in Settings to speak with Orion.');
      return;
    }
    try {
      if (typeof Voice.isAvailable === 'function') {
        const avail = await Voice.isAvailable();
        if (!avail) {
          Alert.alert('Voice input', 'Speech recognition is not available on this device right now.');
          return;
        }
      }
    } catch {
      /* continue */
    }
    transcriptRef.current = '';
    setPartialTranscript('');
    clearSpeechFinalizeTimer();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Speech.stop();
    await configureAudioSessionForVoiceInput();
    setIsListening(true);
    const tryLocales = Platform.OS === 'android' ? ['en_US', 'en-US', 'en_US.UTF-8'] : ['en-US', 'en_US'];
    for (const locale of tryLocales) {
      try {
        await Voice.start(locale);
        return;
      } catch {
        /* try next */
      }
    }
    setIsListening(false);
  }, [isThinking, requestMicPermission, clearSpeechFinalizeTimer]);

  useEffect(() => {
    if (!Voice || !visible) return;
    Voice.onSpeechStart = () => {
      clearSpeechFinalizeTimer();
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
      clearSpeechFinalizeTimer();
      const t = e?.value?.[0]?.trim();
      if (t) transcriptRef.current = t;
    };
    Voice.onSpeechEnd = () => {
      setIsListening(false);
      scheduleFinalizeAfterSpeechEnd();
    };
    Voice.onSpeechError = () => {
      clearSpeechFinalizeTimer();
      setIsListening(false);
      transcriptRef.current = '';
      setPartialTranscript('');
    };
    return () => {
      clearSpeechFinalizeTimer();
      Voice.onSpeechStart = null;
      Voice.onSpeechPartialResults = null;
      Voice.onSpeechResults = null;
      Voice.onSpeechEnd = null;
      Voice.onSpeechError = null;
      void Voice.cancel().catch(() => {});
    };
  }, [clearSpeechFinalizeTimer, scheduleFinalizeAfterSpeechEnd, visible]);

  useEffect(() => {
    if (visible) return;
    transcriptRef.current = '';
    setPartialTranscript('');
    setIsListening(false);
    setIsThinking(false);
    void Voice?.cancel().catch(() => {});
    clearSpeechFinalizeTimer();
  }, [visible, clearSpeechFinalizeTimer]);

  const glowColor = useMemo(() => {
    if (isListening) return 'rgba(239,68,68,0.28)';
    if (isThinking) return 'rgba(99,102,241,0.24)';
    return 'transparent';
  }, [isListening, isThinking]);

  if (!visible) return null;

  const navMode = interactionMode === 'navigation';
  const fabSize = compactHudFab ? 44 : 48;
  const iconSize = compactHudFab ? 20 : 22;

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
    <View style={compactHudFab ? styles.wrapCluster : styles.wrapExplore}>
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
        <LinearGradient
          colors={isPremium ? ['#7C3AED', '#5B21B6'] : ['#6366F1', '#4F46E5']}
          style={[
            styles.grad,
            compactHudFab ? { width: fabSize, height: fabSize, borderRadius: fabSize / 2 } : null,
          ]}
        >
          <Ionicons name={fabIcon} size={iconSize} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapCluster: { alignItems: 'center' },
  wrapExplore: { alignItems: 'flex-end' },
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
