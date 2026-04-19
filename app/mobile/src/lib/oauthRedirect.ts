import * as Linking from 'expo-linking';

/**
 * Redirect URI sent to Supabase OAuth (`redirect_to`) and to `WebBrowser.openAuthSessionAsync`.
 * Uses the app scheme from app.config (`snaproad`) in release builds; dev client may produce
 * an `exp://` or `exp+snaproad://` URL — add that exact pattern to Supabase → Auth → Redirect URLs.
 */
export function getSupabaseOAuthRedirectTo(): string {
  return Linking.createURL('auth');
}
