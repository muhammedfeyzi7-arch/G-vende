jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));
jest.mock('expo-crypto', () => ({
  getRandomBytes: () => new Uint8Array(16).fill(171),
  digestStringAsync: jest.fn(async (_a: string, s: string) => `sha256(${s})`),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));
jest.mock('@/features/settings/profile', () => ({
  loadProfile: jest.fn(async () => ({ name: '', phone: '', photoUri: null, showLocation: true })),
  saveProfile: jest.fn(async () => {}),
}));

import * as Apple from 'expo-apple-authentication';
import { saveProfile } from '@/features/settings/profile';
import { appleErrorMessage, isAppleCancel, signInWithApple } from './apple';

describe('Apple ile giriş', () => {
  it('Apple belirtecini ham nonce ile Supabase’e iletir; Apple’a özeti gider', async () => {
    (Apple.signInAsync as jest.Mock).mockResolvedValue({ identityToken: 'jwt', fullName: { givenName: 'Ayşe', familyName: 'Yılmaz' } });
    const signInWithIdToken = jest.fn().mockResolvedValue({ error: null });
    await signInWithApple({ auth: { signInWithIdToken } } as never);
    const raw = 'ab'.repeat(16);
    expect((Apple.signInAsync as jest.Mock).mock.calls[0][0].nonce).toBe(`sha256(${raw})`);
    expect(signInWithIdToken).toHaveBeenCalledWith({ provider: 'apple', token: 'jwt', nonce: raw });
    expect(saveProfile).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ayşe Yılmaz' }));
  });

  it('belirteç yoksa veya sunucu reddederse hata verir', async () => {
    (Apple.signInAsync as jest.Mock).mockResolvedValue({ identityToken: null });
    await expect(signInWithApple({ auth: { signInWithIdToken: jest.fn() } } as never)).rejects.toThrow('belirteci');
    (Apple.signInAsync as jest.Mock).mockResolvedValue({ identityToken: 'jwt' });
    const err = { message: 'Provider is not enabled' };
    await expect(signInWithApple({ auth: { signInWithIdToken: jest.fn().mockResolvedValue({ error: err }) } } as never)).rejects.toBe(err);
  });

  it('hataları Türkçeleştirir, iptali ayırt eder', () => {
    expect(appleErrorMessage({ message: 'Provider is not enabled' })).toMatch(/sunucuda henüz açılmadı/);
    expect(appleErrorMessage({ message: 'Unacceptable audience in id_token' })).toMatch(/Client IDs/);
    expect(isAppleCancel({ code: 'ERR_REQUEST_CANCELED' })).toBe(true);
    expect(isAppleCancel(new Error('x'))).toBe(false);
  });
});
