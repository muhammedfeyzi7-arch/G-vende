import { STALE_AFTER_MS, buildServerSnapshot, healthFromSync, upsertReading, upsertSync, type SyncRow } from '../serverFeed';
import type { SourceReading } from '../../../types/earthquake';

const now = Date.parse('2026-10-23T12:00:00Z');
const ago = (ms: number) => new Date(now - ms).toISOString();
const reading = (source: SourceReading['source'], id: string, mag = 3): SourceReading => ({
  source,
  sourceEventId: id,
  magnitude: mag,
  magnitudeType: 'ML',
  latitude: 40,
  longitude: 30,
  depthKm: 7,
  occurredAt: ago(30 * 60_000),
  sourceUpdatedAt: null,
  fetchedAt: ago(29 * 60_000),
  place: 'X',
  url: null,
  reviewStatus: 'unknown',
});
const sync = (source: string, patch: Partial<SyncRow> = {}): SyncRow => ({
  source,
  status: 'ok',
  last_attempt_at: ago(60_000),
  last_success_at: ago(60_000),
  last_event_at: ago(30 * 60_000),
  last_error: null,
  consecutive_failures: 0,
  ...patch,
});

describe('sunucu akışı', () => {
  it('kaynak durumu: güncel, hatalı, gecikmiş ve hiç senkronlanmamış ayrılır', () => {
    const h = healthFromSync(
      [
        sync('afad'),
        sync('kandilli', { status: 'error', last_error: 'HTTP 503', last_success_at: ago(5 * 60_000) }),
        sync('emsc', { last_success_at: ago(STALE_AFTER_MS + 1) }),
      ],
      [reading('afad', '1')],
      ['afad', 'kandilli', 'emsc', 'usgs'],
      now,
    );
    expect(h.map((x) => [x.source, x.ok, x.error])).toEqual([
      ['afad', true, null],
      ['kandilli', false, 'HTTP 503'],
      ['emsc', false, 'Senkron gecikti'],
      ['usgs', false, 'Sunucu bu kaynağı henüz senkronize etmedi'],
    ]);
    expect(h[0]!.count).toBe(1);
    expect(h[0]!.lastEventAt).toBe(ago(30 * 60_000));
  });

  it('son başarılı senkron eskiyse veri eski olarak işaretlenir (yeniymiş gibi sunulmaz)', () => {
    expect(buildServerSnapshot([], [sync('afad')], ['afad'], now).stale).toBe(false);
    const old = buildServerSnapshot([], [sync('afad', { last_success_at: ago(STALE_AFTER_MS + 60_000) })], ['afad'], now);
    expect(old.stale).toBe(true);
    expect(buildServerSnapshot([], [], ['afad'], now)).toMatchObject({ stale: true, lastSuccessAt: null, via: 'server' });
  });

  it('kaynaklar arası aynı olay birleştirilir', () => {
    const s = buildServerSnapshot([reading('afad', '1'), reading('kandilli', 'k1')], [sync('afad')], ['afad', 'kandilli'], now);
    expect(s.events).toHaveLength(1);
    expect(s.events[0]!.readings).toHaveLength(2);
  });

  it('Realtime: yeni okuma eklenir, güncellenen değiştirilir, tekrar eklenmez', () => {
    let list = [reading('afad', '1')];
    list = upsertReading(list, reading('afad', '2'));
    list = upsertReading(list, { ...reading('afad', '1'), magnitude: 4.1 });
    expect(list).toHaveLength(2);
    expect(list.find((r) => r.sourceEventId === '1')!.magnitude).toBe(4.1);
    expect(upsertSync([sync('afad')], sync('afad', { status: 'error' }))).toHaveLength(1);
  });
});
