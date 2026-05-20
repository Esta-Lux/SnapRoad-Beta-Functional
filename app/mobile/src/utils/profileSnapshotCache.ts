/**
 * Persist the last known authenticated profile so cold start works offline
 * when the JWT is still valid but /api/user/profile bootstrap cannot reach the server.
 */
import * as SecureStore from 'expo-secure-store';

const PROFILE_SNAPSHOT_KEY = 'snaproad_user_profile_v1';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

type Snapshot = {
  user: Record<string, unknown>;
  savedAtMs: number;
};

export async function persistProfileSnapshot(apiUser: Record<string, unknown>): Promise<void> {
  const id = String(apiUser.id ?? '').trim();
  if (!id) return;
  const snapshot: Snapshot = { user: apiUser, savedAtMs: Date.now() };
  try {
    await SecureStore.setItemAsync(PROFILE_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    /* optional */
  }
}

export async function loadProfileSnapshot(): Promise<Record<string, unknown> | null> {
  try {
    const raw = await SecureStore.getItemAsync(PROFILE_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot;
    if (!parsed?.user || typeof parsed.user !== 'object') return null;
    if (Date.now() - Number(parsed.savedAtMs) > TTL_MS) return null;
    const id = String(parsed.user.id ?? '').trim();
    return id ? parsed.user : null;
  } catch {
    return null;
  }
}

export async function clearProfileSnapshot(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PROFILE_SNAPSHOT_KEY);
  } catch {
    /* optional */
  }
}
