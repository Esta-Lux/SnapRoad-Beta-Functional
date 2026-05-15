import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  PermissionsAndroid,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import {
  configureAudioSessionForVoiceInput,
  restoreDefaultAudioSession,
  speakOrionReply,
} from '../../utils/voice';
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

function normalizeDrivingMode(mode?: string): DrivingMode {
  return mode === 'calm' || mode === 'sport' || mode === 'adaptive' ? mode : 'adaptive';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export type OrionPlaceSuggestion = {
  name: string;
  lat: number;
  lng: number;
  place_id?: string;
  address?: string;
};

const SUGGESTIONS = [
  'Suggest a good dinner spot near me',
  'Take me to the nearest gas station',
  'How many trips have I logged?',
  'How can I improve my safety score?',
  'What are SnapRoad gems?',
];

export interface OrionContext {
  lat?: number;
  lng?: number;
  isNavigating?: boolean;
  drivingMode?: string;
  destination?: string;
  speed?: number;
  speedMph?: number;
  userName?: string;
  currentAddress?: string;
  totalTrips?: number;
  totalMiles?: number;
  gems?: number;
  level?: number;
  safetyScore?: number;
  snapRoadScore?: number;
  snapRoadTier?: string;
  isPremium?: boolean;
  weeklyTripCount?: number;
  weeklyMiles?: number;
  weeklySummary?: string;
  favoritePlacesSummary?: string;
  currentRoute?: {
    destination?: string;
    distanceMiles?: number;
    remainingMinutes?: number;
    currentStep?: string;
    nextStep?: string;
  };
  nearbyOffers?: { id?: number | string; title?: string; partner_name?: string; lat?: number; lng?: number }[];
  /** Short conditions string from `/api/weather/current` for coach grounding */
  weather?: string;
  /** Filled by the app from the last Orion `suggestions` payload — powers “take me” for the first pick */
  pendingOrionSuggestions?: OrionPlaceSuggestion[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  isPremium: boolean;
  context?: OrionContext;
  onSuggestions?: (items: OrionPlaceSuggestion[]) => void;
  onAction?: (action: { type: string; name?: string; lat?: number; lng?: number; address?: string }) => void;
}

export default function OrionChat({ visible, onClose, isPremium, context, onSuggestions, onAction }: Props) {
  const { colors, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const card = colors.card;
  const text = colors.text;
  const sub = colors.textSecondary;
  const border = colors.border;
  const primary = colors.primary;
  const sheetBg = isLight ? colors.background : '#0D0D0F';
  const inputBg = isLight ? colors.surfaceSecondary : 'rgba(255,255,255,0.08)';
  const assistantBg = isLight ? colors.surfaceSecondary : 'rgba(255,255,255,0.08)';

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: "Hey! I'm Orion, your SnapRoad co-pilot. Ask for place ideas, say “take me to …”, or tap a suggestion chip to start directions." },
  ]);
  const [suggestionChips, setSuggestionChips] = useState<OrionPlaceSuggestion[]>([]);
  const [input, setInput] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList>(null);
  const messagesRef = useRef(messages);
  const sendInFlightRef = useRef(false);
  const transcriptRef = useRef('');
  /** Ignore stale STT results while Orion TTS is playing (avoids nav/Orion speech feeding the mic). */
  const orionSpeakingRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
      orionSpeakingRef.current = false;
      void restoreDefaultAudioSession();
    }
  }, [context?.drivingMode]);

  const sendMessage = useCallback(
    async (textRaw: string) => {
      const trimmed = textRaw.trim();
      if (!trimmed || sendInFlightRef.current) return;
      sendInFlightRef.current = true;
      const userMsg: Message = { id: String(Date.now()), role: 'user', content: trimmed };
      const prior = messagesRef.current;
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setPartialTranscript('');
      transcriptRef.current = '';
      setIsTyping(true);
      try {
        await Voice?.stop().catch(() => {});
      } catch {
        /* ignore */
      }
      setIsListening(false);

      try {
        const res = await api.post<{
          content?: string;
          text?: string;
          actions?: { type: string; name?: string; lat?: number; lng?: number }[];
        }>('/api/orion/completions', {
          messages: [...prior, userMsg].map((m) => ({ role: m.role, content: m.content })),
          context: {
            ...context,
            speedMph: context?.speedMph ?? context?.speed,
          },
        });
        if (!res.success) throw new Error(res.error || 'Orion request failed');
        const raw = res.data as Record<string, unknown> | undefined;
        const reply =
          (typeof raw?.content === 'string' ? raw.content : null)
          ?? (typeof raw?.text === 'string' ? raw.text : null)
          ?? "I couldn't process that right now.";
        const inner = raw?.data as Record<string, unknown> | undefined;
        const actions = (raw?.actions ?? inner?.actions) as
          | { type: string; name?: string; lat?: number; lng?: number }[]
          | undefined;
        const suggestionsRaw = (raw?.suggestions ?? inner?.suggestions) as OrionPlaceSuggestion[] | undefined;
        let cleanedSuggestions: OrionPlaceSuggestion[] = [];
        if (Array.isArray(suggestionsRaw)) {
          cleanedSuggestions = suggestionsRaw
            .filter(
              (s) =>
                s &&
                typeof s.name === 'string' &&
                typeof s.lat === 'number' &&
                typeof s.lng === 'number' &&
                Number.isFinite(s.lat) &&
                Number.isFinite(s.lng),
            )
            .slice(0, 6);
        }
        setSuggestionChips(cleanedSuggestions);
        onSuggestions?.(cleanedSuggestions);
        const assistantMsg: Message = { id: String(Date.now() + 1), role: 'assistant', content: reply };
        setMessages((prev) => [...prev, assistantMsg]);
        speakReply(reply);
        if (Array.isArray(actions) && actions.length && onAction) {
          const navFirst = actions.find((a) => a?.type === 'navigate');
          if (navFirst) onAction(navFirst);
          else actions.forEach((a) => onAction(a));
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            role: 'assistant',
            content: "Sorry, I'm having trouble connecting. Try again — if this persists, the AI service may be busy.",
          },
        ]);
      } finally {
        setIsTyping(false);
        sendInFlightRef.current = false;
      }
    },
    [context, onAction, speakReply, onSuggestions],
  );

  const micTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible && micTimeoutRef.current) {
      clearTimeout(micTimeoutRef.current);
      micTimeoutRef.current = null;
    }
    if (!visible && Voice) {
      void Voice.cancel().catch(() => {});
      setIsListening(false);
      setPartialTranscript('');
      transcriptRef.current = '';
      orionSpeakingRef.current = false;
      setSuggestionChips([]);
    }
  }, [visible]);

  useEffect(() => {
    if (!Voice) return;
    Voice.onSpeechStart = () => {
      setPartialTranscript('');
      transcriptRef.current = '';
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
      if (t) {
        transcriptRef.current = t;
        setInput(t);
        setPartialTranscript('');
      }
    };
    Voice.onSpeechEnd = () => {
      const t = transcriptRef.current.trim();
      if (t) setInput(t);
      setIsListening(false);
    };
    Voice.onSpeechError = () => {
      setIsListening(false);
      const t = transcriptRef.current.trim();
      if (t) setInput(t);
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
  }, []);

  const requestMicPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }, []);

  const stopListening = useCallback(async () => {
    if (!Voice) return;
    try {
      await Voice.stop();
    } catch {
      /* ignore */
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    if (!Voice || Platform.OS === 'web') return;
    const ok = await requestMicPermission();
    if (!ok) return;
    try {
      if (typeof Voice.isAvailable === 'function') {
        const avail = await Voice.isAvailable();
        if (!avail) return;
      }
    } catch {
      /* continue anyway */
    }
    setPartialTranscript('');
    transcriptRef.current = '';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Speech.stop();
    await configureAudioSessionForVoiceInput();
    setIsListening(true);
    try {
      await Voice.start('en-US');
    } catch {
      setIsListening(false);
    }
  }, [requestMicPermission]);

  const handleMicPress = useCallback(async () => {
    if (!Voice) return;
    if (isListening) {
      await stopListening();
      const combined = transcriptRef.current.trim() || partialTranscript.trim() || input.trim();
      if (combined) setInput(combined);
      transcriptRef.current = '';
      setPartialTranscript('');
      return;
    }
    await startListening();
  }, [isListening, stopListening, startListening, input, partialTranscript]);

  const displayInput = isListening ? (partialTranscript || input) : input;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: isLight ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.5)' }]}>
        <KeyboardAvoidingView
          style={[styles.sheet, { backgroundColor: sheetBg, paddingBottom: Math.max(insets.bottom, 12) }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.handle, { backgroundColor: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)' }]} />
          <View style={styles.header}>
            <LinearGradient colors={[colors.ctaGradientStart, colors.ctaGradientEnd]} style={styles.avatar}>
              <Ionicons name="sparkles" size={20} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.headerTitle, { color: text }]}>Orion</Text>
              <Text style={[styles.headerSub, { color: sub }]}>
                {isPremium ? 'Driving insights on every reply' : 'Voice & chat · say “take me to …” to navigate'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={22} color={sub} />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            style={{ flexGrow: 0 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.bubble,
                  item.role === 'user' ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start', backgroundColor: assistantBg, borderWidth: StyleSheet.hairlineWidth, borderColor: border },
                ]}
              >
                {item.role === 'user' ? (
                  <LinearGradient colors={[colors.ctaGradientStart, colors.ctaGradientEnd]} style={styles.userGrad}>
                    <Text style={styles.bubbleTextUser}>{item.content}</Text>
                  </LinearGradient>
                ) : (
                  <Text style={[styles.bubbleTextAsst, { color: text }]}>{item.content}</Text>
                )}
              </View>
            )}
          />

          {isTyping && (
            <View style={styles.typingRow}>
              <ActivityIndicator size="small" color={primary} />
              <Text style={{ color: sub, marginLeft: 8, fontSize: 13 }}>Orion is thinking…</Text>
            </View>
          )}

          {isListening && partialTranscript ? (
            <Text style={{ color: sub, fontSize: 12, paddingHorizontal: 16, paddingBottom: 6 }} numberOfLines={2}>
              Listening: {partialTranscript}
            </Text>
          ) : null}

          {messages.length <= 2 && (
            <View style={styles.suggestRow}>
              {SUGGESTIONS.map((sug, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.suggestChip, { borderColor: border, backgroundColor: card }]}
                  onPress={() => void sendMessage(sug)}
                >
                  <Text style={[styles.suggestText, { color: primary }]}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: border }]}>
            <TextInput
              style={[styles.textInput, { color: text }]}
              placeholder={isListening ? 'Speak now…' : 'Ask Orion…'}
              placeholderTextColor={sub}
              value={displayInput}
              onChangeText={(t) => {
                if (!isListening) setInput(t);
              }}
              editable={!isListening}
              returnKeyType="send"
              onSubmitEditing={() => void sendMessage(displayInput)}
            />
            {Voice ? (
              <TouchableOpacity
                onPress={() => void handleMicPress()}
                style={[
                  styles.iconBtn,
                  { backgroundColor: isListening ? 'rgba(239,68,68,0.2)' : `${primary}18` },
                ]}
                accessibilityLabel={isListening ? 'Stop dictation' : 'Start voice input'}
              >
                <Ionicons name={isListening ? 'stop-circle' : 'mic'} size={22} color={isListening ? '#EF4444' : primary} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => void sendMessage(displayInput)}
              style={[styles.iconBtn, { backgroundColor: `${primary}22`, opacity: isTyping ? 0.55 : 1 }]}
              disabled={isTyping}
              accessibilityLabel="Send message"
            >
              <Ionicons name="send" size={20} color={primary} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(148,163,184,0.2)' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 12 },
  avatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 2 },
  closeBtn: { padding: 8 },
  bubble: { marginBottom: 8, maxWidth: '82%', borderRadius: 18, padding: 12 },
  userGrad: { borderRadius: 18, padding: 12 },
  bubbleTextUser: { color: '#fff', fontSize: 14, lineHeight: 20 },
  bubbleTextAsst: { fontSize: 14, lineHeight: 20 },
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingBottom: 10 },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  suggestChip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, borderWidth: StyleSheet.hairlineWidth },
  suggestText: { fontSize: 12, fontWeight: '600' },
  suggestionChipsRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  placeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 220,
  },
  placeChipText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 22,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  textInput: { flex: 1, fontSize: 15, paddingVertical: 12, minHeight: 44 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
});
