import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { requireSupabase } from '@/services/supabase';
import type { FeltIntensity, NewReportInput, ReportCategory, UserReport, Verification } from '@/types/report';
import type { SendOutcome } from './pendingQueue';

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
  created_at: string;
  report_media: { id: string; storage_path: string }[] | null;
};

// author_id gibi gizli sütunlara erişim yok; sütunlar açıkça listelenir.
const COLUMNS =
  'id, category, felt_intensity, description, latitude, longitude, area_label, earthquake_event_id, verification, helpful_count, created_at, report_media(id, storage_path)';

export async function fetchFeed(): Promise<UserReport[]> {
  const sb = requireSupabase();
  const since = new Date(Date.now() - FEED_HOURS * 3600_000).toISOString();
  const { data, error } = await sb
    .from('user_reports')
    .select(COLUMNS)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(150);
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

const isNetworkError = (e: unknown) => {
  const m = (e as { message?: string })?.message ?? '';
  return /network|fetch|timeout|zaman aşımı|failed to fetch/i.test(m);
};

export async function sendReport(input: NewReportInput, existingServerId: string | null): Promise<SendOutcome> {
  let sb;
  try {
    sb = requireSupabase();
  } catch (e) {
    return { kind: 'fatal', error: (e as Error).message };
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
      })
      .select('id')
      .single();
    if (error) {
      if (error.code === '23505') return { kind: 'sent', serverId: 'duplicate' }; // daha önce ulaşmış
      if (error.message?.includes('rate_limited')) return { kind: 'retry', error: 'Hız sınırı: birkaç dakika sonra tekrar denenecek.' };
      if (isNetworkError(error)) return { kind: 'retry', error: 'Bağlantı yok' };
      return { kind: 'fatal', error: error.message };
    }
    serverId = data.id as string;
  }

  try {
    for (const [i, uri] of input.photos.entries()) {
      const path = `${uid}/${serverId}/${i}.jpg`;
      const body = await sanitizePhoto(uri);
      const up = await sb.storage.from(BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: true });
      if (up.error) throw up.error;
      const { error } = await sb.from('report_media').insert({ report_id: serverId, storage_path: path });
      if (error && error.code !== '23505') throw error;
    }
  } catch (e) {
    return { kind: 'partial', serverId, error: `Fotoğraf yüklenemedi: ${(e as Error).message}` };
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
