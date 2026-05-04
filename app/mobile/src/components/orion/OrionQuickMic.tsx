import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { api } from '../../api/client';
import {
  configureAudioSessionForSpeechOutput,
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
  onSpeechError: ((ev?: { error?: { message?: string } }) => void) | null;
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

/** Spoken once when entering hands-free Orion from the HUD; then mic opens for Q&A. */
const ORION_NAV_VOICE_GREETING =
  "Hey — I'm Orion. What can I do for you? Ask about your route, traffic, stops, places nearby, or how to use voice.";

/** If dictation stops with no usable text after the user waited a moment. */
const ORION_NAV_EMPTY_REPLY =
  "I didn't quite catch that. Tap the Orion mic again — then ask away; I'm here to help.";

function normalizeDrivingMode(mode?: string): DrivingMode {
  return mode === 'calm' || mode === 'sport' || mode === 'adaptive' ? mode : 'adaptive';
}

export type OrionQuickInteractionMode = 'explore' | 'navigation';

interface Props {
  visible: boolean;
  isPremium: boolean;
  /** Explore: tap opens full Orion chat; long-press starts voice. Navigation: tap greets aloud then opens mic. */
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
  const [isWelcoming, setIsWelcoming] = useState(false);
  const [respondingAudible, setRespondingAudible] = useState(false);
  const transcriptRef = useRef('');
  const orionSpeakingRef = useRef(false);
  const speechFinalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listeningStartedAtRef = useRef(0);
  const heardAnythingRef = useRef(false);
  const listenedManuallyEndedRef = useRef(false);
  /** Sync latest props/callback refs for asynchronous TTS + mic hand-offs. */
  const visibleRef = useRef(visible);
  const isWelcomingRef = useRef(false);
  const navModeRef = useRef(interactionMode === 'navigation');
  navModeRef.current = interactionMode === 'navigation';

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    isWelcomingRef.current = isWelcoming;
  }, [isWelcoming]);

  const requestMicPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  const clearSpeechFinalizeTimer = useCallback(() => {
    if (speechFinalizeTimerRef.current != null) {
      clearTimeout(speechFinalizeTimerRef.current);
      speechFinalizeTimerRef.current = null;
    }
  }, []);

  const startListeningCore = useCallback(async () => {
    if (!Voice || Platform.OS === 'web' || !visibleRef.current || isThinking) return;
    try {
      if (typeof Voice.isAvailable === 'function') {
        const avail = await Voice.isAvailable();
        if (!avail) {
          Alert.alert('Voice input', 'Speech recognition is not available on this device right now.');
          return;
        }
      }
    } catch {
      /* optional */
    }
    transcriptRef.current = '';
    setPartialTranscript('');
    clearSpeechFinalizeTimer();
    listenedManuallyEndedRef.current = false;
    heardAnythingRef.current = false;
    listeningStartedAtRef.current = Date.now();
    Speech.stop();
    await configureAudioSessionForVoiceInput();
    setIsListening(true);
    const tryLocales = Platform.OS === 'android' ? ['en_US', 'en-US', 'en_US.UTF-8'] : ['en-US', 'en_US'];
    for (const locale of tryLocales) {
      try {
        await Voice.start(locale);
        return;
      } catch {
        /* next */
      }
    }
    setIsListening(false);
  }, [clearSpeechFinalizeTimer, isThinking]);

  const speakReplyAndMaybeContinue = useCallback(
    (reply: string, continueConversation?: boolean) => {
      setRespondingAudible(true);
      const finish = () => {
        orionSpeakingRef.current = false;
        setRespondingAudible(false);
        void restoreDefaultAudioSession().then(() => {
          if (
            continueConversation &&
            visibleRef.current &&
            navModeRef.current &&
            Voice &&
            Platform.OS !== 'web'
          ) {
            setTimeout(() => {
              void startListeningCore();
            }, 580);
          }
        });
      };
      try {
        void Voice?.cancel().catch(() => {});
        setIsListening(false);
        setPartialTranscript('');
        clearSpeechFinalizeTimer();
        Speech.stop();
        orionSpeakingRef.current = true;
        speakOrionReply(reply, finish, normalizeDrivingMode(context?.drivingMode));
      } catch {
        finish();
      }
    },
    [clearSpeechFinalizeTimer, context?.drivingMode, startListeningCore],
  );

  const sendPrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;
      setIsThinking(true);
      const continuing = navModeRef.current;
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
        speakReplyAndMaybeContinue(reply, continuing);
        if (Array.isArray(actions) && actions.length && onAction) {
          const navFirst = actions.find((a) => a?.type === 'navigate');
          if (navFirst) onAction(navFirst);
          else actions.forEach((a) => onAction(a));
        }
      } catch {
        const fallback = "Sorry — I'm having trouble reaching the assistant. Try asking again in a moment.";
        onReply?.(fallback);
        speakReplyAndMaybeContinue(fallback, continuing);
      } finally {
        setIsThinking(false);
      }
    },
    [context, onAction, onReply, onSuggestions, speakReplyAndMaybeContinue],
  );

  const finalizeTranscript = useCallback(
    (source: 'natural-end' | 'user-cancel') => {
      const finalText = transcriptRef.current.trim() || partialTranscript.trim();
      transcriptRef.current = '';
      setPartialTranscript('');
      if (finalText) {
        void sendPrompt(finalText);
        return;
      }
      if (source === 'user-cancel') return;
      const dwellMs = Date.now() - listeningStartedAtRef.current;
      if (
        dwellMs >= 1900 &&
        !heardAnythingRef.current &&
        !listenedManuallyEndedRef.current
      ) {
        speakReplyAndMaybeContinue(ORION_NAV_EMPTY_REPLY, false);
      }
    },
    [partialTranscript, sendPrompt, speakReplyAndMaybeContinue],
  );

  const scheduleFinalizeAfterSpeechEnd = useCallback(() => {
    clearSpeechFinalizeTimer();
    const delayMs = Platform.OS === 'android' ? 450 : 160;
    speechFinalizeTimerRef.current = setTimeout(() => {
      speechFinalizeTimerRef.current = null;
      finalizeTranscript('natural-end');
    }, delayMs);
  }, [clearSpeechFinalizeTimer, finalizeTranscript]);

  const stopListening = useCallback(async () => {
    listenedManuallyEndedRef.current = true;
    clearSpeechFinalizeTimer();
    if (!Voice) return;
    try {
      await Voice.stop();
    } catch {
      /* ignore */
    }
    setIsListening(false);
    finalizeTranscript('user-cancel');
    listenedManuallyEndedRef.current = false;
  }, [clearSpeechFinalizeTimer, finalizeTranscript]);

  const beginNavigationHandsFreeSession = useCallback(async () => {
    if (!Voice || Platform.OS === 'web' || !navModeRef.current) return;

    Speech.stop();
    clearSpeechFinalizeTimer();
    transcriptRef.current = '';
    setPartialTranscript('');
    setIsWelcoming(true);
    setRespondingAudible(true);
    setIsListening(false);
    void Voice?.cancel().catch(() => {});
    heardAnythingRef.current = false;

    try {
      await configureAudioSessionForSpeechOutput();
    } catch {
      /* optional */
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    orionSpeakingRef.current = true;
    speakOrionReply(
      ORION_NAV_VOICE_GREETING,
      () => {
        orionSpeakingRef.current = false;
        setRespondingAudible(false);
        setIsWelcoming(false);
        void restoreDefaultAudioSession().then(async () => {
          if (!visibleRef.current || !navModeRef.current) return;
          listenedManuallyEndedRef.current = false;
          heardAnythingRef.current = false;

          const ok = await requestMicPermission();
          if (!ok) {
            Alert.alert('Microphone', 'Enable microphone access in Settings so Orion can hear your question.');
            return;
          }

          await new Promise((r) => setTimeout(r, 420));

          if (!visibleRef.current || !navModeRef.current) return;
          await startListeningCore();
        });
      },
      normalizeDrivingMode(context?.drivingMode),
    );
  }, [clearSpeechFinalizeTimer, context?.drivingMode, requestMicPermission, startListeningCore]);

  const startListeningOnly = useCallback(async () => {
    if (!Voice || Platform.OS === 'web') return;
    const ok = await requestMicPermission();
    if (!ok) {
      Alert.alert('Microphone', 'Enable microphone access in Settings to speak with Orion.');
      return;
    }
    heardAnythingRef.current = false;
    listeningStartedAtRef.current = Date.now();
    await startListeningCore();
  }, [requestMicPermission, startListeningCore]);

  useEffect(() => {
    if (!Voice || !visible) return;
    Voice.onSpeechStart = () => {
      clearSpeechFinalizeTimer();
    };
    Voice.onSpeechPartialResults = (e) => {
      if (orionSpeakingRef.current || isWelcomingRef.current) return;
      heardAnythingRef.current = true;
      const t = e?.value?.[0];
      if (t) {
        transcriptRef.current = t;
        setPartialTranscript(t);
      }
    };
    Voice.onSpeechResults = (e) => {
      if (orionSpeakingRef.current || isWelcomingRef.current) return;
      clearSpeechFinalizeTimer();
      const t = e?.value?.[0]?.trim();
      if (t) {
        transcriptRef.current = t;
        heardAnythingRef.current = true;
      }
    };
    Voice.onSpeechEnd = () => {
      setIsListening(false);
      scheduleFinalizeAfterSpeechEnd();
    };
    Voice.onSpeechError = (err) => {
      const code = String(err?.error?.message ?? '');
      clearSpeechFinalizeTimer();
      setIsListening(false);
      transcriptRef.current = '';
      setPartialTranscript('');
      /** `no-speech` on Android fires quickly when the mic opens under load — ignore silently. */
      if (Platform.OS === 'android' && /no.?match|no.?speech/i.test(code)) return;
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[OrionQuickMic] speech error', err?.error?.message ?? err);
      }
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
    setIsWelcoming(false);
    setRespondingAudible(false);
    orionSpeakingRef.current = false;
    void Voice?.cancel().catch(() => {});
    Speech.stop();
    clearSpeechFinalizeTimer();
  }, [visible, clearSpeechFinalizeTimer]);

  const glowColor = useMemo(() => {
    if (isListening) return 'rgba(239,68,68,0.28)';
    if (isThinking || isWelcoming || respondingAudible) return 'rgba(99,102,241,0.24)';
    return 'transparent';
  }, [isListening, isThinking, isWelcoming, respondingAudible]);

  if (!visible) return null;

  const navMode = interactionMode === 'navigation';
  const fabSize = compactHudFab ? 44 : 48;
  const iconSize = compactHudFab ? 20 : 22;

  const cancelPlayback = () => {
    Speech.stop();
    orionSpeakingRef.current = false;
    void Voice?.cancel().catch(() => {});
    clearSpeechFinalizeTimer();
    listenedManuallyEndedRef.current = true;
    heardAnythingRef.current = false;
    setIsWelcoming(false);
    setRespondingAudible(false);
    setPartialTranscript('');
    transcriptRef.current = '';
    setIsListening(false);
    void restoreDefaultAudioSession().catch(() => {});
  };

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
    if (
      isWelcoming ||
      respondingAudible ||
      (orionSpeakingRef.current && !isListening && !isThinking)
    ) {
      cancelPlayback();
      return;
    }
    if (isListening) {
      void stopListening();
    } else if (isThinking) {
      return;
    } else {
      void beginNavigationHandsFreeSession();
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
      void startListeningOnly();
    }
  };

  const fabIcon = !navMode
    ? isListening
      ? 'radio'
      : 'chatbubbles-outline'
    : isListening || isWelcoming || respondingAudible
      ? 'radio'
      : 'mic-outline';

  const fabA11y = navMode
    ? isListening || isWelcoming || respondingAudible
      ? 'Cancel or stop Orion'
      : 'Ask Orion aloud — listens after greeting'
    : isListening
      ? 'Stop Orion voice'
      : 'Open Orion chat';

  const showStatePill = isListening || isThinking || isWelcoming || respondingAudible;

  return (
    <View style={compactHudFab ? styles.wrapCluster : styles.wrapExplore}>
      {showStatePill && (
        <View style={[styles.statePill, { backgroundColor: glowColor }]}>
          {isWelcoming || respondingAudible ? (
            <Ionicons name="sparkles-outline" size={14} color="#BFDBFE" />
          ) : isThinking ? (
            <ActivityIndicator size="small" color="#EEF2FF" />
          ) : (
            <Ionicons name="mic" size={14} color="#FECACA" />
          )}
          <Text style={styles.stateText}>
            {isWelcoming || respondingAudible
              ? isWelcoming
                ? 'Orion introducing…'
                : 'Speaking…'
              : isThinking
                ? 'Orion is thinking…'
                : isListening
                  ? `Listening${partialTranscript ? `: ${partialTranscript}` : '…'}`
                  : 'Orion'}
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.fabTap}
        onPress={handleFabPress}
        onLongPress={navMode ? undefined : handleLongPress}
        activeOpacity={0.82}
        accessibilityLabel={fabA11y}
        accessibilityHint={
          navMode ? 'Speaks briefly, then opens the microphone for questions' : 'Long press for voice without opening chat'
        }
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
