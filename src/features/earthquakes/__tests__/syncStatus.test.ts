import { syncStatusText } from '../components/SyncStatusLine';
import type { QuakeSnapshot } from '../repository';

const base: QuakeSnapshot = {
  events: [],
  health: [{ source: 'afad', ok: true, lastAttemptAt: null, lastSuccessAt: new Date().toISOString(), error: null, count: 3 }],
  lastSuccessAt: new Date().toISOString(),
  stale: false,
  via: 'server',
};

describe('senkron durum satırı', () => {
  it('güncel veride kaynak, son senkron ve canlı bağlantıyı gösterir', () => {
    const r = syncStatusText(base, 'connected');
    expect(r.warn).toBe(false);
    expect(r.text).toContain('Kaynak: AFAD');
    expect(r.text).toContain('canlı bağlantı açık');
  });
  it('eski veriyi açıkça eski olarak gösterir', () => {
    const r = syncStatusText({ ...base, stale: true }, 'connected');
    expect(r.warn).toBe(true);
    expect(r.text).toContain('güncel değil');
  });
  it('doğrudan kaynak yolunu belirtir', () => {
    expect(syncStatusText({ ...base, via: 'direct' }, 'off').text).toContain('kaynaklardan doğrudan');
  });
});

describe('hata metinleri', () => {
  const { trError } = require('../../home/tabs');
  it('ağ hatalarını Türkçeleştirir', () => {
    expect(trError('Failed to fetch')).toBe('Bağlantı kurulamadı');
    expect(trError('AFAD HTTP 503')).toBe('Kaynak sunucusu geçici olarak hata veriyor');
    expect(trError(null)).toBe('Ulaşılamadı');
    expect(trError('Senkron gecikti')).toBe('Senkron gecikti');
  });
});
