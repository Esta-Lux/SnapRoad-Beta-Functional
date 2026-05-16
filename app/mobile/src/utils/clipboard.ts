/**
 * Safe clipboard helper — defers loading expo-clipboard so Invite Drivers does not
 * crash on binaries built before that native module was linked (OTA-only updates).
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) return false;
  try {
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(value);
    return true;
  } catch (err) {
    if (__DEV__) {
      console.warn('[clipboard] copy failed (native module missing or unavailable):', err);
    }
    return false;
  }
}
