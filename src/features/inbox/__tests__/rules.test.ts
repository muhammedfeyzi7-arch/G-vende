import type { EarthquakeEvent } from '@/types/earthquake';
import { mergeInbox, quakeInboxItems } from '../rules';

const now = Date.parse('2026-10-22T19:00:00Z');
const ev = (id: string, mag: number | null, minAgo: number, lat = 40.77, lon = 30.99): EarthquakeEvent => {
  const primary = {
    source: 'afad' as const,
    sourceEventId: id,
    magnitude: mag,
    magnitudeType: 'ML',
    latitude: lat,
    longitude: lon,
    depthKm: 10,
    occurredAt: new Date(now - minAgo * 60000).toISOString(),
    sourceUpdatedAt: null,
    fetchedAt: '',
    place: 'Gölyaka (Düzce)',
    url: null,
    reviewStatus: 'unknown' as const,
  };
  return { id: `afad:${id}`, primary, readings: [primary] };
};
const prefs = { quakeNotifications: true, officialNotifications: true, minNotifyMagnitude: 4 };
const sakarya = { latitude: 40.69, longitude: 30.4 };

describe('quakeInboxItems', () => {
  it('yakındaki eşik üstü deprem için öğe üretir', () => {
    const r = quakeInboxItems([ev('1', 4.2, 10)], prefs, sakarya, now);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: 'quake', href: '/deprem/afad:1' });
  });
  it('eşik altını, eskiyi ve büyüklüğü bilinmeyeni atlar', () => {
    expect(quakeInboxItems([ev('1', 3.5, 10), ev('2', 4.5, 60 * 30), ev('3', null, 5)], prefs, sakarya, now)).toEqual([]);
  });
  it('M5+ resmî kayıt Türkiye genelinde gelir; tercih kapalıysa gelmez', () => {
    const van = ev('4', 5.3, 5, 38.5, 43.4);
    expect(quakeInboxItems([van], prefs, sakarya, now)[0]!.kind).toBe('official');
    expect(quakeInboxItems([van], { ...prefs, officialNotifications: false }, sakarya, now)).toEqual([]);
  });
  it('deprem bildirimleri kapalıysa yakın deprem gelmez', () => {
    expect(quakeInboxItems([ev('1', 4.2, 10)], { ...prefs, quakeNotifications: false }, sakarya, now)).toEqual([]);
  });
});

describe('mergeInbox', () => {
  it('tekrar eklemez, okunmuş bilgisini korur, eskiyi atar', () => {
    const a = { id: 'a', kind: 'quake' as const, title: '', body: '', at: new Date(now - 60000).toISOString(), read: true };
    const old = { ...a, id: 'old', at: new Date(now - 8 * 86400_000).toISOString(), read: false };
    const r = mergeInbox([a, old], [{ ...a, read: false }], now);
    expect(r).toHaveLength(1);
    expect(r[0]!.read).toBe(true);
  });
});
