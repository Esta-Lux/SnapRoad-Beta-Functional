import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { parseParamsFromUrl } from '../utils/deepLinks';

type Props = {
  navigation: { navigate: (name: string, params?: object) => void };
};

export default function ResetPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const bg = colors.background;
  const card = colors.card;
  const text = colors.text;
  const sub = colors.textSecondary;

  const verifyRecoveryLink = async (url: string) => {
    const p = parseParamsFromUrl(url);
    const tokenHash = p.token_hash || p.token;
    const type = p.type;
    const accessToken = p.access_token;
    const refreshToken = p.refresh_token;

    try {
      if (tokenHash && type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
        if (error) throw error;
        setReady(true);
        return;
      }

      if (accessToken && refreshToken) {
        if (type === 'signup' || type === 'email') {
          setLinkError('This link confirms signup, not a password reset. Use “Request a new reset link” below.');
          return;
        }
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) throw error;
        setReady(true);
        return;
      }

      setLinkError('Reset link is invalid or incomplete. Request a new password reset email.');
    } catch (e: any) {
      setLinkError(e?.message || 'Could not verify reset link. Request a new password reset email.');
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const initial = await Linking.getInitialURL();
      if (!alive) return;
      if (initial) {
        await verifyRecoveryLink(initial);
      } else {
        setLinkError(
          'Open this screen by tapping the password reset link in your email (it opens SnapRoad). If the link expired, request a new one below.',
        );
      }
    })();
    const sub = Linking.addEventListener('url', (event: { url: string }) => {
      verifyRecoveryLink(event.url);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const canSubmit = useMemo(
    () => ready && password.length >= 6 && confirm.length >= 6 && !loading,
    [ready, password, confirm, loading],
  );
  const passwordsMatch = password.length >= 6 && confirm.length >= 6 && password === confirm;

  const onSave = async () => {
    if (password !== confirm) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert('Reset failed', error.message || 'Could not reset password.');
        return;
      }
      Alert.alert('Password updated', 'Your password has been reset. Please sign in.');
      navigation.navigate('Auth', { mode: 'signin' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.inner}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('ForgotPassword')} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={18} color="#374151" />
        </TouchableOpacity>

        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Ionicons name="navigate" size={18} color="#fff" />
          </View>
          <Text style={styles.brandText}>SnapRoad</Text>
        </View>

        <Text style={[styles.title, { color: text }]}>Set a new{'\n'}password.</Text>
        <Text style={[styles.subtitle, { color: sub }]}>Choose something strong and memorable.</Text>

        <View style={[styles.card, { backgroundColor: card }]}>
          {linkError ? (
            <>
              <Text style={styles.error}>{linkError}</Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.secondaryBtnText}>Request a new reset link</Text>
              </TouchableOpacity>
            </>
          ) : !ready ? (
            <View style={styles.center}>
              <ActivityIndicator color="#3B82F6" />
              <Text style={[styles.loadingText, { color: sub }]}>Verifying reset link...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.label}>New password</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: text, backgroundColor: colors.surface }]}
                placeholder="Create a new password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <View style={styles.strengthBar}>
                {[0, 1, 2, 3].map((segment) => (
                  <View
                    key={segment}
                    style={[
                      styles.strengthSegment,
                      segment < Math.min(4, Math.max(1, Math.floor(password.length / 3))) && password.length > 0 && styles.strengthSegmentFilled,
                    ]}
                  />
                ))}
              </View>

              <Text style={[styles.label, { marginTop: 14 }]}>Confirm new password</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: text, backgroundColor: colors.surface }]}
                placeholder="Confirm your password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
              />

              {passwordsMatch && (
                <View style={styles.successBox}>
                  <View style={styles.successIcon}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                  <Text style={styles.successText}>Passwords match. You&apos;re good to go.</Text>
                </View>
              )}

              <TouchableOpacity style={[styles.saveBtn, !canSubmit && { opacity: 0.6 }]} disabled={!canSubmit} onPress={onSave}>
                <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Update Password'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, justifyContent: 'center' },
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
  card: {
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
  title: { fontSize: 30, lineHeight: 33, fontWeight: '600', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, marginTop: 8, marginBottom: 28, lineHeight: 23, fontWeight: '300' },
  label: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 10 },
  strengthBar: { flexDirection: 'row', gap: 4, marginTop: 2 },
  strengthSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  strengthSegmentFilled: { backgroundColor: '#43A047' },
  saveBtn: { backgroundColor: '#43A047', borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  center: { alignItems: 'center', paddingVertical: 10 },
  loadingText: { fontSize: 12, marginTop: 8 },
  error: { color: '#EF4444', fontSize: 13, marginBottom: 6, lineHeight: 19 },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.5)',
  },
  secondaryBtnText: { color: '#3B82F6', fontSize: 15, fontWeight: '600' },
  successBox: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  successIcon: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#43A047',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: { flex: 1, color: '#1B5E20', fontSize: 13, lineHeight: 19 },
});

