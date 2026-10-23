import { shouldAskCheckIn } from '../CheckInCard';
import type { AlertState } from '../../earthquakes/alertState';

const event = {
  id: 'afad:1',
  primary: { occurredAt: '2026-10-23T10:00:00.000Z' },
  readings: [],
} as unknown as Extract<AlertState, { kind: 'recent-significant' }>['event'];
const alert: AlertState = { kind: 'recent-significant', event, distanceKm: 20, minutesAgo: 3 };

describe('Güvende misin? kartı', () => {
  it('yakın ve yeni önemli depremde, durum bildirilmemişse sorulur', () => {
    expect(shouldAskCheckIn(alert, null)).toBe(true);
    expect(shouldAskCheckIn(alert, { kind: 'safe', at: '2026-10-23T09:00:00.000Z' })).toBe(true);
  });
  it('depremden sonra durum bildirildiyse ya da önemli deprem yoksa sorulmaz', () => {
    expect(shouldAskCheckIn(alert, { kind: 'safe', at: '2026-10-23T10:05:00.000Z' })).toBe(false);
    expect(shouldAskCheckIn({ kind: 'none' }, null)).toBe(false);
    expect(shouldAskCheckIn({ kind: 'latest', event, distanceKm: 300 }, null)).toBe(false);
  });
});
