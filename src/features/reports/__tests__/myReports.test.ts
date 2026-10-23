import type { UserReport } from '@/types/report';
import { syncMyReports, type MyReport } from '../myReports';

const NOW = Date.parse('2026-10-23T12:00:00Z');
const mine = (o: Partial<MyReport> = {}): MyReport => ({
  clientId: 'c1',
  serverId: 's1',
  category: 'road',
  description: '',
  areaLabel: null,
  createdAt: new Date(NOW - 3600_000).toISOString(),
  state: 'sent',
  verification: 'unverified',
  ...o,
});
const feed = (o: Partial<UserReport> = {}) =>
  ({ id: 's1', verification: 'unverified', confirmCount: 0, denyCount: 0, ...o }) as UserReport;

describe('Bildirimlerim eşitleme', () => {
  it('topluluk onayı gelince "doğrulandı" değişikliği üretir', () => {
    const r = syncMyReports([mine()], [feed({ verification: 'community', confirmCount: 3 })], NOW);
    expect(r.changes).toEqual([expect.objectContaining({ kind: 'verified' })]);
    expect(r.next[0]).toMatchObject({ verification: 'community', confirmCount: 3 });
  });
  it('akıştan kaybolan genç bildirim bir kez "yayında değil" olur', () => {
    const r = syncMyReports([mine()], [], NOW);
    expect(r.changes[0]?.kind).toBe('gone');
    expect(syncMyReports(r.next, [], NOW).changes).toHaveLength(0);
  });
  it('bekleyen bildirimlere dokunmaz', () => {
    const r = syncMyReports([mine({ state: 'pending', serverId: null })], [], NOW);
    expect(r.changes).toHaveLength(0);
  });
});
