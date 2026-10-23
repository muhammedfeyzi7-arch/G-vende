import { SourceError } from '../sources/types';
import {
  MAX_LOOKBACK_MS,
  OVERLAP_MS,
  backoffUntil,
  changedReadings,
  isRetryable,
  missingFields,
  readingKey,
  sampleKeys,
  shouldAttempt,
  syncSince,
  withRetry,
  type StoredReading,
} from '../sync';
import type { SourceReading } from '../../../types/earthquake';

const now = new Date('2026-10-23T12:00:00Z');

describe('senkron penceresi', () => {
  it('ilk çalıştırmada en fazla 24 saat geriye bakar', () => {
    expect(syncSince(null, now).getTime()).toBe(now.getTime() - MAX_LOOKBACK_MS);
  });
  it('son başarılı çekimden örtüşmeyle başlar', () => {
    const last = new Date(now.getTime() - 5 * 60_000).toISOString();
    expect(syncSince({ last_success_at: last }, now).getTime()).toBe(Date.parse(last) - OVERLAP_MS);
  });
  it('uzun kesintiden sonra 24 saatle sınırlıdır', () => {
    expect(syncSince({ last_success_at: '2026-10-01T00:00:00Z' }, now).getTime()).toBe(now.getTime() - MAX_LOOKBACK_MS);
  });
});

describe('üstel bekleme', () => {
  it('ardışık hatalarda 1, 2, 4… dk, en fazla 60 dk', () => {
    const mins = [1, 2, 3, 7, 20].map((f) => (backoffUntil(f, now).getTime() - now.getTime()) / 60_000);
    expect(mins).toEqual([1, 2, 4, 60, 60]);
  });
  it('bekleme süresi dolmadan denemez', () => {
    expect(shouldAttempt({ next_attempt_at: '2026-10-23T12:05:00Z' }, now)).toBe(false);
    expect(shouldAttempt({ next_attempt_at: '2026-10-23T11:59:00Z' }, now)).toBe(true);
    expect(shouldAttempt(null, now)).toBe(true);
  });
});

describe('yeniden deneme', () => {
  it('ağ hatası ve 5xx yeniden denenir, bozuk yanıt denenmez', () => {
    expect(isRetryable(new TypeError('Network request failed'))).toBe(true);
    expect(isRetryable(new SourceError('afad', 'AFAD HTTP 503'))).toBe(true);
    expect(isRetryable(new SourceError('afad', 'AFAD HTTP 429'))).toBe(true);
    expect(isRetryable(new SourceError('afad', 'AFAD HTTP 404'))).toBe(false);
    expect(isRetryable(new SourceError('afad', 'AFAD yanıtı JSON değil'))).toBe(false);
  });
  it('geçici hatadan sonra başarır; kalıcı hatada hemen bırakır', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const fn = jest.fn().mockRejectedValueOnce(new TypeError('timeout')).mockResolvedValue('ok');
    await expect(withRetry(fn, { sleep })).resolves.toBe('ok');
    expect(sleep).toHaveBeenCalledWith(1000);

    const bad = jest.fn().mockRejectedValue(new SourceError('afad', 'AFAD yanıtı JSON değil'));
    await expect(withRetry(bad, { sleep })).rejects.toThrow('JSON');
    expect(bad).toHaveBeenCalledTimes(1);
  });
  it('3 denemeden sonra son hatayı fırlatır', async () => {
    const fn = jest.fn().mockRejectedValue(new TypeError('down'));
    await expect(withRetry(fn, { sleep: async () => {} })).rejects.toThrow('down');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('değişen okumalar', () => {
  const r: SourceReading = {
    source: 'afad',
    sourceEventId: '1',
    magnitude: 4.83,
    magnitudeType: 'ML',
    latitude: 40.1,
    longitude: 30.2,
    depthKm: 7.123,
    occurredAt: '2026-10-23T11:00:00.000Z',
    sourceUpdatedAt: null,
    fetchedAt: now.toISOString(),
    place: 'Gölyaka (Düzce)',
    url: null,
    reviewStatus: 'unknown',
  };
  const stored: StoredReading = {
    source: 'afad',
    source_event_id: '1',
    magnitude: '4.8',
    magnitude_type: 'ML',
    latitude: 40.1,
    longitude: 30.2,
    depth_km: '7.12',
    occurred_at: '2026-10-23T11:00:00+00:00',
    source_updated_at: null,
    place: 'Gölyaka (Düzce)',
    review_status: 'unknown',
  };
  it('aynı kayıt (sütun hassasiyetinde) yeniden yazılmaz', () => {
    expect(changedReadings([r], new Map([[readingKey(r), stored]]))).toEqual([]);
  });
  it('yeni kayıt ve kaynak revizyonu yazılır', () => {
    expect(changedReadings([r], new Map())).toHaveLength(1);
    const revised = { ...r, magnitude: 5.0, reviewStatus: 'reviewed' as const, sourceUpdatedAt: '2026-10-23T11:20:00Z' };
    expect(changedReadings([revised], new Map([[readingKey(r), stored]]))).toHaveLength(1);
  });
});

describe('şema gözlemi', () => {
  it('AFAD yanıtındaki alan adlarını çıkarır ve eksikleri bulur', () => {
    const keys = sampleKeys(
      'afad',
      JSON.stringify([{ eventID: '1', latitude: '1', longitude: '2', depth: '3', magnitude: '4', date: 'x', type: 'ML' }]),
    );
    expect(keys).toContain('eventID');
    expect(missingFields('afad', keys)).toEqual([]);
    expect(missingFields('afad', ['eventId', 'lat'])).toContain('eventID');
  });
  it('EMSC özelliklerini okur; bozuk yanıtta null', () => {
    expect(sampleKeys('emsc', '{"features":[{"properties":{"unid":"a","time":"t","lat":1,"lon":2,"mag":3}}]}')).toEqual([
      'lat',
      'lon',
      'mag',
      'time',
      'unid',
    ]);
    expect(sampleKeys('afad', '<html>')).toBeNull();
  });
});

describe('AFAD gerçek şeması', () => {
  // 2026-10-23'te üretim senkronunun AFAD'dan aldığı gerçek yanıtta gözlenen alan adları (quake_sync_state.sample_keys).
  const OBSERVED = [
    'country',
    'date',
    'depth',
    'district',
    'eventID',
    'isEventUpdate',
    'lastUpdateDate',
    'latitude',
    'location',
    'longitude',
    'magnitude',
    'neighborhood',
    'province',
    'rms',
    'type',
  ];
  it('ayrıştırıcının gerektirdiği tüm alanlar canlı yanıtta var', () => {
    expect(missingFields('afad', OBSERVED)).toEqual([]);
  });
  it('test örneği canlı yanıtla aynı alan kümesini kullanır', () => {
    const fixture = require('./fixtures/afad.json') as Record<string, unknown>[];
    expect(Object.keys(fixture[0]!).sort()).toEqual(OBSERVED);
  });
});
