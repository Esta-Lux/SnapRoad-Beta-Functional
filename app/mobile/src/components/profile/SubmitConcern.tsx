import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../common/Modal';
import { api } from '../../api/client';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const CONCERN_TYPES = ['Bug', 'Feature Request', 'Safety Concern', 'Other'] as const;
type ConcernType = (typeof CONCERN_TYPES)[number];

export default function SubmitConcern({ visible, onClose }: Props) {
  const [type, setType] = useState<ConcernType>('Bug');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const msg = message.trim();
    if (!msg) {
      Alert.alert('Missing message', 'Please describe your concern.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/concerns/submit', {
        type: type.toLowerCase().replace(' ', '_'),
        message: msg,
      });
      if (res.success) {
        Alert.alert('Submitted', "Thank you! We'll review your concern shortly.", [
          { text: 'OK', onPress: onClose },
        ]);
        setMessage('');
        setType('Bug');
      } else {
        Alert.alert('Error', res.error || 'Failed to submit concern');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <Text style={styles.title}>Submit Concern</Text>

      <Text style={styles.label}>Type</Text>
      <View style={styles.pillRow}>
        {CONCERN_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.pill, type === t && styles.pillActive]}
            onPress={() => setType(t)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, type === t && styles.pillTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Message</Text>
      <TextInput
        style={styles.messageInput}
        placeholder="Describe your concern..."
        placeholderTextColor="#64748b"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        value={message}
        onChangeText={setMessage}
      />

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
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
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
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#f8fafc',
    minHeight: 110,
    marginBottom: 16,
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
