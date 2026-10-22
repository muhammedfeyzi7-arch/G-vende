import type { EarthquakeEvent, SourceReading } from '@/types/earthquake';
import { colors } from '@/theme';
import { SOURCES } from './repository';

export const formatMagnitude = (m: number | null) => (m == null ? '—' : m.toFixed(1).replace('.', ','));
export const formatDepth = (d: number | null) => (d == null ? 'Bilinmiyor' : `${Math.round(d * 10) / 10} km`.replace('.', ','));
export const sourceLabel = (r: SourceReading) => SOURCES[r.source].label;

export function magnitudeColor(m: number | null): string {
  if (m == null) return colors.info;
  if (m >= 5) return colors.danger;
  if (m >= 4) return colors.warning;
  if (m >= 3) return colors.caution;
  return colors.info;
}

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
