import React from 'react';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { OrionPreferences } from '../../types/orionPreferences';
import {
  ORION_CHATTINESS_OPTIONS,
  ORION_MOOD_OPTIONS,
} from '../../types/orionPreferences';
import { getOrionCompanionMemory } from '../../orion/companion/orionCompanionShared';

type Props = {
  cardBg: string;
  text: string;
  sub: string;
  border: string;
  primary: string;
  prefs: OrionPreferences;
  onChange: (patch: Partial<OrionPreferences>) => void;
  onClearLocalMemory: () => void;
};

export function OrionRoadBuddyCard({
  cardBg,
  text,
  sub,
  border,
  primary,
  prefs,
  onChange,
  onClearLocalMemory,
}: Props) {
  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <Text style={{ color: text, fontSize: 14, fontWeight: '800', marginBottom: 4 }}>Orion mood</Text>
      <Text style={{ color: sub, fontSize: 11, marginBottom: 10 }}>How Orion sounds on drives and in chat.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {ORION_MOOD_OPTIONS.map((opt) => {
          const active = prefs.mood === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => onChange({ mood: opt.key })}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? primary : border,
                backgroundColor: active ? `${primary}18` : 'transparent',
              }}
            >
              <Text style={{ color: active ? primary : text, fontSize: 12, fontWeight: '800' }}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={{ color: text, fontSize: 14, fontWeight: '800', marginBottom: 8 }}>Chattiness</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {ORION_CHATTINESS_OPTIONS.map((opt) => {
          const active = prefs.chattiness === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => onChange({ chattiness: opt.key })}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: active ? primary : border,
                backgroundColor: active ? `${primary}14` : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: active ? primary : text, fontSize: 12, fontWeight: '800' }}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.settingRow}>
        <Ionicons name="radio-outline" size={16} color={sub} />
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.settingLabel, { color: text }]}>Auto road buddy</Text>
          <Text style={{ color: sub, fontSize: 10 }}>Unprompted lines during trips (when companion is enabled).</Text>
        </View>
        <Switch
          value={prefs.auto_buddy}
          onValueChange={(v) => onChange({ auto_buddy: v })}
          trackColor={{ false: '#ccc', true: primary }}
        />
      </View>

      <View style={[styles.settingRow, { marginTop: 8 }]}>
        <Ionicons name="sparkles-outline" size={16} color={sub} />
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.settingLabel, { color: text }]}>ChatGPT buddy lines</Text>
          <Text style={{ color: sub, fontSize: 10 }}>Personalized lines via server AI (NVIDIA fallback).</Text>
        </View>
        <Switch
          value={prefs.use_llm_buddy}
          onValueChange={(v) => onChange({ use_llm_buddy: v })}
          trackColor={{ false: '#ccc', true: primary }}
        />
      </View>

      <View style={[styles.settingRow, { marginTop: 8 }]}>
        <Ionicons name="mic-outline" size={16} color={sub} />
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.settingLabel, { color: text }]}>ElevenLabs Orion voice</Text>
          <Text style={{ color: sub, fontSize: 10 }}>Uses premium voice when available on device.</Text>
        </View>
        <Switch
          value={prefs.voice === 'elevenlabs'}
          onValueChange={(v) => onChange({ voice: v ? 'elevenlabs' : 'device' })}
          trackColor={{ false: '#ccc', true: primary }}
        />
      </View>

      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            'Clear Orion trip memory?',
            'Removes recent spoken-line memory on this device so Orion can repeat fewer patterns.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Clear',
                style: 'destructive',
                onPress: () => {
                  getOrionCompanionMemory().clear();
                  onClearLocalMemory();
                },
              },
            ],
          );
        }}
        style={{ marginTop: 14, paddingVertical: 10, alignItems: 'center' }}
      >
        <Text style={{ color: sub, fontSize: 12, fontWeight: '700' }}>Clear local Orion memory</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
