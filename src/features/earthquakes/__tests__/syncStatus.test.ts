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
