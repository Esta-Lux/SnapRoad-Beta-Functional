import { Share } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

/** True when the native ExpoClipboard module is linked in this binary. */
function isNativeClipboardAvailable(): boolean {
  try {
    return requireOptionalNativeModule('ExpoClipboard') != null;
  } catch {
    return false;
  }
}

/**
 * Copy text when expo-clipboard is linked; otherwise open the share sheet so the
 * user can copy manually (avoids native crashes on OTA builds without the module).
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) return false;

  if (!isNativeClipboardAvailable()) {
    return false;
  }

  try {
    const { setStringAsync } = await import('expo-clipboard');
    await setStringAsync(value);
    return true;
  } catch (err) {
    if (__DEV__) {
      console.warn('[clipboard] setStringAsync failed:', err);
    }
    return false;
  }
}

export type CopyOrShareResult = 'copied' | 'shared' | 'failed';

/**
 * Prefer clipboard; fall back to Share (never loads clipboard native code when absent).
 */
export async function copyOrShareText(
  text: string,
  options?: { dialogTitle?: string },
): Promise<CopyOrShareResult> {
  const value = text.trim();
  if (!value) return 'failed';

  if (await copyTextToClipboard(value)) {
    return 'copied';
  }

  try {
    const title = options?.dialogTitle ?? 'SnapRoad';
    await Share.share({ message: value, title }, { dialogTitle: options?.dialogTitle ?? 'Copy' });
    return 'shared';
  } catch (err) {
    if (__DEV__) {
      console.warn('[clipboard] share fallback failed:', err);
    }
    return 'failed';
  }
}
