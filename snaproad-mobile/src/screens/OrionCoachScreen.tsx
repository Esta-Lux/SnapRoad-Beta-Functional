// SnapRoad Mobile - Premium Orion AI Coach
// Clean chat UI with neon blue glass design

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

interface Message { id: string; text: string; isUser: boolean; timestamp: Date; }

const QUICK_PROMPTS = [
  'How can I improve my safety score?',
  'Best fuel-saving tips',
  'Explain my driving metrics',
  'Routes to avoid traffic',
];

const API_URL = '/api';

export const OrionCoachScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "Hey! I'm Orion, your AI driving coach. Ask me anything about driving safety, fuel efficiency, or your performance stats.", isUser: false, timestamp: new Date() },
  ]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), text: text.trim(), isUser: true, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/orion/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), session_id: 'mobile-session' }),
      });
      const data = await res.json();
      const aiMsg: Message = { id: (Date.now()+1).toString(), text: data.response || data.message || "I'm thinking...", isUser: false, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: "I couldn't connect right now. Please try again.", isUser: false, timestamp: new Date() }]);
    }
    setLoading(false);
  };

  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [messages]);

  return (
    <KeyboardAvoidingView style={[s.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <LinearGradient colors={Colors.gradientPrimary} style={s.orionAvatar}>
            <Ionicons name="sparkles" size={16} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={s.headerTitle}>Orion</Text>
            <Text style={s.headerSub}>AI Driving Coach</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      <ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={s.messagesContent} showsVerticalScrollIndicator={false}>
        {messages.map(msg => (
          <View key={msg.id} style={[s.bubble, msg.isUser ? s.bubbleUser : s.bubbleAI]}>
            {!msg.isUser && (
              <LinearGradient colors={Colors.gradientPrimary} style={s.bubbleAvatar}>
                <Ionicons name="sparkles" size={11} color="#fff" />
              </LinearGradient>
            )}
            <View style={[s.bubbleBody, msg.isUser ? s.bubbleBodyUser : s.bubbleBodyAI]}>
              <Text style={[s.bubbleText, msg.isUser && s.bubbleTextUser]}>{msg.text}</Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={[s.bubble, s.bubbleAI]}>
            <LinearGradient colors={Colors.gradientPrimary} style={s.bubbleAvatar}>
              <Ionicons name="sparkles" size={11} color="#fff" />
            </LinearGradient>
            <View style={s.bubbleBodyAI}>
              <ActivityIndicator size="small" color={Colors.primaryLight} />
            </View>
          </View>
        )}

        {/* Quick Prompts (show only if few messages) */}
        {messages.length <= 2 && (
          <View style={s.quickWrap}>
            <Text style={s.quickTitle}>Try asking</Text>
            {QUICK_PROMPTS.map((p, i) => (
              <TouchableOpacity key={i} style={s.quickChip} onPress={() => sendMessage(p)}>
                <Text style={s.quickChipText}>{p}</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.primaryLight} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={[s.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={s.inputRow}>
          <TextInput
            style={s.textInput}
            placeholder="Ask Orion..."
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage(input)}
            returnKeyType="send"
            data-testid="orion-input"
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDim]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            <LinearGradient colors={input.trim() ? Colors.gradientPrimary : [Colors.surface, Colors.surface]} style={s.sendGrad}>
              <Ionicons name="arrow-up" size={20} color={input.trim() ? '#fff' : Colors.textMuted} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.glassBorder },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orionAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, letterSpacing: 0.3 },
  headerSub: { color: Colors.textMuted, fontSize: FontSizes.xs, letterSpacing: 0.5 },
  // Messages
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 16 },
  bubble: { flexDirection: 'row', gap: 8, maxWidth: '88%' },
  bubbleUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubbleAI: { alignSelf: 'flex-start' },
  bubbleAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  bubbleBody: { borderRadius: BorderRadius.xl, padding: 14, maxWidth: '92%' },
  bubbleBodyUser: { backgroundColor: Colors.primary, borderBottomRightRadius: 6 },
  bubbleBodyAI: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorder, borderBottomLeftRadius: 6 },
  bubbleText: { color: Colors.text, fontSize: FontSizes.md, lineHeight: 22, letterSpacing: 0.2 },
  bubbleTextUser: { color: '#fff' },
  // Quick prompts
  quickWrap: { marginTop: 12, gap: 8 },
  quickTitle: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  quickChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: BorderRadius.lg, paddingVertical: 14, paddingHorizontal: 16 },
  quickChipText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.medium, flex: 1 },
  // Input
  inputBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.glassBorder, backgroundColor: Colors.background },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  textInput: { flex: 1, height: 48, backgroundColor: Colors.surface, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.glassBorder, paddingHorizontal: 18, color: Colors.text, fontSize: FontSizes.md },
  sendBtn: { overflow: 'hidden', borderRadius: 24 },
  sendBtnDim: { opacity: 0.5 },
  sendGrad: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

export default OrionCoachScreen;
