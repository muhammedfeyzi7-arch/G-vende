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
  it('açık adres varsa harita bağlantısından önce yazılır; konum yoksa adres de eklenmez', () => {
    const loc = { latitude: 40.1, longitude: 30.6 };
    const m = buildStatusMessage('safe', {
      location: loc,
      meetingPoint: null,
      now,
      address: 'Cumhuriyet Mah., Atatürk Cad. No: 12, Merkez / Düzce',
    });
    expect(m).toMatch(/Adresim: Cumhuriyet Mah\., Atatürk Cad\. No: 12, Merkez \/ Düzce\. Konumum: https/);
    expect(buildStatusMessage('safe', { location: null, meetingPoint: null, now, address: 'X' })).not.toMatch(/Adresim/);
  });
});

describe('enkaz altındayım mesajı', () => {
  const now = new Date('2026-10-23T12:00:00Z');
  it('kat, bina tarifi, adres ve konum içerir; buluşma noktası eklenmez', () => {
    const m = buildStatusMessage('trapped', {
      location: { latitude: 40.84, longitude: 31.16 },
      address: 'Cumhuriyet Mah., Merkez / Düzce',
      floor: '4. kat',
      note: 'Gül Apt. daire 7',
      meetingPoint: { name: 'Park', latitude: 1, longitude: 1 } as never,
      now,
    });
    expect(m).toMatch(/^ENKAZ ALTINDAYIM!/);
    expect(m).toContain('Bulunduğum kat: 4. kat.');
    expect(m).toContain('Gül Apt. daire 7');
    expect(m).toContain('maps.google.com/?q=40.84000,31.16000');
    expect(m).not.toContain('Buluşma noktası');
    expect(m).toContain('siren');
  });
  it('"güvendeyim" mesajına kat eklenmez', () => {
    expect(buildStatusMessage('safe', { location: null, meetingPoint: null, floor: '4. kat', now })).not.toContain('kat');
  });
});
