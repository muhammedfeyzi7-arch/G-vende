import { requireSupabase } from '@/services/supabase';
import type { TrustInfo } from './rules';
import { UserError } from '@/services/errors';

export async function fetchMyTrust(): Promise<TrustInfo> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('my_trust');
  if (error) throw error;
  const d = (data ?? {}) as {
    verified?: boolean;
    role?: TrustInfo['role'];
    org_name?: string | null;
    strikes?: number;
    suspended_until?: string | null;
  };
  return {
    verified: !!d.verified,
    role: d.role ?? 'user',
    orgName: d.org_name ?? null,
    strikes: d.strikes ?? 0,
    suspendedUntil: d.suspended_until ?? null,
  };
}

export interface IdentityForm {
  tckn: string;
  firstName: string;
  lastName: string;
  birthYear: number;
  consent: boolean;
}

const IDENTITY_ERRORS: Record<string, string> = {
  consent_required: 'Devam etmek için açık rıza onayı gerekir.',
  invalid_input: 'Bilgiler geçersiz. T.C. kimlik no, ad, soyad ve doğum yılını kontrol edin.',
  rate_limited: 'Çok fazla deneme yapıldı. 24 saat sonra tekrar deneyin.',
  not_matched: 'Bilgiler nüfus kayıtlarıyla eşleşmedi. Ad ve soyadınızı kimlik kartınızdaki gibi yazın.',
  already_used: 'Bu kimlik başka bir hesapta doğrulanmış. Her kimlik yalnızca bir hesapta kullanılabilir.',
  service_unavailable: 'Nüfus doğrulama servisine şu an ulaşılamıyor. Daha sonra tekrar deneyin.',
  not_configured: 'Kimlik doğrulama sunucuda henüz yapılandırılmadı.',
};

/** Kimlik bilgileri yalnızca sunucu işlevine iletilir; cihazda ve veritabanında saklanmaz. */
export async function verifyIdentity(form: IdentityForm): Promise<void> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke('verify-identity', { body: form });
  if (!error && (data as { verified?: boolean })?.verified) return;
  let code = '';
  try {
    const ctx = (error as { context?: Response })?.context;
    code = ctx ? (((await ctx.json()) as { error?: string }).error ?? '') : '';
  } catch {
    // yanıt gövdesi okunamadı
  }
  throw new UserError(IDENTITY_ERRORS[code] ?? 'Doğrulama tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin.');
}
