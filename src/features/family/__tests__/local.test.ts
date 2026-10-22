import { buildStatusMessage, formatPhone, normalizePhone } from '../local';

jest.mock('expo-sms', () => ({ isAvailableAsync: jest.fn(), sendSMSAsync: jest.fn() }));

describe('telefon numarası', () => {
  it.each([
    ['0532 123 45 67', '+905321234567'],
    ['532-123-4567', '+905321234567'],
    ['+90 (532) 123 45 67', '+905321234567'],
    ['0090 532 123 45 67', '+905321234567'],
    ['+49 30 1234567', '+49301234567'],
  ])('%s → %s', (raw, out) => expect(normalizePhone(raw)).toBe(out));
  it('geçersizleri reddeder', () => {
    expect(normalizePhone('123')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
  });
  it('okunur biçim', () => expect(formatPhone('+905321234567')).toBe('0532 123 45 67'));
});

describe('durum mesajı', () => {
  const now = new Date('2026-10-22T19:00:00Z');
  it('güvende mesajı; konum yoksa konum eklenmez', () => {
    const m = buildStatusMessage('safe', { location: null, meetingPoint: null, now });
    expect(m).toMatch(/^Ben güvendeyim\./);
    expect(m).not.toMatch(/Konumum/);
    expect(m).toMatch(/22:00/);
  });
  it('yardım mesajı konum, buluşma noktası ve 112 notu içerir', () => {
    const m = buildStatusMessage('need_help', {
      location: { latitude: 40.123456, longitude: 30.654321 },
      meetingPoint: { name: 'Okul bahçesi', note: null, latitude: null, longitude: null, updatedAt: '' },
      now,
    });
    expect(m).toMatch(/Yardıma ihtiyacım var!/);
    expect(m).toMatch(/q=40\.12346,30\.65432/);
    expect(m).toMatch(/Buluşma noktası: Okul bahçesi/);
    expect(m).toMatch(/112/);
  });
});
