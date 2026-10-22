import { coarsen, distanceKm, formatDistance, isValidCoordinate } from '@/utils/geo';
import { relativeTimeTr } from '@/utils/time';
import { sortByDistance } from '@/features/assembly-points/api';
import type { AssemblyPoint } from '@/types/assembly';

jest.mock('@/services/supabase', () => ({ requireSupabase: jest.fn() }));

describe('geo', () => {
  it('İstanbul–Ankara ~350 km', () => {
    const d = distanceKm({ latitude: 41.01, longitude: 28.98 }, { latitude: 39.93, longitude: 32.86 });
    expect(d).toBeGreaterThan(340);
    expect(d).toBeLessThan(360);
  });
  it('konumu ~1 km ızgaraya yuvarlar', () => {
    expect(coarsen({ latitude: 40.771234, longitude: 30.996 })).toEqual({ latitude: 40.77, longitude: 31 });
  });
  it('koordinat doğrulama', () => {
    expect(isValidCoordinate(40, 30)).toBe(true);
    expect(isValidCoordinate(91, 30)).toBe(false);
    expect(isValidCoordinate(NaN, 30)).toBe(false);
    expect(isValidCoordinate('40', 30)).toBe(false);
  });
  it('mesafe biçimi; bilinmeyen değer uydurulmaz', () => {
    expect(formatDistance(0.45)).toBe('450 m');
    expect(formatDistance(3.24)).toBe('3,2 km');
    expect(formatDistance(38.4)).toBe('38 km');
    expect(formatDistance(null)).toBe('Bilinmiyor');
  });
});

describe('time', () => {
  const now = new Date('2026-10-22T19:00:00Z');
  it('göreli zaman', () => {
    expect(relativeTimeTr('2026-10-22T18:59:30Z', now)).toBe('Az önce');
    expect(relativeTimeTr('2026-10-22T18:56:00Z', now)).toBe('4 dk önce');
    expect(relativeTimeTr('2026-10-22T16:00:00Z', now)).toBe('3 sa önce');
    expect(relativeTimeTr('invalid', now)).toBe('Bilinmiyor');
  });
});

describe('toplanma alanı sıralama', () => {
  const p = (id: string, lat: number, lon: number): AssemblyPoint => ({
    id,
    name: id,
    address: null,
    province: null,
    district: null,
    neighborhood: null,
    latitude: lat,
    longitude: lon,
    capacity: null,
    sourceName: 'test',
    sourceUrl: 'https://example.test',
    sourcePublishedAt: null,
    importedAt: '2026-10-01T00:00:00Z',
  });
  it('yarıçap dışını atar ve yakından uzağa sıralar', () => {
    const center = { latitude: 40.0, longitude: 30.0 };
    const out = sortByDistance([p('far', 40.2, 30), p('near', 40.01, 30), p('mid', 40.03, 30)], center, 5);
    expect(out.map((x) => x.id)).toEqual(['near', 'mid']);
  });
});
