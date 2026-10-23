// OTOMATİK KOPYA — düzenlemeyin. Kaynak: src/features/earthquakes/format.core.ts (scripts/sync-function-shared.mjs)
import type { EarthquakeEvent } from '../../types/earthquake.ts';

// Saf biçimlendiriciler (React Native bağımlılığı yok) — sunucu işlevleri de kullanır.
export const formatMagnitude = (m: number | null) => (m == null ? '—' : m.toFixed(1).replace('.', ','));
export const formatDepth = (d: number | null) => (d == null ? 'Bilinmiyor' : `${Math.round(d * 10) / 10} km`.replace('.', ','));

/** "Gölyaka (Düzce)" → { title: 'Düzce · Gölyaka' } gibi okunabilir yer adı. */
export function placeTitle(e: EarthquakeEvent): string {
  const p = e.primary.place?.trim();
  if (!p) return `${e.primary.latitude.toFixed(2)}°K, ${e.primary.longitude.toFixed(2)}°D`;
  const m = p.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (m) return `${toTitle(m[2]!)} · ${toTitle(m[1]!)}`;
  return toTitle(p);
}

function toTitle(s: string): string {
  // Kandilli büyük harf yazar; Türkçe kurallarıyla düzelt.
  if (s !== s.toLocaleUpperCase('tr-TR')) return s;
  return s
    .toLocaleLowerCase('tr-TR')
    .split(/(\s|-)/)
    .map((w) => (w.length > 1 ? w[0]!.toLocaleUpperCase('tr-TR') + w.slice(1) : w))
    .join('');
}
