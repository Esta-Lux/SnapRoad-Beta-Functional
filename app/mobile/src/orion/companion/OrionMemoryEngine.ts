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
        this.entries = parsed.entries.slice(-ORION_COMPANION_MEMORY_MAX);
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
    this.entries = entries.slice(-ORION_COMPANION_MEMORY_MAX);
  }

  clear(): void {
    this.entries = [];
    this.persist();
  }

  lastSpokenAtMs(): number {
    const last = this.entries[this.entries.length - 1];
    return last?.timestampMs ?? 0;
  }

  isDuplicateMessage(text: string): boolean {
    const key = normalizeMessageKey(text);
    if (!key) return true;
    return this.entries.some((e) => normalizeMessageKey(e.message) === key);
  }

  canUseCategory(
    category: OrionMessageCategory | string,
    nowMs: number,
    urgency?: boolean,
  ): boolean {
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
