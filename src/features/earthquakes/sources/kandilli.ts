import type { SourceReading } from '@/types/earthquake';
import { isValidCoordinate } from '@/utils/geo';
import { SourceError, type QuakeSource } from './types';

/**
 * Boğaziçi Üniversitesi Kandilli Rasathanesi ve Deprem Araştırma Enstitüsü (KRDAE)
 * "Son 500 deprem" listesi (www.koeri.boun.edu.tr/scripts/lst0.asp).
 *
 * Not: Bu bir API değil, Windows-1254 kodlamalı düz metin (<pre>) sayfadır. Biçim
 * değişirse ayrıştırıcı kayıtları atlar ve kaynak hata olarak raporlanır.
 * Zamanlar Türkiye saatidir (UTC+3, 2016'dan beri sabit). Kullanım koşulları yazılı
 * olarak doğrulanamamıştır; yayına almadan önce KRDAE ile teyit edilmelidir.
 */
const URL = 'http://www.koeri.boun.edu.tr/scripts/lst0.asp';
const TR_OFFSET_HOURS = 3;

// Windows-1252 0x80–0x9F aralığı; 1254 bu aralıkta (0x8E/0x9E hariç) aynıdır.
const CP125X_HIGH: Record<number, number> = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
  0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160, 0x8b: 0x2039, 0x8c: 0x0152, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02dc, 0x99: 0x2122,
  0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153, 0x9f: 0x0178,
};
const CP1254_TURKISH: Record<number, number> = { 0xd0: 0x011e, 0xdd: 0x0130, 0xde: 0x015e, 0xf0: 0x011f, 0xfd: 0x0131, 0xfe: 0x015f };

/** Hermes'in TextDecoder'ı yalnızca UTF-8 desteklediği için küçük bir Windows-1254 çözücü. */
export function decodeWindows1254(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] as number;
    const cp = b < 0x80 ? b : (CP1254_TURKISH[b] ?? CP125X_HIGH[b] ?? (b >= 0xa0 ? b : 0xfffd));
    out += String.fromCharCode(cp);
  }
  return out;
}

const LINE =
  /^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/u;
const SOLUTION = /^(.*?)\s+((?:İlksel|Ilksel|ILKSEL|ilksel)|(?:REVIZE|Revize)\d*.*)$/u;
const REVISED_AT = /\((\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\)/;

const mag = (s: string) => {
  const n = Number(s);
  return s.includes('-.-') || !Number.isFinite(n) || n <= 0 ? null : n;
};

function trLocalToIso(y: string, mo: string, d: string, h: string, mi: string, s: string): string | null {
  const t = Date.UTC(+y, +mo - 1, +d, +h - TR_OFFSET_HOURS, +mi, +s);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export function parseKandilli(text: string, fetchedAt: string): SourceReading[] {
  const pre = text.match(/<pre>([\s\S]*?)<\/pre>/i)?.[1] ?? text;
  const out: SourceReading[] = [];
  for (const rawLine of pre.split(/\r?\n/)) {
    const m = rawLine.trim().match(LINE);
    if (!m) continue;
    const [, y, mo, d, h, mi, s, latS, lonS, depthS, md, ml, mw, rest] = m as unknown as string[];
    const lat = Number(latS);
    const lon = Number(lonS);
    const occurredAt = trLocalToIso(y!, mo!, d!, h!, mi!, s!);
    if (!isValidCoordinate(lat, lon) || !occurredAt) continue;

    const sol = rest!.match(SOLUTION);
    const place = (sol ? sol[1] : rest)!.trim() || null;
    const solution = sol?.[2]?.trim() ?? '';
    const revised = solution.match(REVISED_AT);
    const isRevised = /^revize/i.test(solution);

    // Öncelik: Mw > ML > MD. Kaynakta olmayan değer üretilmez.
    const candidates: [string, number | null][] = [
      ['Mw', mag(mw!)],
      ['ML', mag(ml!)],
      ['MD', mag(md!)],
    ];
    const chosen = candidates.find(([, v]) => v !== null);
    out.push({
      source: 'kandilli',
      sourceEventId: `${y}${mo}${d}${h}${mi}${s}_${latS}_${lonS}`,
      magnitude: chosen ? chosen[1] : null,
      magnitudeType: chosen ? chosen[0] : null,
      latitude: lat,
      longitude: lon,
      depthKm: Number.isFinite(Number(depthS)) ? Number(depthS) : null,
      occurredAt,
      sourceUpdatedAt: revised ? trLocalToIso(revised[1]!, revised[2]!, revised[3]!, revised[4]!, revised[5]!, revised[6]!) : null,
      fetchedAt,
      place,
      url: URL,
      reviewStatus: isRevised ? 'reviewed' : solution ? 'automatic' : 'unknown',
    });
  }
  return out;
}

export const kandilliSource: QuakeSource = {
  id: 'kandilli',
  label: 'Kandilli',
  attribution: 'Boğaziçi Üniversitesi Kandilli Rasathanesi ve Deprem Araştırma Enstitüsü',
  homepage: 'http://www.koeri.boun.edu.tr/scripts/lst0.asp',
  async fetch(q, fetcher) {
    const res = await fetcher(URL);
    if (!res.ok) throw new SourceError('kandilli', `Kandilli HTTP ${res.status}`);
    const text = decodeWindows1254(new Uint8Array(await res.arrayBuffer()));
    const rows = parseKandilli(text, new Date().toISOString());
    if (rows.length === 0 && !/<pre>/i.test(text)) throw new SourceError('kandilli', 'Kandilli sayfa biçimi tanınmadı');
    const since = q.since.getTime();
    const until = q.until.getTime();
    return rows
      .filter((r) => {
        const t = Date.parse(r.occurredAt);
        return (
          t >= since &&
          t <= until &&
          (r.magnitude ?? 0) >= q.minMagnitude &&
          r.latitude >= q.bbox.minLat &&
          r.latitude <= q.bbox.maxLat &&
          r.longitude >= q.bbox.minLon &&
          r.longitude <= q.bbox.maxLon
        );
      })
      .slice(0, q.limit);
  },
};
