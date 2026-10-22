import type { Fetcher } from '@/features/earthquakes/sources/types';

export const DEFAULT_TIMEOUT_MS = 12000;

export class TimeoutError extends Error {
  constructor(url: string) {
    super(`Zaman aşımı: ${new URL(url).host}`);
    this.name = 'TimeoutError';
  }
}

/** Zaman aşımlı fetch. Hata durumunda istek iptal edilir. */
export const fetchWithTimeout: Fetcher = async (url, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: init?.headers, signal: controller.signal });
    return res;
  } catch (e) {
    if (controller.signal.aborted) throw new TimeoutError(url);
    throw e;
  } finally {
    clearTimeout(timer);
  }
};
