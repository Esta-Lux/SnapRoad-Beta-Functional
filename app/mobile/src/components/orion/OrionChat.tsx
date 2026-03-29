import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Navigate to the nearest gas station',
  'How far am I from home?',
  'Report a hazard ahead',
  'What is my driving score?',
];

interface OrionContext {
  lat?: number;
  lng?: number;
  isNavigating?: boolean;
  drivingMode?: string;
  destination?: string;
  speed?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  isPremium: boolean;
  context?: OrionContext;
  onAction?: (action: { type: string; name?: string; lat?: number; lng?: number }) => void;
}

export default function OrionChat({ visible, onClose, isPremium, context, onAction }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: "Hey! I'm Orion, your AI co-pilot. How can I help?" },
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList>(null);
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: String(Date.now()), role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await api.post<{ content?: string; text?: string; actions?: Array<{ type: string; name?: string; lat?: number; lng?: number }> }>('/api/orion/completions', {
        messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        context: context ?? {},
      });
      if (!res.success) throw new Error(res.error || 'Orion request failed');
      const reply = res.data?.content ?? res.data?.text ?? "I couldn't process that right now.";
      const actions = res.data?.actions;
      const assistantMsg: Message = { id: String(Date.now() + 1), role: 'assistant', content: reply };
      setMessages((prev) => [...prev, assistantMsg]);
      Speech.speak(reply, { rate: 0.95, pitch: 0.9, language: 'en-US' });
      if (actions?.length && onAction) {
        actions.forEach((a) => onAction(a));
      }
    } catch {
      setMessages((prev) => [...prev, { id: String(Date.now() + 1), role: 'assistant', content: "Sorry, I'm having trouble connecting. Try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleMicPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setIsListening(false);
        sendMessage('What is my driving score?');
      }, 3000);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <KeyboardAvoidingView style={s.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.handle} />
          {/* Header */}
          <View style={s.header}>
            <LinearGradient colors={['#7C3AED', '#5B21B6']} style={s.avatar}>
              <Ionicons name="sparkles" size={20} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.headerTitle}>Orion</Text>
              <Text style={s.headerSub}>Your AI co-pilot</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd()}
            renderItem={({ item }) => (
              <View style={[s.bubble, item.role === 'user' ? s.userBubble : s.assistantBubble]}>
                {item.role === 'user' ? (
                  <LinearGradient colors={['#7C3AED', '#5B21B6']} style={s.userGrad}>
                    <Text style={s.bubbleText}>{item.content}</Text>
                  </LinearGradient>
                ) : (
                  <Text style={[s.bubbleText, { color: 'rgba(255,255,255,0.9)' }]}>{item.content}</Text>
                )}
              </View>
            )}
          />

          {/* Typing indicator */}
          {isTyping && (
            <View style={s.typingRow}>
              <View style={s.typingDot} /><View style={[s.typingDot, { opacity: 0.6 }]} /><View style={[s.typingDot, { opacity: 0.3 }]} />
            </View>
          )}

          {/* Suggestions */}
          {messages.length <= 2 && (
            <View style={s.suggestRow}>
              {SUGGESTIONS.map((sug, i) => (
                <TouchableOpacity key={i} style={s.suggestChip} onPress={() => sendMessage(sug)}>
                  <Text style={s.suggestText}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Input row */}
          <View style={s.inputRow}>
            <TextInput style={s.textInput} placeholder="Ask Orion..." placeholderTextColor="rgba(255,255,255,0.3)"
              value={input} onChangeText={setInput} returnKeyType="send" onSubmitEditing={() => sendMessage(input)} />
            <TouchableOpacity onPress={() => sendMessage(input)} style={s.sendBtn}>
              <Ionicons name="send" size={18} color="#7C3AED" />
            </TouchableOpacity>
          </View>

          {/* Mic button */}
          <View style={s.micRow}>
            <TouchableOpacity onPress={handleMicPress} activeOpacity={0.8}>
              <LinearGradient colors={isListening ? ['#FF3B30', '#CC0000'] : ['#7C3AED', '#5B21B6']}
                style={[s.micBtn, isListening && s.micBtnListening]}>
                <Ionicons name={isListening ? 'radio' : 'mic'} size={28} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0D0D0F', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.5, shadowRadius: 40 },
  handle: { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 12 },
  avatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  closeBtn: { padding: 8 },
  bubble: { marginBottom: 8, maxWidth: '80%' },
  userBubble: { alignSelf: 'flex-end' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, borderTopLeftRadius: 4, padding: 12 },
  userGrad: { borderRadius: 18, borderTopRightRadius: 4, padding: 12 },
  bubbleText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  typingRow: { flexDirection: 'row', gap: 4, paddingLeft: 24, paddingBottom: 8 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7C3AED' },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  suggestChip: { backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  suggestText: { color: '#A78BFA', fontSize: 12, fontWeight: '500' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 14 },
  textInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 12 },
  sendBtn: { padding: 8 },
  micRow: { alignItems: 'center', paddingBottom: 32 },
  micBtn: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  micBtnListening: { shadowColor: '#FF3B30', shadowOpacity: 0.6 },
});
