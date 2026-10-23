import { findGateQuake } from '../quakeGate';
import type { EarthquakeEvent, SourceReading } from '../../../types/earthquake';

const NOW = Date.parse('2026-10-23T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString();
const quake = (source: SourceReading['source'], mag: number, at: string, lat = 40.9, lon = 31.2): EarthquakeEvent => {
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
    place: 'Düzce',
    url: null,
    reviewStatus: 'unknown',
  };
  return { id: `${source}:${r.sourceEventId}`, primary: r, readings: [r] };
};
const duzce = { latitude: 40.84, longitude: 31.16 };
const van = { latitude: 38.5, longitude: 43.4 };

describe('olay bildirimi bölge kapısı (sunucu kuralıyla aynı)', () => {
  it('yakındaki son 72 saatlik AFAD M4+ depremi kapıyı açar', () => {
    expect(findGateQuake(duzce, [quake('afad', 5.1, hoursAgo(5))], NOW)?.reading.magnitude).toBe(5.1);
    expect(findGateQuake(duzce, [quake('kandilli', 4.0, hoursAgo(71))], NOW)).not.toBeNull();
  });
  it('uzak, eski, küçük veya yalnızca EMSC/USGS kaydı açmaz', () => {
    expect(findGateQuake(van, [quake('afad', 5.1, hoursAgo(5))], NOW)).toBeNull();
    expect(findGateQuake(duzce, [quake('afad', 5.1, hoursAgo(73))], NOW)).toBeNull();
    expect(findGateQuake(duzce, [quake('afad', 3.9, hoursAgo(1))], NOW)).toBeNull();
    expect(findGateQuake(duzce, [quake('emsc', 6.0, hoursAgo(1)), quake('usgs', 6.0, hoursAgo(1))], NOW)).toBeNull();
  });
  it('hissedilme yarıçapı büyüklükle artar (M4 ≈ 40 km, M6 ≈ 160 km)', () => {
    const ist = { latitude: 41.0, longitude: 29.0 }; // Düzce'ye ~190 km
    expect(findGateQuake(ist, [quake('afad', 6.0, hoursAgo(1))], NOW)).toBeNull();
    expect(findGateQuake(ist, [quake('afad', 6.5, hoursAgo(1))], NOW)).not.toBeNull();
  });
  it('konum yoksa kapı kapalıdır; birden çok depremde en büyüğü seçilir', () => {
    expect(findGateQuake(null, [quake('afad', 5, hoursAgo(1))], NOW)).toBeNull();
    const r = findGateQuake(duzce, [quake('afad', 4.2, hoursAgo(1)), quake('kandilli', 5.4, hoursAgo(2))], NOW);
    expect(r?.reading.source).toBe('kandilli');
  });
});
