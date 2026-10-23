import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';
import { env, isBackendConfigured } from './env';
import { userMessage } from './errors';

/**
 * Oturum belirteçleri cihazın güvenli deposunda (Keychain / Keystore) tutulur.
 * SecureStore değer başına ~2 KB sınırı olduğundan uzun değerler parçalanır.
 */
const CHUNK = 1800;
const secureStorage = {
  async getItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}.n`));
    if (!count) return SecureStore.getItemAsync(key);
    const parts = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)));
    return parts.some((p) => p == null) ? null : parts.join('');
  },
  async setItem(key: string, value: string) {
    await secureStorage.removeItem(key);
    const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, 'g')) ?? [''];
    await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${key}.${i}`, p)));
    await SecureStore.setItemAsync(`${key}.n`, String(parts.length));
  },
  async removeItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}.n`)) || 0;
    await Promise.all([
      SecureStore.deleteItemAsync(key),
      SecureStore.deleteItemAsync(`${key}.n`),
      ...Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)),
    ]);
  },
};

let client: SupabaseClient | null = null;

/** Backend yapılandırılmamışsa null döner; çağıranlar bunu "yapılandırılmadı" durumu olarak gösterir. */
export function getSupabase(): SupabaseClient | null {
  if (!isBackendConfigured()) return null;
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        // Web'de Keychain yok; supabase-js varsayılan olarak localStorage kullanır (yalnızca önizleme).
        storage: Platform.OS === 'web' ? undefined : secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    AppState.addEventListener('change', (s) => {
      if (s === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }
  return client;
}

export class BackendNotConfiguredError extends Error {
  constructor() {
    super('Sunucu bağlantısı yapılandırılmadı (EXPO_PUBLIC_SUPABASE_URL / ANON_KEY).');
    this.name = 'BackendNotConfiguredError';
  }
}

export function requireSupabase(): SupabaseClient {
  const c = getSupabase();
  if (!c) throw new BackendNotConfiguredError();
  return c;
}

/** Postgres/PostgREST hatalarını kullanıcıya gösterilebilir Türkçe mesaja çevirir (teknik metin göstermez). */
export function friendlyError(e: unknown): string {
  return userMessage(e);
}
