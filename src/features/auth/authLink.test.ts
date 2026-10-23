import { parseAuthLink, signInWithAuthLink } from './authLink';

describe('parseAuthLink', () => {
  it('uygulamaya dönen bağlantıdaki oturum belirteçlerini okur', () => {
    expect(parseAuthLink('guvende://giris#access_token=a.b.c&refresh_token=r1&type=magiclink')).toEqual({
      kind: 'session',
      accessToken: 'a.b.c',
      refreshToken: 'r1',
    });
    expect(parseAuthLink('exp://x.on.expo.app/--/giris#access_token=a&expires_in=3600&refresh_token=r')).toMatchObject({ kind: 'session' });
  });

  it('e-postadan kopyalanan doğrulama bağlantısını okur', () => {
    expect(parseAuthLink('https://p.supabase.co/auth/v1/verify?token=abc123&type=magiclink&redirect_to=guvende://giris')).toEqual({
      kind: 'tokenHash',
      tokenHash: 'abc123',
      type: 'magiclink',
    });
    expect(parseAuthLink('https://p.supabase.co/auth/v1/verify?token=s1&type=signup')).toMatchObject({ type: 'signup' });
  });

  it('hata bağlantısını ve ilgisiz metni ayırır', () => {
    expect(parseAuthLink('guvende://giris#error=access_denied&error_description=Email+link+is+invalid+or+has+expired')).toEqual({
      kind: 'error',
      message: 'Email link is invalid or has expired',
    });
    expect(parseAuthLink('123456')).toBeNull();
    expect(parseAuthLink('guvende://deprem/afad:1')).toBeNull();
    expect(parseAuthLink('https://example.com/?token=x')).toBeNull();
  });
});

describe('signInWithAuthLink', () => {
  const auth = () => ({
    setSession: jest.fn().mockResolvedValue({ error: null }),
    verifyOtp: jest.fn().mockResolvedValue({ error: null }),
    exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
  });

  it('bağlantı türüne göre doğru yöntemi çağırır', async () => {
    const a = auth();
    await signInWithAuthLink(a, { kind: 'session', accessToken: 'x', refreshToken: 'y' });
    expect(a.setSession).toHaveBeenCalledWith({ access_token: 'x', refresh_token: 'y' });
    await signInWithAuthLink(a, { kind: 'tokenHash', tokenHash: 'h', type: 'magiclink' });
    expect(a.verifyOtp).toHaveBeenCalledWith({ token_hash: 'h', type: 'magiclink' });
  });

  it('sunucu hatasını ve süresi dolmuş bağlantıyı iletir', async () => {
    const a = auth();
    a.verifyOtp.mockResolvedValue({ error: new Error('expired') });
    await expect(signInWithAuthLink(a, { kind: 'tokenHash', tokenHash: 'h', type: 'magiclink' })).rejects.toThrow('expired');
    await expect(signInWithAuthLink(a, { kind: 'error', message: 'geçersiz' })).rejects.toThrow('geçersiz');
  });
});
