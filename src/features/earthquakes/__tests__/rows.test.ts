import { readingToRow, rowToReading, type ReadingRow } from '../rows';

const row: ReadingRow = {
  source: 'afad',
  source_event_id: '123',
  magnitude: '4.8',
  magnitude_type: 'ML',
  latitude: 40.77,
  longitude: 30.99,
  depth_km: '10.00',
  occurred_at: '2026-10-23T09:00:00+00:00',
  source_updated_at: null,
  fetched_at: '2026-10-23T09:02:00+00:00',
  place: 'Gölyaka (Düzce)',
  url: 'https://deprem.afad.gov.tr/event-detail/123',
  review_status: 'reviewed',
};

describe('rowToReading', () => {
  it('veritabanı satırını gidiş-dönüş eşler (metin sayıları sayıya çevrilir)', () => {
    const r = rowToReading(row)!;
    expect(r).toMatchObject({ source: 'afad', magnitude: 4.8, depthKm: 10, occurredAt: '2026-10-23T09:00:00.000Z' });
    const back = readingToRow(r, '2026-10-23T09:05:00.000Z');
    expect(back).toMatchObject({ source: 'afad', source_event_id: '123', magnitude: 4.8, updated_at: '2026-10-23T09:05:00.000Z' });
  });
  it('eksik büyüklüğü null bırakır; bilinmeyen kaynak ve bozuk zamanı atlar', () => {
    expect(rowToReading({ ...row, magnitude: null })!.magnitude).toBeNull();
    expect(rowToReading({ ...row, source: 'sahte' })).toBeNull();
    expect(rowToReading({ ...row, occurred_at: 'x' })).toBeNull();
  });
});
