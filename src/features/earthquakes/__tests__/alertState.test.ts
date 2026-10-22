import type { EarthquakeEvent } from '@/types/earthquake';
import { computeAlertState } from '../alertState';

const ev = (mag: number | null, minutesAgo: number, lat = 40.77, lon = 30.99): EarthquakeEvent => {
  const primary = {
    source: 'afad' as const,
    sourceEventId: `${mag}-${minutesAgo}`,
    magnitude: mag,
    magnitudeType: 'ML',
    latitude: lat,
    longitude: lon,
    depthKm: 10,
    occurredAt: new Date(Date.parse('2026-10-22T19:00:00Z') - minutesAgo * 60000).toISOString(),
    sourceUpdatedAt: null,
    fetchedAt: '2026-10-22T19:00:00Z',
    place: null,
    url: null,
    reviewStatus: 'unknown' as const,
  };
  return { id: primary.sourceEventId, primary, readings: [primary] };
};
const now = new Date('2026-10-22T19:00:00Z');
const sakarya = { latitude: 40.69, longitude: 30.4 };
const van = { latitude: 38.5, longitude: 43.4 };

describe('computeAlertState', () => {
  it('olay yoksa sakin durum', () => {
    expect(computeAlertState([], sakarya, now).kind).toBe('none');
  });
  it('yakın ve yeni önemli olayda uyarı durumu', () => {
    const s = computeAlertState([ev(4.8, 4)], sakarya, now);
    expect(s.kind).toBe('recent-significant');
  });
  it('uzaktaki orta büyüklükte olay uyarı üretmez', () => {
    expect(computeAlertState([ev(4.8, 4)], van, now).kind).toBe('latest');
  });
  it('eski olay uyarı üretmez', () => {
    expect(computeAlertState([ev(5.5, 90)], sakarya, now).kind).toBe('latest');
  });
  it('büyüklüğü bilinmeyen olay uyarı üretmez', () => {
    expect(computeAlertState([ev(null, 2)], sakarya, now).kind).toBe('latest');
  });
  it('konum yoksa yalnızca M5+ uyarı üretir', () => {
    expect(computeAlertState([ev(4.8, 4)], null, now).kind).toBe('latest');
    expect(computeAlertState([ev(5.1, 4)], null, now).kind).toBe('recent-significant');
  });
});
