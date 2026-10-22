import { readFileSync } from 'fs';
import { join } from 'path';
import { loadEarthquakes } from '../repository';
import type { Fetcher } from '../sources/types';

const fx = (name: string) => readFileSync(join(__dirname, 'fixtures', name));
const now = new Date('2026-10-22T19:10:00Z');
const query = {
  since: new Date('2026-10-15T00:00:00Z'),
  until: now,
  minMagnitude: 1,
  bbox: { minLat: 34, maxLat: 44, minLon: 24, maxLon: 47 },
  limit: 100,
};

const okResponse = (buf: Buffer) => ({
  ok: true,
  status: 200,
  text: async () => buf.toString('utf8'),
  arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
});

const fetcherFor =
  (map: Record<string, Buffer | 'fail' | 500>): Fetcher =>
  async (url) => {
    const key = Object.keys(map).find((k) => url.includes(k))!;
    const v = map[key];
    if (v === 'fail') throw new Error('ağ hatası');
    if (v === 500) return { ok: false, status: 500, text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) };
    return okResponse(v as Buffer);
  };

describe('loadEarthquakes', () => {
  it('tüm kaynaklar başarılıysa birleşik olayları ve sağlığı döner', async () => {
    const { snapshot } = await loadEarthquakes(
      ['afad', 'kandilli', 'usgs'],
      fetcherFor({ afad: fx('afad.json'), koeri: fx('kandilli.txt'), usgs: fx('usgs.json') }),
      null,
      query,
    );
    expect(snapshot.stale).toBe(false);
    expect(snapshot.health.every((h) => h.ok)).toBe(true);
    expect(snapshot.events[0]!.readings).toHaveLength(3);
  });

  it('boş yanıtta boş liste döner (uydurma kayıt yok)', async () => {
    const { snapshot } = await loadEarthquakes(['afad'], fetcherFor({ afad: Buffer.from('[]') }), null, query);
    expect(snapshot.events).toEqual([]);
    expect(snapshot.stale).toBe(false);
  });

  it('kaynak erişilemezse önbelleği kullanır ve durumu bildirir', async () => {
    const first = await loadEarthquakes(['afad'], fetcherFor({ afad: fx('afad.json') }), null, query);
    const second = await loadEarthquakes(['afad'], fetcherFor({ afad: 'fail' }), first.cache, query);
    expect(second.snapshot.stale).toBe(true);
    expect(second.snapshot.health[0]).toMatchObject({ ok: false, error: 'ağ hatası' });
    expect(second.snapshot.health[0]!.lastSuccessAt).toBe(first.snapshot.lastSuccessAt);
    expect(second.snapshot.events.length).toBe(first.snapshot.events.length);
  });

  it('önbellek yokken tüm kaynaklar başarısızsa boş ve bayat döner', async () => {
    const { snapshot } = await loadEarthquakes(['afad', 'usgs'], fetcherFor({ afad: 500, usgs: 'fail' }), null, query);
    expect(snapshot.events).toEqual([]);
    expect(snapshot.stale).toBe(true);
    expect(snapshot.lastSuccessAt).toBeNull();
    expect(snapshot.health.map((h) => h.error)).toEqual(['AFAD HTTP 500', 'ağ hatası']);
  });
});
