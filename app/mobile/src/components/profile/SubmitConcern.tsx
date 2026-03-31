import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

const CONCERN_TYPES = ['Bug', 'Feature Request', 'Safety Concern', 'Other'] as const;
type ConcernType = (typeof CONCERN_TYPES)[number];

export default function SubmitConcern({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const [type, setType] = useState<ConcernType>('Bug');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    const msg = message.trim();
    if (!msg) {
      Alert.alert('Missing message', 'Please describe your concern.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const category = type.toLowerCase().replace(/\s+/g, '_');
      const title = msg.split('\n')[0]?.trim().slice(0, 80) || type;
      const res = await api.post('/api/concerns/submit', {
        category,
        title,
        description: msg,
        severity,
        context: { source: 'mobile_profile' },
      });
      if (res.success) {
        Alert.alert('Submitted', "Thank you! We'll review your concern shortly.", [
          { text: 'OK', onPress: onClose },
        ]);
        setMessage('');
        setType('Bug');
        setSeverity('medium');
      } else {
        setErrorMsg(res.error || 'Failed to submit concern');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ backgroundColor: colors.surface }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: colors.surface }}
        >
          <Text style={[styles.title, { color: colors.text }]}>Submit Concern</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
      <View style={styles.pillRow}>
        {CONCERN_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.pill,
              { backgroundColor: colors.card, borderColor: 'rgba(148,163,184,0.25)' },
              type === t && styles.pillActive,
            ]}
            onPress={() => setType(t)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, { color: colors.textSecondary }, type === t && styles.pillTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Severity</Text>
      <View style={styles.pillRow}>
        {(['low', 'medium', 'high'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.pill,
              { backgroundColor: colors.card, borderColor: 'rgba(148,163,184,0.25)' },
              severity === s && styles.pillActive,
            ]}
            onPress={() => setSeverity(s)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, { color: colors.textSecondary }, severity === s && styles.pillTextActive]}>
              {s[0].toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Message</Text>
      <TextInput
        style={[styles.messageInput, { backgroundColor: colors.card, color: colors.text, borderColor: 'rgba(148,163,184,0.2)' }]}
        placeholder="Describe your concern..."
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        value={message}
        onChangeText={setMessage}
      />
      <Text style={[styles.counter, { color: colors.textSecondary }]}>{message.trim().length}/500</Text>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="paper-plane-outline" size={16} color="#fff" />
            <Text style={styles.submitBtnText}>Submit</Text>
          </>
        )}
      </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  pillActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  pillTextActive: {
    color: '#fff',
  },
  messageInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 110,
    marginBottom: 8,
  },
  counter: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
