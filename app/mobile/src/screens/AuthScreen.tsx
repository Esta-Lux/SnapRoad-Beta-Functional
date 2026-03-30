import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

function getPasswordStrength(pw: string): { label: string; color: string; width: string } {
  if (pw.length < 6) return { label: 'Weak', color: '#FF3B30', width: '33%' };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = [pw.length >= 8, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (score >= 3) return { label: 'Strong', color: '#34C759', width: '100%' };
  if (score >= 2) return { label: 'Medium', color: '#FF9500', width: '66%' };
  return { label: 'Weak', color: '#FF3B30', width: '33%' };
}

type Props = {
  route?: { params?: { mode?: 'signin' | 'signup' } };
};

export default function AuthScreen({ route }: Props) {
  const { login, signup, forgotPassword, resendVerification, authError, clearAuthError, isLoading, isAuthSubmitting } = useAuth();
  const { colors } = useTheme();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [resendSending, setResendSending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const pwRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const error = localError || authError;
  const strength = getPasswordStrength(password);

  useEffect(() => {
    const incoming = route?.params?.mode;
    if (incoming === 'signin' || incoming === 'signup') {
      setMode(incoming);
      setLocalError(null);
      setForgotMode(false);
      clearAuthError();
    }
  }, [route?.params?.mode, clearAuthError]);

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalError(null);
    if (mode === 'signup') {
      if (!name.trim()) { setLocalError('Name is required'); return; }
      if (password !== confirmPw) { setLocalError('Passwords do not match'); return; }
      if (password.length < 6) { setLocalError('Password must be at least 6 characters'); return; }
      await signup(name, email, password);
    } else {
      if (!email.trim() || !password) { setLocalError('Email and password required'); return; }
      await login(email, password);
    }
  };

  const handleForgotPassword = async () => {
    setLocalError(null);
    if (!email.trim()) {
      setLocalError('Enter your email to reset password');
      return;
    }
    setForgotSending(true);
    try {
      const res = await forgotPassword(email);
      if (!res.ok) {
        setLocalError(res.message);
        return;
      }
      Alert.alert('Reset Email Sent', res.message);
      setForgotMode(false);
    } finally {
      setForgotSending(false);
    }
  };

  const handleResendVerification = async () => {
    setLocalError(null);
    if (!email.trim()) {
      setLocalError('Enter your email to resend verification');
      return;
    }
    setResendSending(true);
    try {
      const res = await resendVerification(email);
      if (!res.ok) {
        setLocalError(res.message);
        return;
      }
      Alert.alert('Verification Email Sent', res.message);
    } finally {
      setResendSending(false);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Image source={require('../../assets/brand-logo.png')} style={s.logoImage} resizeMode="contain" />
        <Text style={[s.logo, { color: colors.primary }]}>SnapRoad</Text>
        <Text style={[s.headline, { color: colors.textSecondary }]}>Start your journey</Text>

        <View style={[s.tabRow, { backgroundColor: colors.surface }]}>
          {(['signin', 'signup'] as const).map((t) => (
            <TouchableOpacity key={t} style={[s.tab, mode === t && { backgroundColor: colors.primary }]}
              onPress={() => { setMode(t); setLocalError(null); }}>
              <Text style={[s.tabText, { color: mode === t ? '#fff' : colors.textSecondary }]}>
                {t === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(100)} key={`${mode}-${forgotMode ? 'forgot' : 'auth'}`}>
          {mode === 'signup' && !forgotMode && (
            <TextInput style={[s.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Full Name" placeholderTextColor={colors.textTertiary} value={name} onChangeText={setName}
              autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />
          )}
          <TextInput ref={emailRef} style={[s.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Email" placeholderTextColor={colors.textTertiary} value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="next"
            onSubmitEditing={() => forgotMode ? handleForgotPassword() : pwRef.current?.focus()} />
          {!forgotMode && (
            <>
              <View style={s.pwRow}>
                <TextInput ref={pwRef} style={[s.input, { flex: 1, marginBottom: 0, backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="Password" placeholderTextColor={colors.textTertiary} value={password} onChangeText={setPassword}
                  secureTextEntry={!showPw} returnKeyType={mode === 'signup' ? 'next' : 'done'}
                  onSubmitEditing={mode === 'signup' ? () => confirmRef.current?.focus() : handleSubmit} />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(!showPw)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </>
          )}
          {mode === 'signup' && !forgotMode && password.length > 0 && (
            <View style={s.strengthRow}>
              <View style={[s.strengthTrack, { backgroundColor: colors.border }]}>
                <View style={[s.strengthBar, { width: strength.width as any, backgroundColor: strength.color }]} />
              </View>
              <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}
          {mode === 'signup' && !forgotMode && (
            <TextInput ref={confirmRef} style={[s.input, { marginTop: 12, backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Confirm Password" placeholderTextColor={colors.textTertiary} value={confirmPw} onChangeText={setConfirmPw}
              secureTextEntry={!showPw} returnKeyType="done" onSubmitEditing={handleSubmit} />
          )}
        </Animated.View>

        {error && <Text style={[s.error, { color: colors.danger }]}>{error}</Text>}

        <TouchableOpacity onPress={forgotMode ? handleForgotPassword : handleSubmit} disabled={isLoading || isAuthSubmitting || forgotSending || resendSending} activeOpacity={0.85}>
          <LinearGradient colors={[colors.ctaGradientStart, colors.ctaGradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ctaBtn}>
            {(isLoading || isAuthSubmitting || forgotSending || resendSending) ? <ActivityIndicator color="#fff" /> : (
              <Text style={s.ctaText}>
                {forgotMode ? 'Send Reset Email' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {mode === 'signin' && (
          <TouchableOpacity
            style={s.forgotBtn}
            onPress={() => { setForgotMode((prev) => !prev); setLocalError(null); clearAuthError(); }}
          >
            <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
              {forgotMode ? 'Back to sign in' : 'Forgot password?'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={s.forgotBtn}
          onPress={handleResendVerification}
          disabled={resendSending || isLoading || isAuthSubmitting}
        >
          <Text style={{ color: colors.textTertiary, fontSize: 13, opacity: resendSending ? 0.6 : 1 }}>
            Resend verification email
          </Text>
        </TouchableOpacity>

        {!forgotMode && <View style={s.dividerRow}>
          <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={{ color: colors.textTertiary, fontSize: 12, marginHorizontal: 12 }}>or continue with</Text>
          <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
        </View>}

        {!forgotMode && <TouchableOpacity style={[s.googleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.8}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Sign in with Google</Text>
        </TouchableOpacity>}
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 40 },
  logo: { fontSize: 40, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  logoImage: { width: 86, height: 86, alignSelf: 'center', marginBottom: 8 },
  headline: { fontSize: 16, textAlign: 'center', marginBottom: 32 },
  tabRow: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 12, borderWidth: 1 },
  pwRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  eyeBtn: { position: 'absolute', right: 12, padding: 4 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  strengthTrack: { flex: 1, height: 4, borderRadius: 2 },
  strengthBar: { height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '600' },
  error: { fontSize: 13, textAlign: 'center', marginBottom: 12 },
  ctaBtn: { borderRadius: 16, paddingVertical: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  forgotBtn: { marginTop: 12, alignItems: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  googleBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
});
