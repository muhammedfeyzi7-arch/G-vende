import { DIRECT_REFRESH_MS, LIVE_REFRESH_MS, MAX_REFRESH_MS, nextRefreshDelay, SERVER_REFRESH_MS } from '../refreshPolicy';

describe('yenileme sıklığı', () => {
  const mid = 0.5; // kaydırma yok (×1.0)
  it('canlı bağlantı açıkken seyrek, sunucu yokken sık', () => {
    expect(nextRefreshDelay({ hasServer: true, live: true, failures: 0, random: mid })).toBe(LIVE_REFRESH_MS);
    expect(nextRefreshDelay({ hasServer: true, live: false, failures: 0, random: mid })).toBe(SERVER_REFRESH_MS);
    expect(nextRefreshDelay({ hasServer: false, live: false, failures: 0, random: mid })).toBe(DIRECT_REFRESH_MS);
  });
  it('hata oldukça bekleme katlanır, en fazla 15 dk', () => {
    expect(nextRefreshDelay({ hasServer: false, live: false, failures: 2, random: mid })).toBe(4 * DIRECT_REFRESH_MS);
    expect(nextRefreshDelay({ hasServer: true, live: false, failures: 10, random: mid })).toBe(MAX_REFRESH_MS);
  });
  it('±%20 rastgele kaydırma: istekler aynı saniyeye yığılmaz', () => {
    expect(nextRefreshDelay({ hasServer: true, live: false, failures: 0, random: 0 })).toBe(SERVER_REFRESH_MS * 0.8);
    expect(nextRefreshDelay({ hasServer: true, live: false, failures: 0, random: 1 })).toBe(SERVER_REFRESH_MS * 1.2);
  });
});
