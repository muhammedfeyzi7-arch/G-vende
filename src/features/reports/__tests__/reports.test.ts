import type { NewReportInput } from '@/types/report';
import { reportHeadline } from '../categories';
import { applyOutcome, enqueue, isRetryable, MAX_ATTEMPTS, nextAttemptDelayMs } from '../pendingQueue';
import { validateReport } from '../validation';

const input = (o: Partial<NewReportInput> = {}): NewReportInput => ({
  clientId: 'c1',
  category: 'shake',
  feltIntensity: 3,
  description: '',
  location: null,
  areaLabel: null,
  earthquakeEventId: null,
  photos: [],
  ...o,
});

describe('validateReport', () => {
  it('geçerli sarsıntı bildirimi', () => expect(validateReport(input())).toEqual({ ok: true, warnings: [] }));
  it('uzun açıklamayı reddeder', () => expect(validateReport(input({ description: 'a'.repeat(501) })).ok).toBe(false));
  it('fazla fotoğrafı reddeder', () => expect(validateReport(input({ photos: ['1', '2', '3', '4'] })).ok).toBe(false));
  it('sarsıntı dışı kategoride şiddeti reddeder', () => expect(validateReport(input({ category: 'road' })).ok).toBe(false));
  it('"Diğer" için açıklama ister', () => expect(validateReport(input({ category: 'other', feltIntensity: null })).ok).toBe(false));
  it('telefon numarasında uyarır', () => {
    const r = validateReport(input({ description: 'Beni arayın 0532 123 45 67' }));
    expect(r.ok && r.warnings.length).toBe(1);
  });
});

describe('bekleyen kuyruk', () => {
  const now = new Date('2026-10-22T19:00:00Z');
  it('aynı clientId iki kez eklenmez', () => {
    const q = enqueue(enqueue([], input(), now), input(), now);
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ attempts: 0, serverId: null, lastError: null });
  });
  it('başarılı gönderimde kuyruktan çıkar', () => {
    expect(applyOutcome(enqueue([], input(), now), 'c1', { kind: 'sent', serverId: 's' })).toEqual([]);
  });
  it('ağ hatasında deneme sayısını artırır, kuyrukta tutar', () => {
    const q = applyOutcome(enqueue([], input(), now), 'c1', { kind: 'retry', error: 'Bağlantı yok' });
    expect(q[0]).toMatchObject({ attempts: 1, lastError: 'Bağlantı yok' });
    expect(isRetryable(q[0]!)).toBe(true);
  });
  it('kısmi gönderimde sunucu kimliğini saklar (tekrar kayıt oluşturulmaz)', () => {
    const q = applyOutcome(enqueue([], input({ photos: ['a'] }), now), 'c1', { kind: 'partial', serverId: 'srv', error: 'foto' });
    expect(q[0]!.serverId).toBe('srv');
  });
  it('kalıcı hatada otomatik tekrar denemez', () => {
    const q = applyOutcome(enqueue([], input(), now), 'c1', { kind: 'fatal', error: 'yetki' });
    expect(q[0]!.attempts).toBe(MAX_ATTEMPTS);
    expect(isRetryable(q[0]!)).toBe(false);
  });
  it('üstel geri çekilme 30 dk ile sınırlı', () => {
    expect(nextAttemptDelayMs(0)).toBe(30_000);
    expect(nextAttemptDelayMs(2)).toBe(120_000);
    expect(nextAttemptDelayMs(20)).toBe(30 * 60_000);
  });
});

describe('başlıklar', () => {
  it('kategori ve şiddetten türetilir', () => {
    expect(reportHeadline('shake', 4)).toBe('Sarsıntı çok güçlü hissedildi.');
    expect(reportHeadline('road', null)).toBe('Yolda geçiş engeli var.');
  });
});
