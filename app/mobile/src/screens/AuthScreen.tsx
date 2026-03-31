import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { api } from '../api/client';

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
  navigation: { navigate: (name: string, params?: object) => void; goBack: () => void };
  route?: { params?: { mode?: 'signin' | 'signup' } };
};

export default function AuthScreen({ navigation, route }: Props) {
  const initialMode = route?.params?.mode === 'signup' ? 'signup' : 'signin';
  const { login, signup, authError, clearAuthError, isLoading, isAuthSubmitting, setUserFromApi } = useAuth();
  const { colors } = useTheme();

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const pwRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const error = localError || authError;
  const strength = getPasswordStrength(password);

  const resetForm = useCallback(() => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPw('');
    setShowPw(false);
    setLocalError(null);
    clearAuthError();
  }, [clearAuthError]);

  useFocusEffect(
    useCallback(() => {
      resetForm();
    }, [resetForm]),
  );

  const switchMode = (next: 'signin' | 'signup') => {
    if (next === mode) return;
    resetForm();
    setMode(next);
  };

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalError(null);
    if (mode === 'signup') {
      if (!name.trim()) { setLocalError('Name is required'); return; }
      if (!email.trim()) { setLocalError('Email is required'); return; }
      if (password.length < 6) { setLocalError('Password must be at least 6 characters'); return; }
      if (password !== confirmPw) { setLocalError('Passwords do not match'); return; }
      await signup(name, email, password);
    } else {
      if (!email.trim() || !password) { setLocalError('Email and password required'); return; }
      await login(email, password);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setGoogleLoading(true);
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'snaproad://auth',
          skipBrowserRedirect: false,
        },
      });
      if (oauthError) throw new Error(oauthError.message);
      if (!data?.url) throw new Error('No OAuth URL returned');
      const { Linking } = require('react-native');
      await Linking.openURL(data.url);
    } catch (e: any) {
      setLocalError(e?.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={s.backRow}
            onPress={() => navigation.navigate('Welcome')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary} style={s.backIcon} />
            <Text style={[s.backText, { color: colors.primary }]}>Home</Text>
          </TouchableOpacity>

          <Image source={require('../../assets/brand-logo.png')} style={s.logoImage} resizeMode="contain" />
          <Text style={[s.logo, { color: colors.primary }]}>SnapRoad</Text>
          <Text style={[s.subline, { color: colors.textSecondary }]}>Start your journey</Text>

          {/* Mode toggle */}
          <View style={[s.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[s.toggleBtn, mode === 'signin' && { backgroundColor: colors.primary }]}
              onPress={() => switchMode('signin')}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, { color: mode === 'signin' ? '#fff' : colors.textSecondary }]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, mode === 'signup' && { backgroundColor: colors.primary }]}
              onPress={() => switchMode('signup')}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, { color: mode === 'signup' ? '#fff' : colors.textSecondary }]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {mode === 'signup' && (
            <TextInput
              testID="e2e-auth-name"
              style={[s.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Full Name"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          )}
          <TextInput
            ref={emailRef}
            testID="e2e-auth-email"
            style={[s.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Email"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => pwRef.current?.focus()}
          />
          <View style={s.pwRow}>
            <TextInput
              ref={pwRef}
              testID="e2e-auth-password"
              style={[s.input, { flex: 1, marginBottom: 0, backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              returnKeyType={mode === 'signup' ? 'next' : 'done'}
              onSubmitEditing={mode === 'signup' ? () => confirmRef.current?.focus() : handleSubmit}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(!showPw)}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {mode === 'signup' && password.length > 0 && (
            <View style={s.strengthRow}>
              <View style={[s.strengthTrack, { backgroundColor: colors.border }]}>
                <View style={[s.strengthBar, { width: strength.width as any, backgroundColor: strength.color }]} />
              </View>
              <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}

          {mode === 'signup' && (
            <TextInput
              ref={confirmRef}
              style={[s.input, { marginTop: 12, backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Confirm Password"
              placeholderTextColor={colors.textTertiary}
              value={confirmPw}
              onChangeText={setConfirmPw}
              secureTextEntry={!showPw}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          )}

          {error ? <Text style={[s.error, { color: colors.danger }]}>{error}</Text> : null}

          <TouchableOpacity
            testID="e2e-auth-submit"
            onPress={handleSubmit}
            disabled={isLoading || isAuthSubmitting}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.ctaGradientStart, colors.ctaGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.ctaBtn}
            >
              {isLoading || isAuthSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.ctaText}>{mode === 'signup' ? 'Create Account' : 'Sign In'}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {mode === 'signin' && (
            <TouchableOpacity style={s.linkBtn} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={{ color: colors.textTertiary, fontSize: 14 }}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          <View style={s.dividerRow}>
            <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={{ color: colors.textTertiary, fontSize: 12, marginHorizontal: 12 }}>or continue with</Text>
            <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity
            style={[s.googleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Sign in with Google</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40, paddingTop: 4 },
  backRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 12 },
  backIcon: { marginRight: 4 },
  backText: { fontSize: 16, fontWeight: '600' },
  logo: { fontSize: 36, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  logoImage: { width: 72, height: 72, alignSelf: 'center', marginBottom: 6 },
  subline: { fontSize: 15, textAlign: 'center', marginBottom: 20, marginTop: 2 },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleText: { fontSize: 14, fontWeight: '700' },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 12, borderWidth: 1 },
  pwRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  eyeBtn: { position: 'absolute', right: 12, padding: 4 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  strengthTrack: { flex: 1, height: 4, borderRadius: 2 },
  strengthBar: { height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '600', marginLeft: 8 },
  error: { fontSize: 13, textAlign: 'center', marginBottom: 12 },
  ctaBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  linkBtn: { marginTop: 16, alignItems: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  googleBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
});
