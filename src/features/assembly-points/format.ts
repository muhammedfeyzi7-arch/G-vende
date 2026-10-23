import type { AssemblyPoint } from '@/types/assembly';

const SMALL = new Set(['ve', 'ile', 'de', 'da', 'ki']);
// Yerel ayar desteğine güvenmeden Türkçe I/İ dönüşümü (Hermes'te toLocale* her cihazda aynı değil).
const lowerTr = (s: string) => s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
const upperTr = (s: string) => s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();

/**
 * Resmî açık veride TÜMÜ BÜYÜK HARF yazılan adları Türkçe kurallarla okunur hale getirir
 * ("1 NO LU AFET VE ACİL DURUM TOPLANMA ALANI" → "1 No'lu Afet ve Acil Durum Toplanma Alanı").
 * Küçük harf içeren (zaten düzgün yazılmış) metne dokunulmaz.
 */
export function titleCaseTr(s: string | null): string | null {
  if (!s || s !== upperTr(s) || s === lowerTr(s)) return s;
  return lowerTr(s.replace(/\bNO\s*LU\b/gu, "No'lu"))
    .split(/(\s+|[-/(),.])/u)
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : upperTr(w.charAt(0)) + w.slice(1)))
    .join('');
}

export const displayPoint = <T extends AssemblyPoint>(p: T): T => ({
  ...p,
  name: titleCaseTr(p.name) ?? p.name,
  address: titleCaseTr(p.address),
  province: titleCaseTr(p.province),
  district: titleCaseTr(p.district),
  neighborhood: titleCaseTr(p.neighborhood),
});
