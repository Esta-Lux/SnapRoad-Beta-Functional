import { storage } from './storage';

const GUEST_ID_KEY = 'snaproad_guest_id';

function createGuestId(): string {
  const cryptoLike = globalThis.crypto as { randomUUID?: () => string } | undefined;
  const random =
    typeof cryptoLike?.randomUUID === 'function'
      ? cryptoLike.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `guest_${random}`;
}

export async function getOrCreateGuestId(): Promise<string> {
  const existing = await storage.getStringAsync(GUEST_ID_KEY);
  if (existing && existing.startsWith('guest_')) return existing;
  const next = createGuestId();
  storage.set(GUEST_ID_KEY, next);
  return next;
}

export function getCachedGuestId(): string | undefined {
  return storage.getString(GUEST_ID_KEY);
}
