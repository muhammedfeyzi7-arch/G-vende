import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { requireSupabase } from '@/services/supabase';
import type { FeltIntensity, NewReportInput, ReportCategory, UserReport, Verification } from '@/types/report';
import type { SendOutcome } from './pendingQueue';
import { trustErrorMessage } from '@/features/trust/rules';
import { isNetworkError, NETWORK_MESSAGE, userMessage, UserError } from '@/services/errors';

const BUCKET = 'report-media';
const FEED_HOURS = 48;

type ReportRow = {
  id: string;
  category: ReportCategory;
  felt_intensity: number | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  area_label: string | null;
  earthquake_event_id: string | null;
  verification: Verification;
  helpful_count: number;
  confirm_count: number;
  deny_count: number;
  author_role: 'official' | 'rescue' | null;
  author_org: string | null;
  created_at: string;
  report_media: { id: string; storage_path: string }[] | null;
};

// author_id gibi gizli sütunlara erişim yok; sütunlar açıkça listelenir.
const COLUMNS =
  'id, category, felt_intensity, description, latitude, longitude, area_label, earthquake_event_id, verification, helpful_count, confirm_count, deny_count, author_role, author_org, created_at, report_media(id, storage_path)';

export async function fetchFeed(): Promise<UserReport[]> {
  const sb = requireSupabase();
  const since = new Date(Date.now() - FEED_HOURS * 3600_000).toISOString();
  // Sunucu yanıt vermezse 12 sn sonra iptal: ekran sonsuza dek "yükleniyor"da kalmaz, hata ve "Tekrar" gösterilir.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  let res;
  try {
    res = await sb
      .from('user_reports')
      .select(COLUMNS)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(150)
      .abortSignal(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
  const { data, error } = res;
  if (error) throw error;
  const rows = (data ?? []) as unknown as ReportRow[];

  const paths = rows.flatMap((r) => r.report_media?.map((m) => m.storage_path) ?? []);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await sb.storage.from(BUCKET).createSignedUrls(paths, 3600);
    urls?.forEach((u) => u.path && u.signedUrl && signed.set(u.path, u.signedUrl));
  }

  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    feltIntensity: (r.felt_intensity as FeltIntensity | null) ?? null,
    description: r.description,
    latitude: r.latitude,
    longitude: r.longitude,
    areaLabel: r.area_label,
    earthquakeEventId: r.earthquake_event_id,
    verification: r.verification,
    helpfulCount: r.helpful_count,
    confirmCount: r.confirm_count ?? 0,
    denyCount: r.deny_count ?? 0,
    authorRole: r.author_role ?? null,
    authorOrg: r.author_org ?? null,
    createdAt: r.created_at,
    media: (r.report_media ?? []).map((m) => ({ id: m.id, path: m.storage_path, url: signed.get(m.storage_path) ?? null })),
  }));
}

/** Fotoğrafı yeniden kodlar: EXIF (GPS dahil) üst verisi atılır ve boyut küçültülür. */
async function sanitizePhoto(uri: string): Promise<ArrayBuffer> {
  const ref = await ImageManipulator.manipulate(uri).resize({ width: 1600 }).renderAsync();
  const out = await ref.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  const res = await fetch(out.uri);
  return res.arrayBuffer();
}


