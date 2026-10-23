import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadProfile, saveProfile } from '@/features/settings/profile';

/**
 * "Apple ile Giriş" (yalnızca iOS). Apple'ın kimlik belirteci Supabase'e verilir (signInWithIdToken);
 * şifre yoktur. Tekrar oynatmaya karşı tek kullanımlık nonce: Apple'a özeti, Supabase'e ham hali gider.
 * Supabase'de Apple sağlayıcısı açık ve "Client IDs" içinde uygulama kimliği (Expo Go'da host.exp.Exponent) olmalıdır.
 */
export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export const isAppleCancel = (e: unknown) => (e as { code?: string } | null)?.code === 'ERR_REQUEST_CANCELED';

/** Sunucu hatalarını Türkçe açıklamaya çevirir. */
export function appleErrorMessage(e: unknown): string {
  const m = (e as { message?: string } | null)?.message ?? '';
  if (/provider is not enabled|unsupported provider|apple.*disabled/i.test(m))
    return 'Apple ile giriş sunucuda henüz açılmadı. Şimdilik e-posta ile giriş yapabilirsiniz.';
  if (/audience|aud/i.test(m)) return 'Apple ile giriş bu uygulama kimliği için sunucuda tanımlı değil (Client IDs).';
  if (/nonce/i.test(m)) return 'Güvenlik doğrulaması başarısız oldu. Lütfen tekrar deneyin.';
  if (/network|fetch|timeout/i.test(m)) return 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.';
  return m || 'Apple ile giriş yapılamadı.';
}

export async function signInWithApple(sb: SupabaseClient): Promise<void> {
  const rawNonce = Array.from(Crypto.getRandomBytes(16), (b) => b.toString(16).padStart(2, '0')).join('');
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const cred = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    nonce: hashedNonce,
  });
  if (!cred.identityToken) throw new Error('Apple kimlik belirteci alınamadı.');
  const { error } = await sb.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken, nonce: rawNonce });
  if (error) throw error;

  // Apple adı yalnızca ilk girişte verir; profil adı boşsa yalnızca bu cihazda saklanır.
  const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ').trim();
  if (name) {
    const p = await loadProfile();
    if (!p.name) await saveProfile({ ...p, name });
  }
}
