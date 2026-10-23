import { evaluateGates, gatesPass, trustErrorMessage, type GateInput, type TrustInfo } from '../rules';
import { isValidBirthYear, isValidTckn, normalizeNamePart } from '../tckn';

const NOW = Date.parse('2026-10-23T12:00:00Z');
const verified: TrustInfo = { verified: true, role: 'user', orgName: null, strikes: 0, suspendedUntil: null };
const here = { latitude: 40.84, longitude: 31.16, accuracy: 12 };
const base = (o: Partial<GateInput> = {}): GateInput => ({
  backend: true,
  signedIn: true,
  trust: verified,
  category: 'road',
  withLocation: true,
  device: here,
  point: here,
  photos: [{ capturedAt: new Date(NOW - 60_000).toISOString() }],
  now: NOW,
  ...o,
});
const state = (i: GateInput, key: string) => evaluateGates(i).find((g) => g.key === key)!.state;

describe('yayın kontrolleri (kimlik → konum → canlı fotoğraf → topluluk)', () => {
  it('tüm şartlar sağlanınca yayınlanabilir (Kullanıcı Bildirimi)', () => {
    const g = evaluateGates(base());
    expect(gatesPass(g)).toBe(true);
    expect(g.find((x) => x.key === 'community')!.title).toMatch(/Kullanıcı Bildirimi/);
  });
  it('kimliği doğrulanmamış kullanıcı yayınlayamaz', () => {
    const i = base({ trust: { ...verified, verified: false } });
    expect(state(i, 'identity')).toBe('todo');
    expect(gatesPass(evaluateGates(i))).toBe(false);
  });
  it('askıdaki hesap engellenir', () => {
    const i = base({ trust: { ...verified, strikes: 1, suspendedUntil: new Date(NOW + 86400_000).toISOString() } });
    expect(state(i, 'identity')).toBe('blocked');
  });
  it('sunucu yoksa engellenir', () => expect(state(base({ backend: false }), 'identity')).toBe('blocked'));
  it('yol bildiriminde canlı konum zorunlu', () => expect(state(base({ device: null, withLocation: false }), 'location')).toBe('todo'));
  it('zayıf GPS kabul edilmez', () => expect(state(base({ device: { ...here, accuracy: 250 } }), 'location')).toBe('todo'));
  it('1 km dışındaki nokta bildirilemez', () =>
    expect(state(base({ point: { latitude: 41.0082, longitude: 28.9784 } }), 'location')).toBe('blocked'));
  it('hasar/yol için canlı fotoğraf zorunlu, eski fotoğraf geçmez', () => {
    expect(state(base({ photos: [] }), 'photo')).toBe('todo');
    expect(state(base({ photos: [{ capturedAt: new Date(NOW - 30 * 60_000).toISOString() }] }), 'photo')).toBe('todo');
  });
  it('"Güvendeyim" için fotoğraf ve konum isteğe bağlı', () => {
    const i = base({ category: 'safe', withLocation: false, device: null, point: null, photos: [] });
    expect(gatesPass(evaluateGates(i))).toBe(true);
  });
  it('kurumsal hesap konum/fotoğraf şartından muaf ve "Resmî" yayınlar', () => {
    const i = base({ trust: { ...verified, role: 'official', orgName: 'AFAD' }, device: null, photos: [], point: here });
    const g = evaluateGates(i);
    expect(gatesPass(g)).toBe(true);
    expect(g.find((x) => x.key === 'community')!.title).toBe('Resmî bilgi');
  });
});

describe('sunucu hata mesajları', () => {
  it('kural hatalarını Türkçeye çevirir', () => {
    expect(trustErrorMessage('new row violates: too_far')).toMatch(/uzak/);
    expect(trustErrorMessage('photo_not_live')).toMatch(/kamerasıyla/);
    expect(trustErrorMessage('identity_required')).toMatch(/kimlik/);
    expect(trustErrorMessage('başka bir hata')).toBeNull();
  });
});

describe('T.C. kimlik no biçimi', () => {
  it('sağlama haneleri', () => {
    expect(isValidTckn('10000000146')).toBe(true);
    expect(isValidTckn('10000000147')).toBe(false);
    expect(isValidTckn('01234567890')).toBe(false);
  });
  it('ad normalleştirme ve doğum yılı', () => {
    expect(normalizeNamePart(' ismail  ılık ')).toBe('İSMAİL ILIK');
    expect(isValidBirthYear(1899)).toBe(false);
  });
});
