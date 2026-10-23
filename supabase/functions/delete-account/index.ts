// Oturum sahibi kullanıcının hesabını kalıcı olarak siler. Bağlı kayıtlar (bildirimler,
// aile üyelikleri, durumlar, tercihler) şemadaki ON DELETE CASCADE ile silinir; depodaki
// fotoğraflar ayrıca temizlenir. Servis anahtarı yalnızca bu sunucu işlevinde bulunur.
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return new Response('unauthorized', { status: 401 });

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return new Response('unauthorized', { status: 401 });
  const uid = data.user.id;

  // Kullanıcı klasöründeki fotoğrafları sil
  const bucket = admin.storage.from('report-media');
  const { data: folders } = await bucket.list(uid, { limit: 1000 });
  for (const f of folders ?? []) {
    const { data: files } = await bucket.list(`${uid}/${f.name}`, { limit: 100 });
    const paths = (files ?? []).map((x) => `${uid}/${f.name}/${x.name}`);
    if (paths.length) await bucket.remove(paths);
  }
  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) return Response.json({ error: delErr.message }, { status: 500 });
  return Response.json({ deleted: true });
});
