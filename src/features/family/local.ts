import * as SMS from 'expo-sms';
import { Linking, Platform } from 'react-native';
import { readJson, writeJson } from '@/services/storage';
import type { LatLng } from '@/utils/geo';
import { formatTimeTr } from '@/utils/time';

/**
 * Sunucu gerektirmeyen aile/acil kişi listesi. Kişiler YALNIZCA bu cihazda saklanır.
 * Afet anında mobil veri çalışmasa da SMS çoğu zaman ulaşır; bu yüzden durum bildirimi
 * cihazın kendi SMS uygulamasıyla gönderilir (uygulama mesajı kendisi göndermez).
 */
export interface LocalContact {
  id: string;
  name: string;
  phone: string;
  relation: string | null;
}

export interface LocalMeetingPoint {
  name: string;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string;
}

const CONTACTS_KEY = 'local-contacts';
const MEETING_KEY = 'local-meeting-point';
export const MAX_LOCAL_CONTACTS = 10;

export const loadContacts = async () => (await readJson<LocalContact[]>(CONTACTS_KEY)) ?? [];
export const saveContacts = (c: LocalContact[]) => writeJson(CONTACTS_KEY, c);
export const loadMeetingPoint = () => readJson<LocalMeetingPoint>(MEETING_KEY);
export const saveMeetingPoint = (m: LocalMeetingPoint | null) => writeJson(MEETING_KEY, m);

/** Türkiye numaralarını sadeleştirir: boşluk/tire atılır, 05xx → +905xx. Geçersizse null. */
export function normalizePhone(raw: string): string | null {
  let s = raw.replace(/[\s\-().]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (/^0\d{10}$/.test(s)) s = '+90' + s.slice(1);
  if (/^5\d{9}$/.test(s)) s = '+90' + s;
  return /^\+\d{8,15}$/.test(s) ? s : null;
}

export function formatPhone(p: string): string {
  const m = p.match(/^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/);
  return m ? `0${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p;
}

export type StatusKind = 'safe' | 'need_help';

export function buildStatusMessage(
  kind: StatusKind,
  opts: { location: LatLng | null; meetingPoint: LocalMeetingPoint | null; note?: string; now?: Date },
): string {
  const now = opts.now ?? new Date();
  const parts = [kind === 'safe' ? 'Ben güvendeyim.' : 'Yardıma ihtiyacım var!'];
  if (opts.note?.trim()) parts.push(opts.note.trim());
  if (opts.location) {
    const { latitude: la, longitude: lo } = opts.location;
    parts.push(`Konumum: https://maps.google.com/?q=${la.toFixed(5)},${lo.toFixed(5)}`);
  }
  if (opts.meetingPoint) parts.push(`Buluşma noktası: ${opts.meetingPoint.name}`);
  if (kind === 'need_help') parts.push('Hayati tehlike varsa 112 aranmalı.');
  parts.push(`(GÜVENDE, ${formatTimeTr(now)})`);
  return parts.join(' ');
}

export type SendResult = { ok: true; status: string } | { ok: false; reason: string };

export async function sendStatusSms(contacts: LocalContact[], message: string): Promise<SendResult> {
  if (!contacts.length) return { ok: false, reason: 'Önce en az bir kişi ekleyin.' };
  const phones = contacts.map((c) => c.phone);
  if (await SMS.isAvailableAsync()) {
    const r = await SMS.sendSMSAsync(phones, message);
    return { ok: true, status: r.result };
  }
  // Yedek: sistem SMS bağlantısı (bazı cihazlarda tek alıcı desteklenir)
  const sep = Platform.OS === 'ios' ? '&' : '?';
  const url = `sms:${phones.join(',')}${sep}body=${encodeURIComponent(message)}`;
  if (await Linking.canOpenURL(url)) {
    await Linking.openURL(url);
    return { ok: true, status: 'unknown' };
  }
  return { ok: false, reason: 'Bu cihaz SMS gönderemiyor.' };
}

export const callPhone = (phone: string) => Linking.openURL(`tel:${phone}`);
