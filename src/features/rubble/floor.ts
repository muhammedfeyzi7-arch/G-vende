import { readJson, writeJson } from '@/services/storage';

/**
 * Kat bilgisi. Esas bilgi kullanıcının girdiği kattır. Barometre yalnızca yardımcıdır ve GÖRELİ
 * ölçer: zemin katta "sıfırla", kendi katında "ölç". Hava basıncı saatler içinde değiştiği için
 * mutlak basınçtan kat tahmini yapılmaz; iki ölçüm arası 30 dakikayı geçerse sonuç kullanılmaz.
 */
export const FLOOR_KEY = 'my-floor';
export const FLOOR_HEIGHT_M = 3;
export const MAX_MEASURE_GAP_MS = 30 * 60_000;

export type FloorInfo = { floor: string; savedAt: string; measured?: boolean };

export const loadFloor = () => readJson<FloorInfo>(FLOOR_KEY);
export const saveFloor = (floor: string, measured = false) =>
  writeJson<FloorInfo>(FLOOR_KEY, { floor: floor.trim(), savedAt: new Date().toISOString(), measured });

/** İki basınç (hPa) arasındaki yükseklik farkı (m); p1 < p0 ise yukarı çıkılmıştır. */
export function heightDiffM(p0: number, p1: number): number {
  return 44330 * (1 - (p1 / p0) ** 0.1903);
}

/** Ölçülen yükseklikten kat (en yakın tam sayı); zemin = 0. Gürültü için 1 m altı zemin sayılır. */
export function floorFromHeight(h: number, floorHeight = FLOOR_HEIGHT_M): number {
  if (Math.abs(h) < 1) return 0;
  return Math.round(h / floorHeight);
}

/** "4" → "4. kat", "0"/"zemin" → "zemin kat", "-1" → "bodrum (-1)". Serbest metin olduğu gibi kalır. */
export function floorLabel(floor: string | null | undefined): string | null {
  const f = floor?.trim();
  if (!f) return null;
  if (/^(0|zemin)$/i.test(f)) return 'zemin kat';
  if (/^-\d+$/.test(f)) return `bodrum (${f})`;
  if (/^\d+$/.test(f)) return `${f}. kat`;
  return f;
}
