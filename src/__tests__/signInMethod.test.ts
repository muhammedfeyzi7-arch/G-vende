import { signInMethod } from '../app/hesap';

describe('giriş yöntemi', () => {
  it('Apple, Apple gizli e-posta ve e-posta bağlantısını ayırır', () => {
    expect(signInMethod({ email: 'a@b.com', app_metadata: { provider: 'apple' } })).toBe('Apple');
    expect(signInMethod({ email: 'x1@privaterelay.appleid.com', app_metadata: { provider: 'apple' } })).toBe('Apple (gizli e-posta)');
    expect(signInMethod({ email: 'a@b.com', app_metadata: { provider: 'email' } })).toBe('E-posta bağlantısı');
    expect(signInMethod(null)).toBe('E-posta');
  });
});
