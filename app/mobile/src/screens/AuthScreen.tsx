import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../contexts/AuthContext';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { getSupabaseOAuthRedirectTo } from '../lib/oauthRedirect';
import { friendlySupabaseAuthErrorMessage, parseParamsFromUrl } from '../utils/deepLinks';
import { signInWithAppleNative } from '../services/auth/appleAuth';

function getPasswordStrength(pw: string): { label: string; color: string; level: number } {
  if (pw.length < 6) return { label: 'Weak password', color: '#EF4444', level: 1 };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = [pw.length >= 8, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (score >= 4) return { label: 'Very strong', color: '#2E7D32', level: 4 };
  if (score >= 3) return { label: 'Strong password', color: '#43A047', level: 3 };
  if (score >= 2) return { label: 'Medium strength', color: '#F59E0B', level: 2 };
  return { label: 'Weak password', color: '#EF4444', level: 1 };
}

type Props = {
  navigation: { navigate: (name: string, params?: object) => void; goBack: () => void };
  route?: { params?: { mode?: 'signin' | 'signup'; referral_code?: string } };
};

const PALETTE = {
  bg: '#F8FAFB',
  card: '#FFFFFF',
  text: '#0D1117',
  muted: '#6B7280',
  placeholder: '#C4C9D4',
  border: 'rgba(0,0,0,0.08)',
  inputBorder: '#E5E7EB',
  inputBg: '#FAFAFA',
  blue: '#1A6FD4',
  blueDark: '#0D4A9A',
  blueLight: '#E8F1FB',
  green: '#2E7D32',
  greenMid: '#43A047',
  greenLight: '#E8F5E9',
} as const;

export default function AuthScreen({ navigation, route }: Props) {
  const initialMode = route?.params?.mode === 'signup' ? 'signup' : 'signin';
  const { login, signup, authError, clearAuthError, isLoading, isAuthSubmitting, completeOAuthSignIn } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const dobRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const pwRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const error = localError || authError;
  const strength = getPasswordStrength(password);

  useEffect(() => {
    const routeMode = route?.params?.mode === 'signup' ? 'signup' : 'signin';
    setMode(routeMode);
  }, [route?.params?.mode]);

  const resetForm = useCallback(() => {
    setFirstName('');
    setLastName('');
    setDateOfBirth('');
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
      if (!firstName.trim()) { setLocalError('First name is required'); return; }
      if (!lastName.trim()) { setLocalError('Last name is required'); return; }
      if (!dateOfBirth.trim()) { setLocalError('Date of birth is required'); return; }
      if (!email.trim()) { setLocalError('Email is required'); return; }
      if (password.length < 6) { setLocalError('Password must be at least 6 characters'); return; }
      if (password !== confirmPw) { setLocalError('Passwords do not match'); return; }
      await signup(
        `${firstName.trim()} ${lastName.trim()}`,
        email,
        password,
        dateOfBirth,
        route?.params?.referral_code,
      );
    } else {
      if (!email.trim() || !password) { setLocalError('Email and password required'); return; }
      await login(email, password);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    if (mode === 'signup') {
      setLocalError('Use email signup to complete age verification before signing in with Google.');
      return;
    }
    if (!supabaseConfigured) {
      Alert.alert(
        'App configuration',
        'Google sign-in needs your real Supabase project in this build. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in Expo → Environment variables for the production profile (or local .env), then create a new build or OTA update.',
      );
      return;
    }
    setGoogleLoading(true);
    const redirectTo = getSupabaseOAuthRedirectTo();
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (oauthError) throw new Error(oauthError.message);
      if (!data?.url) throw new Error('No OAuth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type !== 'success' || !result.url) {
        if (result.type === 'cancel' || result.type === 'dismiss') return;
        throw new Error('Google sign-in did not complete.');
      }

      const params = parseParamsFromUrl(result.url);
      if (params.error) {
        const desc = params.error_description || params.error;
        throw new Error(desc || params.error);
      }

      if (params.code) {
        const { data: exchanged, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(params.code);
        if (exchangeErr) throw new Error(exchangeErr.message);
        const session = exchanged?.session;
        if (session?.access_token && session?.refresh_token) {
          const fin = await completeOAuthSignIn(session.access_token, session.refresh_token);
          if (!fin.ok && fin.message) setLocalError(fin.message);
        }
        return;
      }

      const accessToken = params.access_token || '';
      const refreshToken = params.refresh_token || '';
      if (accessToken && refreshToken) {
        const fin = await completeOAuthSignIn(accessToken, refreshToken);
        if (!fin.ok && fin.message) setLocalError(fin.message);
        return;
      }

      throw new Error('Google sign-in returned no authorization code. Check Supabase Redirect URLs include: ' + redirectTo);
    } catch (e: unknown) {
      const raw = String(e instanceof Error ? e.message : e || '');
      let friendly: string;
      if (/provider is not enabled|unsupported provider/i.test(raw)) {
        friendly =
          'Google sign-in is not available right now. Please use email sign-in, or contact support if this keeps happening.';
      } else if (/invalid\s*api\s*key/i.test(raw)) {
        friendly = friendlySupabaseAuthErrorMessage(raw);
      } else {
        friendly = 'Google sign-in is not available right now. Please sign in with email or try again later.';
      }
      setLocalError(friendly);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLocalError(null);
    if (mode === 'signup') {
      setLocalError('Use email signup to complete age verification before signing in with Apple.');
      return;
    }
    setAppleLoading(true);
    try {
      const result = await signInWithAppleNative();
      if (!result.ok) {
        if (result.code === 'cancelled') return;
        if (result.code === 'unavailable') {
          setLocalError('Sign in with Apple is unavailable on this device.');
          return;
        }
        if (result.code === 'missing_identity_token') {
          setLocalError('Apple sign-in did not return a valid identity token. Please try again.');
          return;
        }
        if (result.code === 'supabase_not_configured') {
          setLocalError(
            'Apple sign-in is not configured in this build yet. Please update Supabase config and rebuild.',
          );
          return;
        }
        if (result.code === 'network_error') {
          setLocalError('Network error while signing in with Apple. Check your connection and retry.');
          return;
        }
        setLocalError(
          friendlySupabaseAuthErrorMessage(result.message || 'Apple sign-in is not available right now.'),
        );
        return;
      }

      const fin = await completeOAuthSignIn(result.accessToken, result.refreshToken);
      if (!fin.ok && fin.message) setLocalError(fin.message);
    } catch (e: unknown) {
      const raw = String(e instanceof Error ? e.message : e || '');
      if (/network|timed?\s*out|timeout/i.test(raw)) {
        setLocalError('Network error while signing in with Apple. Please try again.');
      } else {
        setLocalError('Apple sign-in is not available right now. Please sign in with email or try again later.');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={s.backButton}
            onPress={() => navigation.navigate('Welcome')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={18} color="#374151" />
          </TouchableOpacity>

          <View style={s.brandRow}>
            <View style={s.brandMarkWrap}>
              <Image source={require('../../assets/brand-logo.png')} style={s.brandLogo} resizeMode="contain" />
            </View>
            <Text style={s.brandText}>SnapRoad</Text>
          </View>

          <Text style={s.title}>{mode === 'signup' ? 'Join\nSnapRoad.' : 'Welcome\nback.'}</Text>
          <Text style={s.subtitle}>
            {mode === 'signup'
              ? 'Create your free account today'
              : 'Sign in to continue your journey'}
          </Text>

          <View style={s.card}>
            <View style={s.socialRow}>
              <TouchableOpacity
                style={s.socialBtn}
                activeOpacity={0.85}
                onPress={handleGoogleSignIn}
                disabled={googleLoading || appleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator color={PALETTE.text} size="small" />
                ) : (
                  <>
                    <Text style={s.googleGlyph}>G</Text>
                    <Text style={s.socialBtnText}>
                      {mode === 'signup' ? 'Google sign-in' : 'Continue with Google'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {Platform.OS === 'ios' && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={14}
                  style={s.appleBtn}
                  onPress={() => {
                    if (appleLoading || googleLoading) return;
                    void handleAppleSignIn();
                  }}
                />
              )}
            </View>

            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or email</Text>
              <View style={s.dividerLine} />
            </View>

            {mode === 'signup' && (
              <View style={s.row}>
                <View style={s.rowField}>
                  <Text style={s.label}>First name</Text>
                  <TextInput
                    ref={firstNameRef}
                    testID="e2e-auth-name"
                    style={s.input}
                    placeholder="Jane"
                    placeholderTextColor={PALETTE.placeholder}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => lastNameRef.current?.focus()}
                  />
                </View>
                <View style={s.rowField}>
                  <Text style={s.label}>Last name</Text>
                  <TextInput
                    ref={lastNameRef}
                    style={s.input}
                    placeholder="Smith"
                    placeholderTextColor={PALETTE.placeholder}
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />
                </View>
              </View>
            )}

            <Text style={s.label}>Email address</Text>
            <TextInput
              ref={emailRef}
              testID="e2e-auth-email"
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor={PALETTE.placeholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => mode === 'signup' ? dobRef.current?.focus() : pwRef.current?.focus()}
            />

            {mode === 'signup' && (
              <>
                <Text style={s.label}>Date of birth</Text>
                <TextInput
                  ref={dobRef}
                  style={s.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={PALETTE.placeholder}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  autoCapitalize="none"
                  keyboardType="numbers-and-punctuation"
                  returnKeyType="next"
                  onSubmitEditing={() => pwRef.current?.focus()}
                />
              </>
            )}

            <Text style={s.label}>Password</Text>
            <View style={s.inputWithIcon}>
              <TextInput
                ref={pwRef}
                testID="e2e-auth-password"
                style={[s.input, s.inputPassword]}
                placeholder={mode === 'signup' ? 'Create a strong password' : 'Enter your password'}
                placeholderTextColor={PALETTE.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                returnKeyType={mode === 'signup' ? 'next' : 'done'}
                onSubmitEditing={mode === 'signup' ? () => confirmRef.current?.focus() : handleSubmit}
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw((prev) => !prev)} activeOpacity={0.8}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={PALETTE.muted} />
              </TouchableOpacity>
            </View>

            {mode === 'signin' && (
              <TouchableOpacity style={s.forgotLink} onPress={() => navigation.navigate('ForgotPassword')} activeOpacity={0.85}>
                <Text style={s.forgotLinkText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {mode === 'signup' && password.length > 0 && (
              <>
                <View style={s.strengthBar}>
                  {[0, 1, 2, 3].map((segment) => (
                    <View
                      key={segment}
                      style={[
                        s.strengthSegment,
                        segment < strength.level && { backgroundColor: strength.color },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[s.strengthText, { color: strength.color }]}>{strength.label}</Text>
              </>
            )}

            {mode === 'signup' && (
              <>
                <Text style={s.label}>Confirm password</Text>
                <View style={s.inputWithIcon}>
                  <TextInput
                    ref={confirmRef}
                    style={[s.input, s.inputPassword]}
                    placeholder="Confirm your password"
                    placeholderTextColor={PALETTE.placeholder}
                    value={confirmPw}
                    onChangeText={setConfirmPw}
                    secureTextEntry={!showPw}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                </View>
              </>
            )}

            {mode === 'signup' && (
              <View style={s.infoBox}>
                <View style={s.infoIcon}>
                  <Ionicons name="information-outline" size={12} color="#fff" />
                </View>
                <Text style={s.infoText}>
                  Use email to create a new driver account so SnapRoad can complete age verification. Google is available for existing accounts.
                </Text>
              </View>
            )}

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              testID="e2e-auth-submit"
              style={[s.submitBtn, mode === 'signup' && s.submitBtnSignup]}
              onPress={handleSubmit}
              disabled={isLoading || isAuthSubmitting}
              activeOpacity={0.9}
            >
              {isLoading || isAuthSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitText}>{mode === 'signup' ? 'Create Account' : 'Sign In'}</Text>
              )}
            </TouchableOpacity>

            {mode === 'signup' && (
              <Text style={s.termsText}>
                By creating an account you agree to our Terms of Service and Privacy Policy. You must be 16 or older to use SnapRoad.
              </Text>
            )}
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>
              {mode === 'signup' ? 'Already have an account? ' : 'New to SnapRoad? '}
              <Text style={s.footerLink} onPress={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}>
                {mode === 'signup' ? 'Sign in' : 'Create account'}
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: PALETTE.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  brandMarkWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PALETTE.blue,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 10,
  },
  brandLogo: { width: 24, height: 24 },
  brandText: { color: PALETTE.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  title: {
    color: PALETTE.text,
    fontSize: 30,
    lineHeight: 33,
    fontWeight: '600',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subtitle: {
    color: PALETTE.muted,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 28,
    fontWeight: '300',
  },
  card: {
    backgroundColor: PALETTE.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: PALETTE.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  socialRow: { marginBottom: 20, gap: 10 },
  socialBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: PALETTE.inputBorder,
    backgroundColor: '#fff',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  googleGlyph: {
    color: PALETTE.blue,
    fontSize: 18,
    fontWeight: '700',
  },
  socialBtnText: {
    color: PALETTE.text,
    fontSize: 13,
    fontWeight: '600',
  },
  appleBtn: {
    width: '100%',
    height: 52,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: PALETTE.inputBorder },
  dividerText: { color: PALETTE.muted, fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  rowField: { flex: 1 },
  label: {
    color: PALETTE.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: PALETTE.inputBorder,
    backgroundColor: PALETTE.inputBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: PALETTE.text,
    marginBottom: 16,
  },
  inputWithIcon: { position: 'relative' },
  inputPassword: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotLink: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 16 },
  forgotLinkText: { color: PALETTE.blue, fontSize: 13, fontWeight: '600' },
  strengthBar: { flexDirection: 'row', gap: 4, marginTop: -6, marginBottom: 6 },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  strengthText: { fontSize: 11, fontWeight: '600', marginBottom: 14 },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderRadius: 14,
    backgroundColor: PALETTE.blueLight,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  infoIcon: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: PALETTE.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    color: PALETTE.blueDark,
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  submitBtn: {
    borderRadius: 999,
    backgroundColor: PALETTE.blue,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PALETTE.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 6,
    marginTop: 4,
  },
  submitBtnSignup: {
    backgroundColor: PALETTE.greenMid,
    shadowColor: PALETTE.green,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  termsText: {
    color: PALETTE.muted,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 16,
  },
  footer: { paddingVertical: 20, alignItems: 'center' },
  footerText: { color: PALETTE.muted, fontSize: 14 },
  footerLink: { color: PALETTE.blue, fontWeight: '700' },
});
