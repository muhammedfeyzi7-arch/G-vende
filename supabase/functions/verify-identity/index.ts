// Kimlik doğrulama (prototip): NVİ KPSPublic servisiyle T.C. kimlik no + ad + soyad + doğum yılı
// eşleşmesini kontrol eder. Başarılıysa profile yalnızca doğrulama zamanı ve kimlik numarasının
// anahtarlı özeti (aynı kimliğin ikinci hesapta kullanılmasını engellemek için) yazılır.
// Kimlik numarası, ad, soyad ve doğum yılı hiçbir yerde saklanmaz ve günlüğe yazılmaz.
// Gerekli gizli değerler: SUPABASE_SERVICE_ROLE_KEY, IDENTITY_HASH_PEPPER (en az 32 karakter rastgele).
import { createClient } from '@supabase/supabase-js';
import { isValidBirthYear, isValidTckn, normalizeNamePart } from '@/features/trust/tckn';
import { callNvi, identityHash } from '../_shared/nvi.ts';

const MAX_ATTEMPTS_PER_DAY = 5;
const json = (body: unknown, status = 200) => Response.json(body, { status });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'unauthorized' }, 401);

  const pepper = Deno.env.get('IDENTITY_HASH_PEPPER') ?? '';
  if (pepper.length < 32) return json({ error: 'not_configured' }, 503);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { data: auth, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !auth.user) return json({ error: 'unauthorized' }, 401);
  const uid = auth.user.id;

  let body: { tckn?: unknown; firstName?: unknown; lastName?: unknown; birthYear?: unknown; consent?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (body.consent !== true) return json({ error: 'consent_required' }, 400);
  const tckn = String(body.tckn ?? '').replace(/\D/g, '');
  const firstName = normalizeNamePart(String(body.firstName ?? ''));
  const lastName = normalizeNamePart(String(body.lastName ?? ''));
  const birthYear = Number(body.birthYear);
  if (!isValidTckn(tckn) || !firstName || !lastName || firstName.length > 60 || lastName.length > 60 || !isValidBirthYear(birthYear)) {
    return json({ error: 'invalid_input' }, 400);
  }

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await admin.from('identity_attempts').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('created_at', since);
  if ((count ?? 0) >= MAX_ATTEMPTS_PER_DAY) return json({ error: 'rate_limited' }, 429);

  let ok: boolean | null;
  try {
    ok = await callNvi({ tckn, firstName, lastName, birthYear });
  } catch {
    ok = null;
  }
  if (ok === null) return json({ error: 'service_unavailable' }, 502);
  await admin.from('identity_attempts').insert({ user_id: uid, ok });
  if (!ok) return json({ error: 'not_matched' }, 422);

  const hash = await identityHash(tckn, pepper);
  const { data: other } = await admin.from('profiles').select('id').eq('identity_hash', hash).neq('id', uid).maybeSingle();
  if (other) return json({ error: 'already_used' }, 409);

  const { error } = await admin
    .from('profiles')
    .upsert({ id: uid, identity_hash: hash, identity_verified_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) return json({ error: 'save_failed' }, 500);
  return json({ verified: true });
});
