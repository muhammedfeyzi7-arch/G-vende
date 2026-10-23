import { quakeStatus } from '../HomeScreen';

const snap = (over = {}) => ({ events: [], health: [], lastSuccessAt: new Date().toISOString(), stale: false, via: 'server' as const, ...over });

describe('Ana sayfa deprem durumu', () => {
  it('veri yokken kesin ifade kullanmaz', () => {
    expect(quakeStatus({ kind: 'none' }, null, true, true)).toMatchObject({ tone: 'unknown', text: 'Deprem verileri yükleniyor…' });
    expect(quakeStatus({ kind: 'none' }, null, false, true).text).toMatch(/alınamadı/);
  });
  it('eski/önbellek verisinde uyarır', () => {
    expect(quakeStatus({ kind: 'none' }, snap({ stale: true }), false, true).tone).toBe('warn');
    expect(quakeStatus({ kind: 'none' }, snap({ via: 'cache' }), false, true).tone).toBe('warn');
  });
  it('güncel veride kayda dayalı ifade; konum yoksa ülke geneli eşiği', () => {
    expect(quakeStatus({ kind: 'none' }, snap(), false, true)).toMatchObject({ tone: 'ok', text: expect.stringMatching(/yakınınızda önemli bir deprem kaydı yok/) });
    expect(quakeStatus({ kind: 'none' }, snap(), false, false).text).toMatch(/Türkiye genelinde 5 ve üzeri/);
  });
});
