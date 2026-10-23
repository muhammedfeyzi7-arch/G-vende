import { GENERIC_MESSAGE, NETWORK_MESSAGE, userMessage, UserError } from '../errors';

describe('kullanıcıya gösterilen hata metni', () => {
  it('bağlantı hataları dostça uyarıya çevrilir (teknik metin görünmez)', () => {
    const cases: unknown[] = [
      Object.assign(new Error('Failed to fetch'), { name: 'AJAXError', status: 0 }),
      new TypeError('Network request failed'),
      new TypeError('Load failed'),
      Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }),
      { message: 'FetchError: request to https://x failed, reason: getaddrinfo ENOTFOUND x' },
      new Error('HTTP 503'),
    ];
    for (const e of cases) expect(userMessage(e)).toBe(NETWORK_MESSAGE);
  });
  it('bilinmeyen teknik hatalar genel mesaja dönüşür', () => {
    for (const e of [new Error('relation "x" does not exist'), { code: 'PGRST301', message: 'JSON object requested' }, new Error('undefined is not a function')])
      expect(userMessage(e)).toBe(GENERIC_MESSAGE);
    expect(userMessage(null, 'Özel')).toBe('Özel');
  });
  it('uygulamanın kendi Türkçe hataları ve kural hataları korunur', () => {
    expect(userMessage(new UserError('Bu bildirimi zaten oyladınız.'))).toBe('Bu bildirimi zaten oyladınız.');
    expect(userMessage({ message: 'new row violates: too_far' })).toMatch(/uzak/);
    expect(userMessage({ message: 'no_recent_quake' })).toMatch(/72 saat/);
    expect(userMessage({ message: 'JWT expired' })).toMatch(/yeniden giriş/);
  });
});
