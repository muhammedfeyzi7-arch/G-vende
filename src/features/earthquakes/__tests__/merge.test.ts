import { readFileSync } from 'fs';
import { join } from 'path';
import type { SourceReading } from '@/types/earthquake';
import { mergeReadings } from '../merge';
import { parseAfad } from '../sources/afad';
import { parseKandilli } from '../sources/kandilli';
import { parseUsgs } from '../sources/usgs';

const fx = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');
const T = '2026-10-22T19:00:00.000Z';

const reading = (o: Partial<SourceReading>): SourceReading => ({
  source: 'afad',
  sourceEventId: '1',
  magnitude: 3,
  magnitudeType: 'ML',
  latitude: 40,
  longitude: 30,
  depthKm: 10,
  occurredAt: '2026-10-22T10:00:00.000Z',
  sourceUpdatedAt: null,
  fetchedAt: T,
  place: null,
  url: null,
  reviewStatus: 'unknown',
  ...o,
});

describe('mergeReadings', () => {
  it('üç kaynaktan gelen aynı Düzce olayını tek olayda birleştirir, özgün değerleri korur', () => {
    const all = [...parseUsgs(fx('usgs.json'), T), ...parseKandilli(fx('kandilli.txt'), T), ...parseAfad(fx('afad.json'), T)];
    const events = mergeReadings(all);
    const duzce = events.find((e) => e.readings.some((r) => r.sourceEventId === '700001'))!;
    expect(duzce.primary.source).toBe('afad');
    expect(duzce.readings.map((r) => r.source).sort()).toEqual(['afad', 'kandilli', 'usgs']);
    expect(duzce.readings.map((r) => r.magnitude).sort()).toEqual([4.6, 4.8, 4.9]);
  });

  it('uzak veya zamanca ayrı olayları birleştirmez', () => {
    const a = reading({ source: 'afad', sourceEventId: 'a' });
    const far = reading({ source: 'usgs', sourceEventId: 'b', latitude: 38 });
    const late = reading({ source: 'kandilli', sourceEventId: 'c', occurredAt: '2026-10-22T10:05:00.000Z' });
    expect(mergeReadings([a, far, late])).toHaveLength(3);
  });

  it('büyüklükleri çok farklı olayları birleştirmez', () => {
    const a = reading({ source: 'afad', sourceEventId: 'a', magnitude: 2 });
    const b = reading({ source: 'usgs', sourceEventId: 'b', magnitude: 5.5 });
    expect(mergeReadings([a, b])).toHaveLength(2);
  });

  it('aynı kaynaktan gelen iki ayrı olayı aynı kümeye koymaz', () => {
    const a = reading({ source: 'afad', sourceEventId: 'a' });
    const b = reading({ source: 'afad', sourceEventId: 'b', occurredAt: '2026-10-22T10:00:20.000Z' });
    expect(mergeReadings([a, b])).toHaveLength(2);
  });

  it('aynı kaynak kimliği tekrarlanırsa en güncelini tutar', () => {
    const old = reading({ magnitude: 3.0, sourceUpdatedAt: '2026-10-22T10:01:00.000Z' });
    const upd = reading({ magnitude: 3.2, sourceUpdatedAt: '2026-10-22T10:03:00.000Z' });
    const ev = mergeReadings([old, upd]);
    expect(ev).toHaveLength(1);
    expect(ev[0]!.primary.magnitude).toBe(3.2);
  });

  it('olayları yeniden eskiye sıralar', () => {
    const a = reading({ sourceEventId: 'a', occurredAt: '2026-10-22T09:00:00.000Z' });
    const b = reading({ sourceEventId: 'b', occurredAt: '2026-10-22T11:00:00.000Z' });
    expect(mergeReadings([a, b]).map((e) => e.id)).toEqual(['afad:b', 'afad:a']);
  });
});
