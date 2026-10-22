import type { Settings } from '@/features/settings/settings';
import type { EarthquakeEvent } from '@/types/earthquake';
import { distanceKm, type LatLng } from '@/utils/geo';

export type InboxKind = 'quake' | 'official' | 'family' | 'community' | 'system';

export interface InboxItem {
  id: string;
  kind: InboxKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  /** Uygulama içi yol (ör. /deprem/afad:123) */
  href?: string;
}

export const NEARBY_KM = 300;
export const NATIONWIDE_MAG = 5;
const WINDOW_MS = 24 * 3600_000;

/**
 * Hangi depremlerin bildirim merkezine düşeceğini belirler (kullanıcı tercihleriyle aynı kurallar):
 * - "Deprem bildirimleri": eşiğin üzerindeki, 300 km içindeki depremler
 * - "Acil durum duyuruları": Türkiye genelinde M5+ (resmî kaynak kayıtları)
 */
export function quakeInboxItems(
  events: EarthquakeEvent[],
  s: Pick<Settings, 'quakeNotifications' | 'officialNotifications' | 'minNotifyMagnitude'>,
  user: LatLng | null,
  now = Date.now(),
): InboxItem[] {
  const out: InboxItem[] = [];
  for (const e of events) {
    const m = e.primary.magnitude;
    const t = Date.parse(e.primary.occurredAt);
    if (m == null || now - t > WINDOW_MS || t > now) continue;
    const d = user ? distanceKm(user, e.primary) : null;
    const place = e.primary.place ?? 'Bilinmeyen konum';
    const src = e.readings.map((r) => r.source.toUpperCase()).join(', ');
    if (s.officialNotifications && m >= NATIONWIDE_MAG) {
      out.push({
        id: `official:${e.id}`,
        kind: 'official',
        title: `M${m.toFixed(1)} deprem: ${place}`,
        body: `${src} kaydı.${d != null ? ` Size ${Math.round(d)} km uzaklıkta.` : ''}`,
        at: e.primary.occurredAt,
        read: false,
        href: `/deprem/${e.id}`,
      });
    } else if (s.quakeNotifications && m >= s.minNotifyMagnitude && d != null && d <= NEARBY_KM) {
      out.push({
        id: `quake:${e.id}`,
        kind: 'quake',
        title: `Yakınınızda M${m.toFixed(1)} deprem`,
        body: `${place} · ${Math.round(d)} km · ${src}`,
        at: e.primary.occurredAt,
        read: false,
        href: `/deprem/${e.id}`,
      });
    }
  }
  return out;
}

/** Yeni öğeleri ekler; aynı kimlik tekrar eklenmez, okunmuş bilgisi korunur, 7 günden eskiler atılır. */
export function mergeInbox(current: InboxItem[], incoming: InboxItem[], now = Date.now(), max = 60): InboxItem[] {
  const byId = new Map(current.map((i) => [i.id, i]));
  for (const i of incoming) if (!byId.has(i.id)) byId.set(i.id, i);
  return [...byId.values()]
    .filter((i) => now - Date.parse(i.at) < 7 * 24 * 3600_000)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, max);
}
