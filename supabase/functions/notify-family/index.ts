// Veritabanı webhook'u (safety_checkins INSERT) ile çağrılır; aynı gruptaki diğer
// üyelere, aile bildirimlerini açık tuttularsa push gönderir. Konum push içeriğine eklenmez.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendExpoPush } from '../_shared/recipients.ts';

type Payload = { type: 'INSERT'; table: 'safety_checkins'; record: { group_id: string; user_id: string; status: 'safe' | 'need_help' } };

Deno.serve(async (req) => {
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) return new Response('forbidden', { status: 403 });
  const { record } = (await req.json()) as Payload;
  if (!record?.group_id) return new Response('bad request', { status: 400 });

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: members } = await sb.from('family_members').select('user_id, display_name').eq('group_id', record.group_id);
  const sender = members?.find((m) => m.user_id === record.user_id);
  const others = (members ?? []).map((m) => m.user_id as string).filter((u) => u !== record.user_id);
  if (!sender || !others.length) return Response.json({ pushed: 0 });

  const { data: prefs } = await sb.from('notification_preferences').select('user_id, family_enabled').in('user_id', others);
  const optedOut = new Set((prefs ?? []).filter((p) => !p.family_enabled).map((p) => p.user_id));
  const recipients = others.filter((u) => !optedOut.has(u));
  const { data: tokens } = await sb.from('push_tokens').select('token').in('user_id', recipients);

  const pushed = await sendExpoPush(
    (tokens ?? []).map((t) => ({
      to: t.token,
      title: record.status === 'safe' ? `${sender.display_name} güvende` : `${sender.display_name} yardıma ihtiyaç duyuyor`,
      body: record.status === 'safe' ? 'Aile grubunuzda durum güncellendi.' : 'Ayrıntılar için uygulamayı açın. Hayati tehlike varsa 112’yi arayın.',
      data: { url: 'guvende://ailem' },
      channelId: 'family',
      sound: 'default',
    })),
    Deno.env.get('EXPO_ACCESS_TOKEN') ?? undefined,
  );
  return Response.json({ pushed });
});
