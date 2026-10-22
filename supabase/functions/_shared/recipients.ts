import { distanceKm } from '@/utils/geo';

export type Pref = {
  user_id: string;
  quakes_enabled: boolean;
  /** Türkiye geneli M5+ resmî kayıtlar ("Acil durum duyuruları") */
  official_enabled: boolean;
  min_magnitude: number;
  region_lat: number | null;
  region_lon: number | null;
  region_radius_km: number;
  min_interval_minutes: number;
};

export const NATIONWIDE_MAGNITUDE = 5.0;

/**
 * Bir olay için bildirim alacak kullanıcıları seçer.
 * - "Deprem bildirimleri": bölge yarıçapı içindeki, kullanıcı eşiğinin üzerindeki olaylar.
 * - "Acil durum duyuruları": Türkiye geneli M5+ resmî kayıtlar (bölgeden bağımsız).
 * - Kullanıcıya son gönderimden bu yana min_interval_minutes geçmediyse gönderilmez.
 */
export function selectRecipients(
  event: { magnitude: number | null; latitude: number; longitude: number },
  prefs: Pref[],
  lastSent: Map<string, string>,
  now: Date,
): string[] {
  if (event.magnitude == null) return [];
  const m = event.magnitude;
  return prefs
    .filter((p) => {
      const nationwide = p.official_enabled && m >= NATIONWIDE_MAGNITUDE;
      const inRegion =
        p.quakes_enabled &&
        m >= Number(p.min_magnitude) &&
        p.region_lat != null &&
        p.region_lon != null &&
        distanceKm({ latitude: p.region_lat, longitude: p.region_lon }, event) <= p.region_radius_km;
      if (!nationwide && !inRegion) return false;
      const last = lastSent.get(p.user_id);
      if (last && now.getTime() - Date.parse(last) < p.min_interval_minutes * 60_000) return false;
      return true;
    })
    .map((p) => p.user_id);
}

export type ExpoMessage = { to: string; title: string; body: string; data?: Record<string, unknown>; channelId?: string; sound?: 'default' };

export async function sendExpoPush(messages: ExpoMessage[], accessToken?: string): Promise<number> {
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(chunk),
    });
    if (res.ok) sent += chunk.length;
    else console.error('Expo push hatası', res.status, await res.text());
  }
  return sent;
}
