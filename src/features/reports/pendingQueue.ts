import type { NewReportInput, PendingReport } from '@/types/report';

/**
 * Gönderilemeyen bildirimler için saf (yan etkisiz) kuyruk işlemleri.
 * Depolama ve ağ katmanı ayrı tutulur; böylece mantık birim testleriyle doğrulanabilir.
 */
export const MAX_ATTEMPTS = 8;

export function enqueue(queue: PendingReport[], input: NewReportInput, now = new Date()): PendingReport[] {
  if (queue.some((q) => q.clientId === input.clientId)) return queue;
  return [...queue, { ...input, createdAt: now.toISOString(), attempts: 0, lastError: null, serverId: null }];
}

export type SendOutcome =
  | { kind: 'sent'; serverId: string }
  /** Bildirim oluşturuldu ama fotoğraflar yüklenemedi */
  | { kind: 'partial'; serverId: string; error: string }
  /** Tekrar denenebilir (ağ, zaman aşımı) */
  | { kind: 'retry'; error: string }
  /** Kalıcı hata (doğrulama, yetki) — kuyrukta hata olarak kalır, kullanıcı silebilir */
  | { kind: 'fatal'; error: string };

export function applyOutcome(queue: PendingReport[], clientId: string, outcome: SendOutcome): PendingReport[] {
  return queue.flatMap((q) => {
    if (q.clientId !== clientId) return [q];
    switch (outcome.kind) {
      case 'sent':
        return [];
      case 'partial':
        return [{ ...q, serverId: outcome.serverId, attempts: q.attempts + 1, lastError: outcome.error }];
      case 'retry':
        return [{ ...q, attempts: q.attempts + 1, lastError: outcome.error }];
      case 'fatal':
        return [{ ...q, attempts: MAX_ATTEMPTS, lastError: outcome.error }];
    }
  });
}

export const isRetryable = (q: PendingReport) => q.attempts < MAX_ATTEMPTS;

/** Üstel geri çekilme: 30 sn, 1 dk, 2 dk ... en fazla 30 dk */
export function nextAttemptDelayMs(attempts: number): number {
  return Math.min(30_000 * 2 ** attempts, 30 * 60_000);
}
