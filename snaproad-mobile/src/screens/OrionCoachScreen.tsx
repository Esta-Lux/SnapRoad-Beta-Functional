// SnapRoad Mobile - Orion AI Coach Screen
// Voice-enabled AI driving assistant

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://snaproad-boost.preview.emergentagent.com/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'orion';
  text: string;
  timestamp: Date;
}

interface OrionCoachScreenProps {
  navigation?: any;
  userContext?: {
    safety_score?: number;
    gems?: number;
  };
}

const QUICK_QUESTIONS = [
  { id: 'traffic', text: 'Traffic ahead?', icon: 'warning-outline' },
  { id: 'fuel', text: 'Fuel tips', icon: 'water-outline' },
  { id: 'safety', text: 'Safety score', icon: 'shield-checkmark-outline' },
  { id: 'rewards', text: 'Nearby rewards', icon: 'gift-outline' },
];

export function OrionCoachScreen({ navigation, userContext }: OrionCoachScreenProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `mobile_${Date.now()}`);
  const scrollViewRef = useRef<ScrollView>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/orion/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          context: userContext || { safety_score: 85, gems: 500 },
        }),
      });

      const data = await response.json();

      const orionMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'orion',
        text: data.success ? data.response : getLocalResponse(text),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, orionMessage]);
    } catch (error) {
      const orionMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'orion',
        text: getLocalResponse(text),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, orionMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getLocalResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes('traffic') || q.includes('route')) {
      return "Your route looks clear! Light traffic on I-71 may add 3-4 minutes. Want me to check for alternatives?";
    }
    if (q.includes('fuel') || q.includes('gas')) {
      return "Great fuel efficiency today at 34 MPG! Keep your speed 55-65 mph for best results. There's a partner station 0.8 mi ahead with $0.10/gal off! ⛽";
    }
    if (q.includes('safety') || q.includes('score')) {
      return "Your safety score is 94 - excellent! You've been driving smoothly with consistent speed. Keep it up for the 'Perfect Trip' bonus of 25 gems! 🎯";
    }
    if (q.includes('reward') || q.includes('gem')) {
      return "3 partner offers near you: Coffee House (15% off, 50 gems), Auto Spa (Free wash, 100 gems), Gas Plus ($0.10/gal, 75 gems). Want to add any as a stop?";
    }
    return "I can help with traffic, fuel tips, safety scores, and rewards near you. What would you like to know? 🚗";
  };

  const handleQuickQuestion = (id: string) => {
    const questions: Record<string, string> = {
      traffic: "What's the traffic like ahead?",
      fuel: 'How can I save fuel on this trip?',
      safety: "How's my safety score?",
      rewards: 'What rewards are near my route?',
    };
    sendMessage(questions[id] || '');
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.orionAvatar}>
            <Ionicons name="hardware-chip" size={24} color="white" />
            <View style={styles.activeIndicator} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Orion AI</Text>
            <Text style={styles.headerSubtitle}>Your driving assistant</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="hardware-chip" size={48} color="#1B2432" />
            </View>
            <Text style={styles.emptyTitle}>Ask Orion anything</Text>
            <Text style={styles.emptySubtitle}>
              I can help with traffic, fuel tips, safety, and rewards
            </Text>

            {/* Quick Questions */}
            <View style={styles.quickQuestions}>
              {QUICK_QUESTIONS.map((q) => (
                <TouchableOpacity
                  key={q.id}
                  style={styles.quickButton}
                  onPress={() => handleQuickQuestion(q.id)}
                >
                  <Ionicons name={q.icon as any} size={16} color="#0084FF" />
                  <Text style={styles.quickText}>{q.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.userBubble : styles.orionBubble,
              ]}
            >
              {msg.role === 'orion' && (
                <View style={styles.orionLabel}>
                  <Ionicons name="hardware-chip" size={12} color="#00DFA2" />
                  <Text style={styles.orionLabelText}>ORION</Text>
                </View>
              )}
              <Text style={styles.messageText}>{msg.text}</Text>
            </View>
          ))
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <Ionicons name="hardware-chip" size={16} color="#00DFA2" />
            <ActivityIndicator size="small" color="#0084FF" style={styles.loadingIndicator} />
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask Orion..."
          placeholderTextColor="#4B5C74"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => sendMessage(inputText)}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={() => sendMessage(inputText)}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons name="send" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#0A0E16',
    borderBottomWidth: 1,
    borderBottomColor: '#1B2432',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1B2432',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0084FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00DFA2',
    borderWidth: 2,
    borderColor: '#0A0E16',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8A9BB6',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1B2432',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8A9BB6',
    textAlign: 'center',
    marginBottom: 24,
  },
  quickQuestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B2432',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  quickText: {
    color: 'white',
    fontSize: 13,
    marginLeft: 6,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#0084FF',
  },
  orionBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1B2432',
    borderWidth: 1,
    borderColor: '#2A3544',
  },
  orionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  orionLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00DFA2',
    marginLeft: 4,
  },
  messageText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#0A0E16',
    borderTopWidth: 1,
    borderTopColor: '#1B2432',
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#1B2432',
    borderRadius: 24,
    paddingHorizontal: 20,
    color: 'white',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2A3544',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0084FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default OrionCoachScreen;
