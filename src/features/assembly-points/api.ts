import { Linking, Platform } from 'react-native';
import { readJson, writeJson } from '@/services/storage';
import { requireSupabase } from '@/services/supabase';
import type { AssemblyPoint } from '@/types/assembly';
import { distanceKm, type LatLng } from '@/utils/geo';

type Row = {
  id: string;
  name: string;
  address: string | null;
  province: string | null;
  district: string | null;
  neighborhood: string | null;
  latitude: number;
  longitude: number;
  capacity: number | null;
  source_name: string;
  source_url: string;
  source_published_at: string | null;
  imported_at: string;
};

const COLUMNS =
  'id, name, address, province, district, neighborhood, latitude, longitude, capacity, source_name, source_url, source_published_at, imported_at';

const mapRow = (r: Row): AssemblyPoint => ({
  id: r.id,
  name: r.name,
  address: r.address,
  province: r.province,
  district: r.district,
  neighborhood: r.neighborhood,
  latitude: r.latitude,
  longitude: r.longitude,
  capacity: r.capacity,
  sourceName: r.source_name,
  sourceUrl: r.source_url,
  sourcePublishedAt: r.source_published_at,
  importedAt: r.imported_at,
});

export type NearbyResult = { points: (AssemblyPoint & { distanceKm: number })[]; fetchedAt: string; fromCache: boolean };

/** Merkez çevresindeki (~radiusKm) resmî toplanma alanlarını mesafeye göre sıralı döner. */
export function sortByDistance(points: AssemblyPoint[], center: LatLng, radiusKm: number) {
  return points
    .map((p) => ({ ...p, distanceKm: distanceKm(center, p) }))
    .filter((p) => p.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function fetchNearby(center: LatLng, radiusKm = 5): Promise<NearbyResult> {
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.max(0.2, Math.cos((center.latitude * Math.PI) / 180)));
  try {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('assembly_points')
      .select(COLUMNS)
      .gte('latitude', center.latitude - dLat)
      .lte('latitude', center.latitude + dLat)
      .gte('longitude', center.longitude - dLon)
      .lte('longitude', center.longitude + dLon)
      .limit(500);
    if (error) throw error;
    const points = sortByDistance((data as Row[]).map(mapRow), center, radiusKm);
    const fetchedAt = new Date().toISOString();
    // Çevrimdışı erişim için son sonuç saklanır.
    await writeJson('assembly-nearby', { points, fetchedAt, center });
    return { points, fetchedAt, fromCache: false };
  } catch (e) {
    const cached = await readJson<{ points: (AssemblyPoint & { distanceKm: number })[]; fetchedAt: string; center: LatLng }>('assembly-nearby');
    if (cached && distanceKm(cached.center, center) < radiusKm) {
      return { points: sortByDistance(cached.points, center, radiusKm), fetchedAt: cached.fetchedAt, fromCache: true };
    }
    throw e;
  }
}

/** Kaydedilen (favori) alanlar — çevrimdışı erişilebilir. */
export async function getSaved(): Promise<AssemblyPoint[]> {
  return (await readJson<AssemblyPoint[]>('assembly-saved')) ?? [];
}
export async function toggleSaved(p: AssemblyPoint): Promise<AssemblyPoint[]> {
  const saved = await getSaved();
  const next = saved.some((s) => s.id === p.id) ? saved.filter((s) => s.id !== p.id) : [...saved, p];
  await writeJson('assembly-saved', next);
  return next;
}

/**
 * Cihazın harita uygulamasında yaya rotası açar. Uygulama rotanın güvenli olduğunu garanti etmez.
 */
export async function openDirections(p: { latitude: number; longitude: number; name: string }) {
  const dest = `${p.latitude},${p.longitude}`;
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${dest}&dirflg=w&q=${encodeURIComponent(p.name)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`;
  await Linking.openURL(url);
}

/** Resmî sorgu: e-Devlet AFAD Acil Toplanma Alanı Sorgulama (giriş gerektirir). */
export const EDEVLET_ASSEMBLY_URL = 'https://www.turkiye.gov.tr/afet-ve-acil-durum-yonetimi-acil-toplanma-alani-sorgulama';
