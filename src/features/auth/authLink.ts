/**
 * Supabase'in varsayılan "Sign in" e-postasındaki bağlantıdan oturum açma.
 * Özel SMTP olmadan e-posta şablonu düzenlenemediği için 6 haneli kod gönderilemez; bunun yerine
 * - bağlantıya dokunulunca uygulama `...#access_token=...&refresh_token=...` ile açılır, ya da
 * - kullanıcı bağlantıyı (dokunmadan) kopyalayıp giriş ekranına yapıştırır: `.../auth/v1/verify?token=...&type=magiclink`.
 */
export type AuthLink =
  | { kind: 'session'; accessToken: string; refreshToken: string }
  | { kind: 'tokenHash'; tokenHash: string; type: 'magiclink' | 'signup' | 'email' }
  | { kind: 'code'; code: string }
  | { kind: 'error'; message: string };

function params(url: string): URLSearchParams {
  const out = new URLSearchParams();
  const q = url.indexOf('?');
  const h = url.indexOf('#');
  const query = q >= 0 ? url.slice(q + 1, h > q ? h : undefined) : '';
  const hash = h >= 0 ? url.slice(h + 1) : '';
  for (const part of [query, hash]) new URLSearchParams(part).forEach((v, k) => out.set(k, v));
  return out;
}

export function parseAuthLink(raw: string): AuthLink | null {
  const url = raw.trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) return null;
  const p = params(url);
  const err = p.get('error_description') ?? p.get('error');
  if (err) return { kind: 'error', message: err.replace(/\+/g, ' ') };
  const accessToken = p.get('access_token');
  const refreshToken = p.get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'session', accessToken, refreshToken };
  const tokenHash = p.get('token_hash') ?? (/\/auth\/v1\/verify/.test(url) ? p.get('token') : null);
  if (tokenHash) {
    const t = p.get('type');
    return { kind: 'tokenHash', tokenHash, type: t === 'signup' || t === 'email' ? t : 'magiclink' };
  }
  const code = p.get('code');
  if (code) return { kind: 'code', code };
  return null;
}

type AuthApi = {
  setSession(s: { access_token: string; refresh_token: string }): Promise<{ error: unknown }>;
  verifyOtp(p: { token_hash: string; type: 'magiclink' | 'signup' | 'email' }): Promise<{ error: unknown }>;
  exchangeCodeForSession(code: string): Promise<{ error: unknown }>;
};

/** Bağlantıdaki bilgilerle oturum açar; başarısızsa hata fırlatır. */
export async function signInWithAuthLink(auth: AuthApi, link: AuthLink): Promise<void> {
  let res: { error: unknown };
  if (link.kind === 'error') throw new Error(link.message);
  if (link.kind === 'session') res = await auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
  else if (link.kind === 'tokenHash') res = await auth.verifyOtp({ token_hash: link.tokenHash, type: link.type });
  else res = await auth.exchangeCodeForSession(link.code);
  if (res.error) throw res.error;
}
