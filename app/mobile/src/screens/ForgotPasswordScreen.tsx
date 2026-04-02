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
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

type Props = {
  navigation: { goBack: () => void; navigate: (name: string, params?: object) => void };
};

function recoveryRedirectUrl(): string {
  const scheme = String(Constants.expoConfig?.scheme || 'snaproad').replace(/\/$/, '');
  return `${scheme}://reset-password`;
}

export default function ForgotPasswordScreen({ navigation }: Props) {
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={18} color="#374151" />
          </TouchableOpacity>

          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Ionicons name="navigate" size={18} color="#fff" />
            </View>
            <Text style={styles.brandText}>SnapRoad</Text>
          </View>

          <Text style={styles.title}>Forgot your{'\n'}password?</Text>
          <Text style={styles.subtitle}>
            No worries. We&apos;ll send a recovery link to the email address linked to your SnapRoad account.
          </Text>

          <View style={styles.card}>
            <View style={styles.infoBox}>
              <View style={styles.infoIcon}>
                <Ionicons name="information-outline" size={12} color="#fff" />
              </View>
              <Text style={styles.infoText}>
                Enter the email address linked to your account and we&apos;ll send you a secure link that opens directly in the app.
              </Text>
            </View>

            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#C4C9D4"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={sendRecovery}
            />

            {localError ? <Text style={styles.error}>{localError}</Text> : null}

            <TouchableOpacity style={styles.ctaBtn} onPress={sendRecovery} disabled={sending} activeOpacity={0.9}>
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Send Recovery Link</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Remembered it?{' '}
              <Text style={styles.footerLink} onPress={() => navigation.navigate('Auth', { mode: 'signin' })}>
                Back to sign in
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1A6FD4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brandText: { color: '#0D1117', fontSize: 22, fontWeight: '700' },
  title: { fontSize: 30, lineHeight: 33, fontWeight: '600', color: '#0D1117', marginBottom: 8, letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 23, marginBottom: 28, color: '#6B7280', fontWeight: '300' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderRadius: 14,
    backgroundColor: '#E8F1FB',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  infoIcon: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#1A6FD4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  infoText: { flex: 1, color: '#0D4A9A', fontSize: 13, lineHeight: 19 },
  label: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    color: '#0D1117',
  },
  error: { fontSize: 13, marginBottom: 8, textAlign: 'center', color: '#DC2626' },
  ctaBtn: {
    borderRadius: 999,
    paddingVertical: 16,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: '#1A6FD4',
    shadowColor: '#1A6FD4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 6,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { paddingVertical: 20, alignItems: 'center' },
  footerText: { color: '#6B7280', fontSize: 14 },
  footerLink: { color: '#1A6FD4', fontWeight: '700' },
});
