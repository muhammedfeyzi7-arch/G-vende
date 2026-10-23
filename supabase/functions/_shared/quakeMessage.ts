import { formatMagnitude, placeTitle } from './app/features/earthquakes/format.core.ts';
import type { EarthquakeEvent } from './app/types/earthquake.ts';

const LABEL: Record<string, string> = { afad: 'AFAD', kandilli: 'Kandilli', emsc: 'EMSC', usgs: 'USGS' };

/** Olay saati Türkiye saatiyle (ör. "23 Eki 14:05"). */
export function trTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Gerçekleşmiş deprem bildirimi: kaynak, büyüklük ve olay saati. Erken uyarı DEĞİLDİR ve öyle yazılmaz. */
export function quakePushContent(e: EarthquakeEvent): { title: string; body: string } {
  const p = e.primary;
  const sources = [...new Set(e.readings.map((r) => LABEL[r.source] ?? r.source))].join(', ');
  const mag = `M${formatMagnitude(p.magnitude)}${p.magnitudeType ? ` (${p.magnitudeType})` : ''}`;
  return {
    title: `Deprem kaydedildi: ${mag} · ${placeTitle(e)}`,
    body: `${trTime(p.occurredAt)} TSİ · derinlik ${p.depthKm ?? '?'} km · kaynak: ${sources}. Gerçekleşmiş deprem kaydıdır, erken uyarı değildir.`,
  };
}
