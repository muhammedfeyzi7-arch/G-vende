import type { LatLng } from '@/utils/geo';

/**
 * Toplanma alanları sunucuda Web Mercator karolarına (yakınlaştırma 11) bölünür; sunucudaki
 * `tile_x/tile_y` üretilmiş kolonlarıyla aynı formül. Türkiye'de bir karo ≈ 15 × 15 km.
 */
export const TILE_Z = 11;
const N = 2 ** TILE_Z;
/** Tek istekte istenebilecek en fazla karo (sunucu da 64'te keser). */
export const MAX_TILES = 64;

export const tileX = (lon: number) => Math.floor(((lon + 180) / 360) * N);
export const tileY = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * N);
};
export type Tile = { x: number; y: number };
export const tileKey = (t: Tile) => `${t.x}:${t.y}`;

/** [batı, güney, doğu, kuzey] kutusunu kapsayan karolar; çok fazlaysa null (önce yakınlaştırılmalı). */
export function tilesForBounds(b: [number, number, number, number], max = MAX_TILES): Tile[] | null {
  const [w, s, e, n] = b;
  const x0 = tileX(Math.max(-180, w));
  const x1 = tileX(Math.min(179.9999, e));
  const y0 = tileY(Math.min(85, n)); // kuzey = küçük y
  const y1 = tileY(Math.max(-85, s));
  if (x1 < x0 || y1 < y0) return [];
  if ((x1 - x0 + 1) * (y1 - y0 + 1) > max) return null;
  const out: Tile[] = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push({ x, y });
  return out;
}

/** Merkez çevresindeki ~radiusKm'lik kareyi kapsayan karolar. */
export function tilesAround(c: LatLng, radiusKm: number, max = MAX_TILES): Tile[] | null {
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.max(0.2, Math.cos((c.latitude * Math.PI) / 180)));
  return tilesForBounds([c.longitude - dLon, c.latitude - dLat, c.longitude + dLon, c.latitude + dLat], max);
}
