import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

import {
  legalDocumentPath,
  transformApiUrlToWebsiteBase,
  type LegalDocSlug,
} from './legalUrls';

/**
 * Open the public Terms of Service or Privacy Policy in an in-app browser.
 *
 * Required by Apple to be reachable from any IAP paywall. We open in a
 * SFSafariViewController-style sheet (`WebBrowser.openBrowserAsync`) so the
 * user can read and dismiss without leaving the app — falls back to the
 * default browser via `Linking.openURL` when the in-app browser isn't
 * available (e.g. older Android dev clients).
 *
 * URL is derived from the configured API base host: replace `api.` with
 * `app.` so `https://api.snaproad.app` → `https://app.snaproad.app/terms`.
 * Falls back to DEFAULT_LEGAL_WEBSITE_BASE when the host can't be
 * confidently transformed (see `transformApiUrlToWebsiteBase` in
 * `./legalUrls.ts`).
 */

export type { LegalDocSlug } from './legalUrls';

function resolveWebsiteBase(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return transformApiUrlToWebsiteBase(extra?.apiUrl);
}

export function buildLegalDocumentUrl(slug: LegalDocSlug): string {
  return `${resolveWebsiteBase()}${legalDocumentPath(slug)}`;
}

/**
 * Imperatively open the legal doc in an in-app browser. Returns a Promise
 * that resolves once the user dismisses the browser.
 */
export async function openLegalDocumentExternally(slug: LegalDocSlug): Promise<boolean> {
  const url = buildLegalDocumentUrl(slug);
  try {
    if (Platform.OS === 'web') {
      await Linking.openURL(url);
      return true;
    }
    await WebBrowser.openBrowserAsync(url, {
      controlsColor: '#0A84FF',
      dismissButtonStyle: 'close',
    });
    return true;
  } catch (e) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      console.warn('[Legal] open failed', e);
      return false;
    }
  }
}
