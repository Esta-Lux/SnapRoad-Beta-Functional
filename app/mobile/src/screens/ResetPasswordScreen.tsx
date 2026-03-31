import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';

type Props = {
  navigation: { navigate: (name: string, params?: object) => void };
};

function parseParamsFromUrl(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const [basePart, hashPart] = url.split('#');
  const queryIndex = basePart.indexOf('?');
  const queryPart = queryIndex >= 0 ? basePart.slice(queryIndex + 1) : '';

  const ingest = (part: string) => {
    if (!part) return;
    for (const pair of part.split('&')) {
      const [k, v] = pair.split('=');
      if (!k) continue;
      out[decodeURIComponent(k)] = decodeURIComponent(v || '');
    }
  };

  ingest(queryPart);
  ingest(hashPart || '');
  return out;
}

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
      <View style={[styles.card, { backgroundColor: card }]}>
        <Text style={[styles.title, { color: text }]}>Reset Password</Text>
        <Text style={[styles.subtitle, { color: sub }]}>Set a new password for your SnapRoad account.</Text>

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
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: text, backgroundColor: colors.surface }]}
              placeholder="New password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: text, backgroundColor: colors.surface }]}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
            />
            <TouchableOpacity style={[styles.saveBtn, !canSubmit && { opacity: 0.6 }]} disabled={!canSubmit} onPress={onSave}>
              <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save New Password'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  card: { borderRadius: 16, padding: 18 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 6, marginBottom: 14 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 10 },
  saveBtn: { backgroundColor: '#007AFF', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  center: { alignItems: 'center', paddingVertical: 10 },
  loadingText: { fontSize: 12, marginTop: 8 },
  error: { color: '#EF4444', fontSize: 13, marginBottom: 6 },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.5)',
  },
  secondaryBtnText: { color: '#3B82F6', fontSize: 15, fontWeight: '600' },
});

