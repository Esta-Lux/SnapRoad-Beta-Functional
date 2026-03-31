/**
 * Safe key-value storage that works in both Expo Go and dev builds.
 * Uses MMKV when native module is available, falls back to a simple
 * synchronous in-memory cache (with AsyncStorage persistence when possible).
 */

type AsyncStorageLike = {
  getAllKeys: () => Promise<string[]>;
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

let asyncStorage: AsyncStorageLike | null = null;
try {
  // Resolve dynamically so a missing native module does not crash app startup.
  const maybeModule = require('@react-native-async-storage/async-storage');
  asyncStorage = (maybeModule?.default ?? maybeModule) as AsyncStorageLike;
} catch {
  asyncStorage = null;
}

const memoryCache: Record<string, string> = {};
let asyncLoaded = false;

function loadFromAsync() {
  if (asyncLoaded || !asyncStorage) return;
  asyncLoaded = true;
  asyncStorage
    .getAllKeys()
    .then((keys) => {
      if (!keys.length) return;
      const promises = keys.map((k) => asyncStorage!.getItem(k).then((v) => [k, v] as const));
      return Promise.all(promises);
    })
    .then((pairs) => {
      if (!pairs) return;
      for (const [k, v] of pairs) {
        if (k && v && !(k in memoryCache)) memoryCache[k] = v;
      }
    })
    .catch(() => {});
}

loadFromAsync();

export const storage = {
  getString(key: string): string | undefined {
    return memoryCache[key];
  },
  set(key: string, value: string): void {
    memoryCache[key] = value;
    asyncStorage?.setItem(key, value).catch(() => {});
  },
  delete(key: string): void {
    delete memoryCache[key];
    asyncStorage?.removeItem(key).catch(() => {});
  },
};