export async function sendReport(input: NewReportInput, existingServerId: string | null): Promise<SendOutcome> {
  let sb;
  try {
    sb = requireSupabase();
  } catch (e) {
    return { kind: 'fatal', error: userMessage(e) };
  }
  const { data: sessionData } = await sb.auth.getSession();
  const uid = sessionData.session?.user.id;
  if (!uid) return { kind: 'fatal', error: 'Bildirim göndermek için giriş yapmalısınız.' };

  let serverId = existingServerId;
  if (!serverId) {
    const { data, error } = await sb
      .from('user_reports')
      .insert({
        client_id: input.clientId,
        category: input.category,
        felt_intensity: input.category === 'shake' ? input.feltIntensity : null,
        description: input.description.trim() || null,
        latitude: input.location?.latitude ?? null,
        longitude: input.location?.longitude ?? null,
        area_label: input.areaLabel,
        earthquake_event_id: input.earthquakeEventId,
        // Sunucu bu konumu yalnızca 1 km kuralı için kullanır ve kaydetmez.
        device_latitude: input.device?.latitude ?? null,
        device_longitude: input.device?.longitude ?? null,
        device_accuracy_m: input.device?.accuracy ?? null,
      })
      .select('id')
      .single();
    if (error) {
      if (error.code === '23505') return { kind: 'sent', serverId: 'duplicate' }; // daha önce ulaşmış
      if (error.message?.includes('rate_limited')) return { kind: 'retry', error: 'Hız sınırı: birkaç dakika sonra tekrar denenecek.' };
      const rule = trustErrorMessage(error.message);
      if (rule) return { kind: 'fatal', error: rule };
      if (isNetworkError(error)) return { kind: 'retry', error: NETWORK_MESSAGE };
      return { kind: 'fatal', error: userMessage(error) };
    }
    serverId = data.id as string;
  }

  try {
    for (const [i, photo] of input.photos.entries()) {
      const path = `${uid}/${serverId}/${i}.jpg`;
      const body = await sanitizePhoto(photo.uri);
      const up = await sb.storage.from(BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: true });
      if (up.error) throw up.error;
      const { error } = await sb.from('report_media').insert({ report_id: serverId, storage_path: path, captured_at: photo.capturedAt });
      if (error && error.code !== '23505') throw error;
    }
  } catch (e) {
    const rule = trustErrorMessage((e as Error).message);
    // Canlı fotoğraf süresi dolduysa tekrar denemek işe yaramaz.
    if (rule) return { kind: 'fatal', error: rule };
    return { kind: 'partial', serverId, error: `Fotoğraf yüklenemedi. ${userMessage(e)}` };
  }
  return { kind: 'sent', serverId };
}

export async function markHelpful(reportId: string, helpful: boolean): Promise<void> {
  const sb = requireSupabase();
  const { error } = helpful
    ? await sb.from('report_reactions').insert({ report_id: reportId })
    : await sb.from('report_reactions').delete().eq('report_id', reportId);
  if (error && error.code !== '23505') throw error;
}

export async function fetchMyReactions(): Promise<Set<string>> {
  const sb = requireSupabase();
  const { data } = await sb.from('report_reactions').select('report_id');
  return new Set((data ?? []).map((r: { report_id: string }) => r.report_id));
}

export type FlagReason = 'false_info' | 'spam' | 'personal_info' | 'offensive' | 'other';
export const FLAG_REASONS: { value: FlagReason; label: string }[] = [
  { value: 'false_info', label: 'Yanlış veya yanıltıcı bilgi' },
  { value: 'spam', label: 'Spam / alakasız' },
  { value: 'personal_info', label: 'Kişisel bilgi içeriyor' },
  { value: 'offensive', label: 'Rahatsız edici içerik' },
  { value: 'other', label: 'Diğer' },
];

export async function flagReport(reportId: string, reason: FlagReason): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('moderation_reports').insert({ report_id: reportId, reason });
  if (error && error.code !== '23505') throw error;
}

export type Vote = 'confirm' | 'deny';

/** Yakındaki doğrulanmış kullanıcının oyu. Mesafe ve kimlik kuralını sunucu uygular. */
export async function voteReport(reportId: string, vote: Vote, device: { latitude: number; longitude: number; accuracy: number } | null) {
  const sb = requireSupabase();
  const { error } = await sb.from('report_votes').insert({
    report_id: reportId,
    vote,
    device_latitude: device?.latitude ?? null,
    device_longitude: device?.longitude ?? null,
    device_accuracy_m: device?.accuracy ?? null,
  });
  if (error) {
    if (error.code === '23505') throw new UserError('Bu bildirimi zaten oyladınız.');
    throw new UserError(userMessage(error));
  }
}

export async function fetchMyVotes(): Promise<Map<string, Vote>> {
  const sb = requireSupabase();
  const { data } = await sb.from('report_votes').select('report_id, vote');
  return new Map((data ?? []).map((r: { report_id: string; vote: Vote }) => [r.report_id, r.vote]));
}
