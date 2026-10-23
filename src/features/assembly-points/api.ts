import { Linking, Platform } from 'react-native';
import { readJson, writeJson } from '@/services/storage';
import { requireSupabase } from '@/services/supabase';
import type { AssemblyPoint } from '@/types/assembly';
import { distanceKm, type LatLng } from '@/utils/geo';
import { displayPoint } from './format';
import { assemblyTiles } from './store';
import { tilesAround } from './tiles';

export type NearbyResult = { points: (AssemblyPoint & { distanceKm: number })[]; fetchedAt: string; fromCache: boolean };

/** Merkez çevresindeki (~radiusKm) resmî toplanma alanlarını mesafeye göre sıralı döner. */
export function sortByDistance(points: AssemblyPoint[], center: LatLng, radiusKm: number) {
  return points
    .map((p) => ({ ...p, distanceKm: distanceKm(center, p) }))
    .filter((p) => p.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Yakındaki alanlar. Harita ile aynı karo önbelleğini kullanır: aynı bölge için ikinci kez sunucuya
 * gidilmez, çevrimdışıyken son indirilen karolar gösterilir.
 */
export async function fetchNearby(center: LatLng, radiusKm = 5): Promise<NearbyResult> {
  requireSupabase(); // sunucu yoksa açık hata
  const tiles = tilesAround(center, radiusKm) ?? tilesAround(center, 25)!;
  const { points, fromCache } = await assemblyTiles.load(tiles);
  return { points: sortByDistance(points, center, radiusKm), fetchedAt: new Date().toISOString(), fromCache };
}

/** Kaydedilen (favori) alanlar — çevrimdışı erişilebilir. */
export async function getSaved(): Promise<AssemblyPoint[]> {
  return ((await readJson<AssemblyPoint[]>('assembly-saved')) ?? []).map(displayPoint);
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

/** Noktayı cihazın harita uygulamasında (Apple Haritalar / Google Haritalar) işaretli olarak açar. */
export async function openInMaps(p: { latitude: number; longitude: number; name: string }) {
  const ll = `${p.latitude},${p.longitude}`;
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?ll=${ll}&q=${encodeURIComponent(p.name)}`
      : Platform.OS === 'android'
        ? `geo:${ll}?q=${ll}(${encodeURIComponent(p.name)})`
        : `https://www.google.com/maps/search/?api=1&query=${ll}`;
  await Linking.openURL(url);
}
