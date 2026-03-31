import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';

type Props = {
  navigation: { goBack: () => void; navigate: (name: string, params?: object) => void };
};

function recoveryRedirectUrl(): string {
  const scheme = String(Constants.expoConfig?.scheme || 'snaproad').replace(/\/$/, '');
  return `${scheme}://reset-password`;
}

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const urlConfigured = Boolean(Constants.expoConfig?.extra && (Constants.expoConfig.extra as { supabaseUrl?: string }).supabaseUrl);

  const sendRecovery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setLocalError('Enter your email address');
      return;
    }
    if (!urlConfigured) {
      setLocalError('App is missing Supabase configuration.');
      return;
    }
    setSending(true);
    try {
      const redirectTo = recoveryRedirectUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (error) {
        setLocalError(error.message || 'Could not send reset email');
        return;
      }
      Alert.alert(
        'Check your email',
        'We sent a password reset link. Open it on this device to choose a new password in the app.',
        [{ text: 'OK', onPress: () => navigation.navigate('Auth', { mode: 'signin' }) }],
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>Reset password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your email. We will send a link that opens SnapRoad so you can set a new password here — not a signup
            verification email.
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Email"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={sendRecovery}
          />

          {localError ? <Text style={[styles.error, { color: colors.danger }]}>{localError}</Text> : null}

          <TouchableOpacity onPress={sendRecovery} disabled={sending} activeOpacity={0.85}>
            <LinearGradient
              colors={[colors.ctaGradientStart, colors.ctaGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaBtn}
            >
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Send reset link</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryLink} onPress={() => navigation.navigate('Auth', { mode: 'signin' })}>
            <Text style={{ color: colors.textTertiary, fontSize: 14 }}>Return to sign in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 32, paddingTop: 8 },
  backRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 20, gap: 4 },
  backText: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 10 },
  subtitle: { fontSize: 14, lineHeight: 21, marginBottom: 24 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  error: { fontSize: 13, marginBottom: 8, textAlign: 'center' },
  ctaBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondaryLink: { marginTop: 20, alignItems: 'center' },
});
