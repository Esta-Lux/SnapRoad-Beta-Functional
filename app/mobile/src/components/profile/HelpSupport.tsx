import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../common/Modal';
import { api } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'How do I start navigation?',
    a: 'Tap the search bar, enter a destination, select a route, and press Start. SnapRoad will guide you turn-by-turn with real-time safety alerts.',
  },
  {
    q: 'How do gems work?',
    a: 'Earn gems by completing trips safely, posting road reports, and redeeming partner offers. Gems can be spent on in-app rewards and partner discounts.',
  },
  {
    q: 'How do I add friends?',
    a: 'Go to the Dashboards tab, tap Add Friend, and enter their SnapRoad username or share your invite link.',
  },
  {
    q: 'What are driving modes?',
    a: 'SnapRoad has 3 modes: Calm (relaxed alerts, scenic routes), Adaptive (AI-adjusted to your driving style), and Sport (performance-focused with aggressive metrics).',
  },
  {
    q: 'How do I report incidents?',
    a: 'Tap the camera icon on the map, take or choose a photo, add a description, and submit. Your report helps other drivers in real time.',
  },
];

export default function HelpSupport({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleFaq = (index: number) => {
    setExpanded((prev) => (prev === index ? null : index));
  };

  const handleSendFeedback = async () => {
    const msg = feedback.trim();
    if (!msg) {
      Alert.alert('Empty feedback', 'Please type your feedback before sending.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/concerns/submit', {
        category: 'feedback',
        title: msg.split('\n')[0]?.trim().slice(0, 80) || 'Feedback',
        description: msg,
        severity: 'low',
        context: { source: 'mobile_help_support' },
      });
      if (res.success) {
        Alert.alert('Thank you!', 'Your feedback has been submitted.');
        setFeedback('');
      } else {
        Alert.alert('Error', res.error || 'Failed to submit feedback');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} scrollable={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        style={{ backgroundColor: colors.surface }}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <Text style={[styles.title, { color: colors.text }]}>Help &amp; Support</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
        {FAQ_ITEMS.map((item, idx) => (
          <View
            key={idx}
            style={[styles.faqItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <TouchableOpacity
              style={styles.faqQuestion}
              onPress={() => toggleFaq(idx)}
              activeOpacity={0.7}
            >
              <Text style={[styles.faqQuestionText, { color: colors.text }]}>{item.q}</Text>
              <Ionicons
                name={expanded === idx ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {expanded === idx && (
              <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{item.a}</Text>
            )}
          </View>
        ))}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Us</Text>
        <TouchableOpacity
          style={[styles.contactRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => Linking.openURL('mailto:support@snaproad.app')}
          activeOpacity={0.7}
        >
          <Ionicons name="mail-outline" size={20} color="#3B82F6" />
          <Text style={[styles.contactText, { color: colors.text }]}>Email us at support@snaproad.app</Text>
          <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Submit Feedback</Text>
        <TextInput
          style={[
            styles.feedbackInput,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
          placeholder="Tell us what you think..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={feedback}
          onChangeText={setFeedback}
        />
        <TouchableOpacity
          style={[styles.sendBtn, submitting && styles.sendBtnDisabled]}
          onPress={handleSendFeedback}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send-outline" size={16} color="#fff" />
              <Text style={styles.sendBtnText}>Send Feedback</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  faqItem: {
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  faqQuestionText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
  },
  contactText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  feedbackInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 100,
    marginBottom: 12,
  },
  sendBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
