import { feltRadiusKm, matchOfficialQuake } from '../officialMatch';
import type { EarthquakeEvent, SourceReading } from '../../../types/earthquake';

const quake = (source: SourceReading['source'], mag: number, at: string, lat = 40.77, lon = 30.99): EarthquakeEvent => {
  const r: SourceReading = {
    source,
    sourceEventId: `${source}-${at}`,
    magnitude: mag,
    magnitudeType: 'ML',
    latitude: lat,
    longitude: lon,
    depthKm: 10,
    occurredAt: at,
    sourceUpdatedAt: null,
    fetchedAt: at,
    place: null,
    url: null,
    reviewStatus: 'unknown',
  };
  return { id: `${source}:${r.sourceEventId}`, primary: r, readings: [r] };
};
const report = { category: 'shake' as const, createdAt: '2026-10-23T11:10:00Z', latitude: 40.84, longitude: 31.16 };

describe('resmî kayıtla uyum', () => {
  it('yakın ve zamanında AFAD kaydıyla eşleşir', () => {
    expect(matchOfficialQuake(report, [quake('afad', 4.8, '2026-10-23T11:05:00Z')])).not.toBeNull();
  });
  it('bildirimden sonra olan, çok eski veya çok uzak depremle eşleşmez', () => {
    expect(matchOfficialQuake(report, [quake('afad', 4.8, '2026-10-23T11:30:00Z')])).toBeNull();
    expect(matchOfficialQuake(report, [quake('afad', 4.8, '2026-10-23T10:00:00Z')])).toBeNull();
    expect(matchOfficialQuake(report, [quake('afad', 3.0, '2026-10-23T11:05:00Z', 38.5, 43.4)])).toBeNull();
  });
  it('yalnızca AFAD/Kandilli resmî sayılır; USGS/EMSC eşleşmesi resmî değildir', () => {
    expect(matchOfficialQuake(report, [quake('usgs', 4.8, '2026-10-23T11:05:00Z')])).toBeNull();
    expect(matchOfficialQuake(report, [quake('emsc', 4.8, '2026-10-23T11:05:00Z')])).toBeNull();
    expect(matchOfficialQuake(report, [quake('kandilli', 4.8, '2026-10-23T11:05:00Z')])).not.toBeNull();
  });
  it('yol, güvendeyim gibi kategoriler ve konumsuz bildirimler eşleşmez', () => {
    const q = [quake('afad', 4.8, '2026-10-23T11:05:00Z')];
    expect(matchOfficialQuake({ ...report, category: 'road' }, q)).toBeNull();
    expect(matchOfficialQuake({ ...report, latitude: null }, q)).toBeNull();
  });
  it('hissedilme yarıçapı büyüklükle artar ve sınırlıdır', () => {
    expect(feltRadiusKm(3)).toBe(20);
    expect(feltRadiusKm(5)).toBe(80);
    expect(feltRadiusKm(9)).toBe(400);
  });
});
