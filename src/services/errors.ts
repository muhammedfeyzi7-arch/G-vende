import { trustErrorMessage } from '@/features/trust/rules';

/**
 * Kullanıcıya gösterilecek hata metinleri tek yerden üretilir. "AJAXError: Failed to fetch",
 * "TypeError: Network request failed", "JWT expired", PostgREST kodları gibi teknik metinler
 * ASLA ekrana çıkmaz: bağlantı hataları dostça bir uyarıya, bilinmeyenler genel bir mesaja çevrilir.
 */
export const NETWORK_MESSAGE = 'Lütfen internet bağlantınızı kontrol edin.';
export const GENERIC_MESSAGE = 'Bir sorun oluştu. Lütfen biraz sonra tekrar deneyin.';

/** Doğrudan gösterilmek üzere yazılmış Türkçe hata (uygulamanın kendi kuralları). */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}

const NETWORK =
  /failed to fetch|network ?request failed|networkerror|network error|load failed|ajaxerror|abort|timed? ?out|zaman aşımı|econn|enotfound|eai_again|socket|offline|internet|HTTP (0|5\d\d)\b|status(code)? (0|5\d\d)\b|fetch failed|could not connect|bağlantı kurulamadı/i;

const KNOWN: [RegExp, string][] = [
  [/rate_limited|too many requests|HTTP 429/i, 'Kısa sürede çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.'],
  [/auth_required|jwt|not authenticated|42501|invalid refresh token|session/i, 'Oturumunuzun süresi dolmuş olabilir. Lütfen yeniden giriş yapın.'],
  [/invite_invalid/, 'Davet bağlantısı geçersiz veya süresi dolmuş.'],
  [/group_full/, 'Bu aile grubu dolu (en fazla 12 kişi).'],
  [/too_many_groups/, 'En fazla 5 aile grubu oluşturabilirsiniz.'],
];

function messageOf(e: unknown): string {
  if (!e) return '';
  if (typeof e === 'string') return e;
  const o = e as { name?: string; message?: string; code?: string; status?: number };
  return [o.name, o.message, o.code, o.status != null ? `status ${o.status}` : ''].filter(Boolean).join(' ');
}

export function isNetworkError(e: unknown): boolean {
  const o = e as { name?: string } | null;
  return o?.name === 'AbortError' || NETWORK.test(messageOf(e));
}

/** Herhangi bir hatayı kullanıcıya gösterilebilir Türkçe metne çevirir. */
export function userMessage(e: unknown, fallback = GENERIC_MESSAGE): string {
  if (e instanceof UserError) return e.message;
  if ((e as { name?: string } | null)?.name === 'BackendNotConfiguredError') return 'Sunucu bağlantısı bu sürümde yapılandırılmamış.';
  const raw = messageOf(e);
  const rule = trustErrorMessage(raw);
  if (rule) return rule;
  for (const [re, text] of KNOWN) if (re.test(raw)) return text;
  if (isNetworkError(e)) return NETWORK_MESSAGE;
  if (raw && typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[hata]', raw); // yalnızca geliştiriciye
  return fallback;
}
