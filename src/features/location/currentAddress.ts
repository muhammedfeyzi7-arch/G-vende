import * as Location from 'expo-location';
import { readJson, writeJson } from '@/services/storage';
import { distanceKm, type LatLng } from '@/utils/geo';
import { formatTrAddress, type TrAddress } from './address';

type Cached = TrAddress & { at: string; latitude?: number; longitude?: number };

/** Son bulunan adres yakınsa ve 6 saatten eski değilse çevrimdışıyken kullanılır. */
const REUSE_KM = 0.3;
const REUSE_MS = 6 * 3600_000;

/**
 * Konumun açık adresini döndürür (mesajlar ve 112 için). Ağ yavaşsa 4 sn'de vazgeçer ve yakındaki
 * son bilinen adrese döner; hiçbiri yoksa null.
 */
export async function addressFor(coords: LatLng, timeoutMs = 4000, online = true): Promise<string | null> {
  // İnternet yoksa adres servisi beklenmez: doğrudan son kaydedilen adres (SMS gecikmesin).
  if (online) {
    try {
      const result = await Promise.race([
        Location.reverseGeocodeAsync(coords),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
      ]);
      const f = formatTrAddress(result[0]);
      if (f.full) {
        writeJson<Cached>('last-address', { ...f, at: new Date().toISOString(), latitude: coords.latitude, longitude: coords.longitude });
        return f.full;
      }
    } catch {
      // zaman aşımı / servis hatası: aşağıda son bilinen adres
    }
  }
  const last = await readJson<Cached>('last-address');
  if (!last?.full || last.latitude == null || last.longitude == null) return null;
  const near = distanceKm(coords, { latitude: last.latitude, longitude: last.longitude }) <= REUSE_KM;
  const fresh = Date.now() - Date.parse(last.at) <= REUSE_MS;
  return near && fresh ? last.full : null;
}
