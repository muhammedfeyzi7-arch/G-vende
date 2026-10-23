import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROW_CAP, TileStore, type TileRow } from '../tileStore';
import { tileKey, tilesAround, tilesForBounds, tileX, tileY } from '../tiles';

const row = (id: string, lat: number, lon: number): TileRow => ({
  id,
  name: 'TEST ALANI',
  address: null,
  province: 'İZMİR',
  district: null,
  neighborhood: null,
  latitude: lat,
  longitude: lon,
  capacity: null,
  source_name: 'test',
  source_url: 'https://example.org',
  source_published_at: null,
  imported_at: '2026-10-23T00:00:00Z',
  source_kind: 'official',
  tile_x: tileX(lon),
  tile_y: tileY(lat),
});
const konak = row('a', 38.4189, 27.1287);

describe('karo hesabı (sunucudaki üretilmiş kolonlarla aynı)', () => {
  it('Konak z11 karosu', () => expect(tileKey({ x: tileX(27.1287), y: tileY(38.4189) })).toBe('1178:786'));
  it('kutu karoları; çok büyük alan için null', () => {
    expect(tilesAround({ latitude: 38.42, longitude: 27.13 }, 5)!.length).toBeLessThanOrEqual(4);
    expect(tilesForBounds([26, 36, 45, 42])).toBeNull(); // tüm Türkiye: önce yakınlaştır
  });
});

describe('karo deposu', () => {
  beforeEach(() => AsyncStorage.clear());
  const tiles = tilesAround({ latitude: 38.4189, longitude: 27.1287 }, 5)!;

  it('eksik karoların hepsi TEK istekte istenir; ikinci yükleme ağa gitmez', async () => {
    const fetcher = jest.fn(async () => [konak]);
    const s = new TileStore(fetcher, async () => 1);
    const a = await s.load(tiles);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect((fetcher.mock.calls[0] as unknown as number[][])[0]).toHaveLength(tiles.length);
    expect(a.points.map((p) => p.name)).toEqual(['Test Alanı']);
    await s.load(tiles);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('aynı anda gelen iki istek tek ağ çağrısını paylaşır', async () => {
    const fetcher = jest.fn(async () => [konak]);
    const s = new TileStore(fetcher, async () => 1);
    await Promise.all([s.load(tiles), s.load(tiles)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('uygulama yeniden açılınca cihaz deposundan okur (ağ yok)', async () => {
    await new TileStore(async () => [konak], async () => 1).load(tiles);
    const fetcher = jest.fn(async () => [] as TileRow[]);
    const r = await new TileStore(fetcher, async () => 1).load(tiles);
    expect(fetcher).not.toHaveBeenCalled();
    expect(r.points).toHaveLength(1);
  });

  it('sürüm değişince (Realtime) yeniden ister; çevrimdışıyken eski veriyi gösterir', async () => {
    const s = new TileStore(async () => [konak], async () => 1);
    await s.load(tiles);
    const onChange = jest.fn();
    s.subscribe(onChange);
    await s.setVersion(2);
    expect(onChange).toHaveBeenCalled();

    const offline = new TileStore(async () => Promise.reject(new Error('ağ yok')), async () => 2);
    const r = await offline.load(tiles);
    expect(r.fromCache).toBe(true);
    expect(r.points).toHaveLength(1);
  });

  it('hiç veri yokken ağ hatası iletilir', async () => {
    const s = new TileStore(async () => Promise.reject(new Error('ağ yok')), async () => null);
    await expect(s.load(tiles)).rejects.toThrow('ağ yok');
  });

  it('sunucu yanıt sınırına (1000 satır) dayanırsa karoları bölüp yeniden ister; veri kesilmez', async () => {
    const t = tilesAround({ latitude: 38.4189, longitude: 27.1287 }, 20)!;
    expect(t.length).toBeGreaterThan(2);
    // Her karoda 400 nokta: tek istekte sınıra dayanır.
    const fetcher = jest.fn(async (xs: number[], ys: number[]) => {
      const all = xs.flatMap((x, i) =>
        Array.from({ length: 400 }, (_, j) => ({ ...konak, id: `${x}:${ys[i]!}:${j}`, tile_x: x, tile_y: ys[i]! })),
      );
      return all.slice(0, ROW_CAP);
    });
    const r = await new TileStore(fetcher, async () => 1).load(t);
    expect(r.points).toHaveLength(t.length * 400);
    expect(fetcher.mock.calls.length).toBeGreaterThan(1);
  });
});
