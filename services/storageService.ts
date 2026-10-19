import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// On iPhone, data lives in native app storage (Capacitor Preferences), which iOS
// does not clear the way it can clear a web view's localStorage. In the browser
// we keep using localStorage.
const isNative = Capacitor.isNativePlatform();

const MIGRATED_KEY = 'mentalist_migrated_from_localstorage';

export const storage = {
  async get(key: string): Promise<string | null> {
    if (isNative) return (await Preferences.get({ key })).value;
    return localStorage.getItem(key);
  },

  async set(key: string, value: string): Promise<void> {
    if (isNative) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },

  async remove(key: string): Promise<void> {
    if (isNative) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  async getJSON<T>(key: string, fallback: T): Promise<T> {
    const raw = await this.get(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  async setJSON(key: string, value: unknown): Promise<void> {
    await this.set(key, JSON.stringify(value));
  },
};

// One-time copy of everything saved by earlier versions of the iOS app
// (which used the web view's localStorage) into native storage.
export const migrateFromLocalStorage = async (): Promise<void> => {
  if (!isNative) return;
  if ((await Preferences.get({ key: MIGRATED_KEY })).value) return;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('mentalist_')) continue;
    const existing = (await Preferences.get({ key })).value;
    const value = localStorage.getItem(key);
    if (existing === null && value !== null) {
      await Preferences.set({ key, value });
    }
  }
  await Preferences.set({ key: MIGRATED_KEY, value: '1' });
};
