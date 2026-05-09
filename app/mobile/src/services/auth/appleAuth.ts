import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase, supabaseConfigured } from '../../lib/supabase';

export type AppleAuthResult =
  | {
      ok: true;
      accessToken: string;
      refreshToken: string;
      fullName?: string;
      email?: string;
    }
  | {
      ok: false;
      code:
        | 'unavailable'
        | 'cancelled'
        | 'missing_identity_token'
        | 'supabase_not_configured'
        | 'supabase_error'
        | 'network_error'
        | 'unknown_error';
      message: string;
    };

function joinAppleFullName(
  fullName: AppleAuthentication.AppleAuthenticationFullName | null,
): string | undefined {
  if (!fullName) return undefined;
  const given = String(fullName.givenName || '').trim();
  const family = String(fullName.familyName || '').trim();
  const joined = [given, family].filter(Boolean).join(' ').trim();
  return joined || undefined;
}

export async function signInWithAppleNative(): Promise<AppleAuthResult> {
  if (Platform.OS !== 'ios') {
    return {
      ok: false,
      code: 'unavailable',
      message: 'Sign in with Apple is only available on iOS.',
    };
  }
  if (!supabaseConfigured) {
    return {
      ok: false,
      code: 'supabase_not_configured',
      message: 'Apple sign-in is not configured for this build.',
    };
  }

  try {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      return {
        ok: false,
        code: 'unavailable',
        message: 'Sign in with Apple is unavailable on this device.',
      };
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return {
        ok: false,
        code: 'missing_identity_token',
        message: 'Apple sign-in did not return an identity token.',
      };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) {
      const lowered = String(error.message || '').toLowerCase();
      return {
        ok: false,
        code: lowered.includes('network') ? 'network_error' : 'supabase_error',
        message: error.message || 'Apple sign-in failed.',
      };
    }

    const session = data.session ?? (await supabase.auth.getSession()).data.session;
    const accessToken = String(session?.access_token || '').trim();
    const refreshToken = String(session?.refresh_token || '').trim();
    if (!accessToken || !refreshToken) {
      return {
        ok: false,
        code: 'supabase_error',
        message: 'Apple sign-in completed but no Supabase session was returned.',
      };
    }

    const fullName = joinAppleFullName(credential.fullName);
    if (fullName) {
      const metadata = (data.user?.user_metadata || session?.user?.user_metadata || {}) as Record<string, unknown>;
      const existingName = String(metadata.full_name || metadata.name || '').trim();
      if (!existingName) {
        await supabase.auth.updateUser({
          data: { full_name: fullName, name: fullName },
        });
      }
    }

    return {
      ok: true,
      accessToken,
      refreshToken,
      fullName,
      email: credential.email ?? undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Apple sign-in failed.';
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      String((error as { code?: unknown }).code) === 'ERR_REQUEST_CANCELED'
    ) {
      return {
        ok: false,
        code: 'cancelled',
        message: 'Apple sign-in was cancelled.',
      };
    }
    const lowered = message.toLowerCase();
    return {
      ok: false,
      code: lowered.includes('network') ? 'network_error' : 'unknown_error',
      message,
    };
  }
}
