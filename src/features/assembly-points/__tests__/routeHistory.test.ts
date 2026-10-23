import { addRouteHistory, loadRouteHistory } from '../routeHistory';

const p = (id: string) => ({ id, name: id, address: null, province: null, district: null, neighborhood: null, latitude: 38, longitude: 27, capacity: null, sourceName: 'x', sourceUrl: 'x', sourcePublishedAt: null, importedAt: '2026-01-01' });

describe('rota geçmişi (cihazda)', () => {
  beforeEach(() => require('@react-native-async-storage/async-storage').clear());
  it('en yeni başta, aynı alan tekrar eklenmez, en fazla 20 kayıt', async () => {
    await addRouteHistory(p('a'), new Date('2026-10-01T10:00:00Z'));
    await addRouteHistory(p('b'), new Date('2026-10-01T11:00:00Z'));
    const list = await addRouteHistory(p('a'), new Date('2026-10-01T12:00:00Z'));
    expect(list.map((h) => h.point.id)).toEqual(['a', 'b']);
    for (let i = 0; i < 30; i++) await addRouteHistory(p(`x${i}`));
    expect((await loadRouteHistory()).length).toBe(20);
  });
});
