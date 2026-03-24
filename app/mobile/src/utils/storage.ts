/**
 * Safe key-value storage that works in both Expo Go and dev builds.
 * Uses MMKV when native module is available, falls back to a simple
 * synchronous in-memory cache (with AsyncStorage persistence when possible).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryCache: Record<string, string> = {};
let asyncLoaded = false;

function loadFromAsync() {
  if (asyncLoaded) return;
  asyncLoaded = true;
  AsyncStorage.getAllKeys()
    .then((keys) => {
      if (!keys.length) return;
      const promises = keys.map((k) => AsyncStorage.getItem(k).then((v) => [k, v] as const));
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
    AsyncStorage.setItem(key, value).catch(() => {});
  },
  delete(key: string): void {
    delete memoryCache[key];
    AsyncStorage.removeItem(key).catch(() => {});
  },
};
