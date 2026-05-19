import { storage } from '../../utils/storage';
import {
  CATEGORY_COOLDOWN_MS,
  ORION_COMPANION_MEMORY_KEY,
  ORION_COMPANION_MEMORY_MAX,
} from './constants';
import type { OrionCompanionResult, OrionMemoryEntry, OrionMessageCategory } from './types';
import { normalizeMessageKey } from './templateFill';

export type OrionMemoryStore = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
};

export class OrionMemoryEngine {
  private entries: OrionMemoryEntry[] = [];

  constructor(
    private readonly store: OrionMemoryStore = storage,
    private readonly storageKey: string = ORION_COMPANION_MEMORY_KEY,
  ) {
    this.hydrateFromStore();
  }

  private hydrateFromStore(): void {
    try {
      const raw = this.store.getString(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { entries?: OrionMemoryEntry[] };
      if (Array.isArray(parsed.entries)) {
        this.entries = parsed.entries.slice(-ORION_COMPANION_MEMORY_MAX).map((entry) => ({
          ...entry,
          normalizedText: entry.normalizedText ?? normalizeMessageKey(entry.message),
        }));
      }
    } catch {
      this.entries = [];
    }
  }

  private persist(): void {
    try {
      this.store.set(this.storageKey, JSON.stringify({ entries: this.entries }));
    } catch {
      /* ignore persistence failures */
    }
  }

  getEntries(): readonly OrionMemoryEntry[] {
    return this.entries;
  }

  loadEntries(entries: OrionMemoryEntry[]): void {
    this.entries = entries.slice(-ORION_COMPANION_MEMORY_MAX).map((entry) => ({
      ...entry,
      normalizedText: entry.normalizedText ?? normalizeMessageKey(entry.message),
    }));
  }

  clear(): void {
    this.entries = [];
    this.persist();
  }

  lastSpokenAtMs(): number {
    const last = this.entries.at(-1);
    return last?.timestampMs ?? 0;
  }

  isDuplicateMessage(text: string): boolean {
    const key = normalizeMessageKey(text);
    if (!key) return true;
    return this.entries.some((e) => (e.normalizedText ?? normalizeMessageKey(e.message)) === key);
  }

  hasVariantInTrip(variantId: string | null | undefined, tripId: string | null | undefined): boolean {
    if (!variantId || !tripId) return false;
    return this.entries.some((e) => e.variantId === variantId && e.tripId === tripId);
  }

  lastUsedVariantAt(variantId: string): number {
    for (let i = this.entries.length - 1; i >= 0; i -= 1) {
      const e = this.entries[i];
      if (e.variantId === variantId) return e.timestampMs;
    }
    return 0;
  }

  recentlyUsedPattern(
    eventType: OrionCompanionResult['eventType'],
    mood: OrionCompanionResult['mood'],
    patternKey: string | null | undefined,
    limit = 3,
  ): boolean {
    if (!patternKey) return false;
    const recent = this.entries.slice(-limit);
    return recent.some(
      (e) => e.eventType === eventType && e.mood === mood && e.patternKey === patternKey,
    );
  }

  canUseCategory(category: string, nowMs: number, urgency?: boolean): boolean {
    if (urgency) return true;
    const cooldown = CATEGORY_COOLDOWN_MS[category as OrionMessageCategory];
    if (!cooldown) return true;
    for (let i = this.entries.length - 1; i >= 0; i -= 1) {
      const e = this.entries[i];
      if (e.category !== category) continue;
      if (nowMs - e.timestampMs < cooldown) return false;
      break;
    }
    return true;
  }

  recordSpoken(result: OrionCompanionResult, nowMs: number): void {
    if (!result.message?.trim()) return;
    const entry: OrionMemoryEntry = {
      message: result.message.trim(),
      normalizedText: normalizeMessageKey(result.message),
      variantId: result.variantId ?? null,
      patternKey: result.patternKey ?? null,
      tripId: result.tripId ?? null,
      category: result.category,
      mood: result.mood,
      timestampMs: nowMs,
      eventType: result.eventType,
    };
    this.entries.push(entry);
    if (this.entries.length > ORION_COMPANION_MEMORY_MAX) {
      this.entries = this.entries.slice(-ORION_COMPANION_MEMORY_MAX);
    }
    this.persist();
  }
}

export function createInMemoryOrionMemory(entries: OrionMemoryEntry[] = []): OrionMemoryEngine {
  const memStore: Record<string, string> = {};
  const store: OrionMemoryStore = {
    getString: (k) => memStore[k],
    set: (k, v) => {
      memStore[k] = v;
    },
  };
  const engine = new OrionMemoryEngine(store, 'test_orion_memory');
  engine.loadEntries(entries);
  return engine;
}
