import type { ReportCategory, UserReport, Verification } from '@/types/report';

/** Kullanıcının bu cihazdan gönderdiği bildirimlerin yerel kaydı (sunucu yazar kimliğini istemciye vermez). */
export interface MyReport {
  clientId: string;
  serverId: string | null;
  category: ReportCategory;
  description: string;
  areaLabel: string | null;
  createdAt: string;
  state: 'pending' | 'sent' | 'failed';
  error?: string | null;
  /** Son bilinen doğrulama durumu (akıştan) */
  verification?: Verification | null;
  confirmCount?: number;
  denyCount?: number;
  /** Akışta artık görünmüyorsa (kaldırıldı, gizlendi veya süresi doldu) */
  missing?: boolean;
}

export type MyReportChange = { report: MyReport; kind: 'verified' | 'official' | 'gone' };

/**
 * Akıştaki güncel duruma göre kayıtları günceller ve kullanıcıya bildirilecek değişiklikleri döndürür.
 * Akış yalnızca son 48 saati içerdiği için daha eski kayıtlar "kayboldu" sayılmaz.
 */
export function syncMyReports(mine: MyReport[], feed: UserReport[], now = Date.now()): { next: MyReport[]; changes: MyReportChange[] } {
  const byId = new Map(feed.map((r) => [r.id, r]));
  const changes: MyReportChange[] = [];
  const next = mine.map((m) => {
    if (m.state !== 'sent' || !m.serverId || m.serverId === 'duplicate') return m;
    const r = byId.get(m.serverId);
    if (!r) {
      const young = now - Date.parse(m.createdAt) < 47 * 3600_000;
      if (young && !m.missing) {
        const u = { ...m, missing: true };
        changes.push({ report: u, kind: 'gone' });
        return u;
      }
      return m;
    }
    const u = { ...m, missing: false, verification: r.verification, confirmCount: r.confirmCount, denyCount: r.denyCount };
    if (m.verification !== 'community' && r.verification === 'community') changes.push({ report: u, kind: 'verified' });
    return u;
  });
  return { next, changes };
}
