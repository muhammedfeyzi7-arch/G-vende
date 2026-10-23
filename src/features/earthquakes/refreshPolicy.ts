/**
 * Uygulamanın deprem verisini ne sıklıkla yeniden okuyacağı. Kaynaklar (AFAD, Kandilli…) cihazlardan
 * değil sunucudan 2 dakikada bir sorgulanır; cihazlar yalnızca GÜVENDE sunucusunu okur ve yeni
 * kayıtlar Realtime ile anında gelir. Büyük bir deprem anında binlerce cihazın aynı saniyede
 * istek atmaması için:
 *  - canlı bağlantı açıkken yoklama seyrek (15 dk; yalnızca kaçırılan olay için güvenlik ağı),
 *  - hata/eski veri durumunda bekleme katlanarak uzar (en fazla 15 dk),
 *  - her aralığa ±%20 rastgele kaydırma eklenir (istekler zamana yayılır).
 */
export const DIRECT_REFRESH_MS = 60_000;
export const SERVER_REFRESH_MS = 5 * 60_000;
export const LIVE_REFRESH_MS = 15 * 60_000;
export const MAX_REFRESH_MS = 15 * 60_000;
/** Realtime yeniden bağlanınca okumadan önce rastgele bekleme (hepsi aynı anda okumasın). */
export const RECONNECT_SPREAD_MS = 5_000;

export function nextRefreshDelay(o: { hasServer: boolean; live: boolean; failures: number; random?: number }): number {
  const base = !o.hasServer ? DIRECT_REFRESH_MS : o.live ? LIVE_REFRESH_MS : SERVER_REFRESH_MS;
  const backed = Math.min(MAX_REFRESH_MS, base * 2 ** Math.min(o.failures, 6));
  const jitter = 0.8 + 0.4 * (o.random ?? Math.random());
  return Math.round(backed * jitter);
}
