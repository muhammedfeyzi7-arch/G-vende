import { readJson, removeKey, writeJson } from '@/services/storage';
import type { AssemblyPoint } from '@/types/assembly';
import { displayPoint } from './format';
import { MAX_TILES, tileKey, type Tile } from './tiles';

/**
 * Toplanma alanı karo deposu. Amaç: haritada gezinirken Supabase'e sürekli istek atmamak.
 * - Bellek → cihaz deposu → sunucu sırasıyla bakılır; boş karolar da saklanır (tekrar sorulmaz).
 * - Eksik karoların HEPSİ tek RPC çağrısında istenir (karo başına istek yok, N+1 yok).
 * - Aynı karo için uçuştaki istek paylaşılır (aynı anda iki ekran isterse tek istek gider).
 * - Veri seti sürümü değişmedikçe (Realtime ile bildirilir) önbellek geçerlidir; en fazla 30 gün.
 * - Cihazda en fazla MAX_STORED karo tutulur (en eski kullanılan silinir).
 */
export type TileRow = {
  id: string;
  name: string;
  address: string | null;
  province: string | null;
  district: string | null;
  neighborhood: string | null;
  latitude: number;
  longitude: number;
  capacity: number | null;
  source_name: string;
  source_url: string;
  source_published_at: string | null;
  imported_at: string;
  source_kind?: 'official' | 'community' | null;
  tile_x: number;
  tile_y: number;
};
export type TileFetcher = (xs: number[], ys: number[]) => Promise<TileRow[]>;
/** Sunucudaki güncel veri seti sürümü (tek satırlık okuma). */
export type VersionFetcher = () => Promise<number | null>;
type Entry = { points: AssemblyPoint[]; version: number; at: number };

const MAX_AGE_MS = 30 * 24 * 3600_000;
const MAX_STORED = 300;
/** Supabase API yanıt sınırı (db-max-rows). Bu kadar satır gelirse yanıt kesilmiş olabilir. */
export const ROW_CAP = 1000;
const INDEX_KEY = 'ap-tiles-index';
const VERSION_KEY = 'ap-tiles-version';
const storageKey = (k: string) => `ap-tile:${k}`;

const toPoint = (r: TileRow): AssemblyPoint =>
  displayPoint({
    id: r.id,
    name: r.name,
    address: r.address,
    province: r.province,
    district: r.district,
    neighborhood: r.neighborhood,
    latitude: r.latitude,
    longitude: r.longitude,
    capacity: r.capacity,
    sourceName: r.source_name,
    sourceUrl: r.source_url,
    sourcePublishedAt: r.source_published_at,
    importedAt: r.imported_at,
    sourceKind: r.source_kind ?? 'official',
  });

export class TileStore {
  private mem = new Map<string, Entry>();
  private inflight = new Map<string, Promise<void>>();
  private index: string[] | null = null;
  private version: number | null = null;
  private listeners = new Set<() => void>();
  private versionSync: Promise<void> | null = null;

  constructor(
    private fetcher: TileFetcher,
    private versionFetcher: VersionFetcher = async () => null,
    private now: () => number = Date.now,
  ) {}

  /** Oturumda bir kez sunucu sürümünü sorar (sonrası Realtime ile gelir); çevrimdışıysa sessizce geçer. */
  private syncVersionOnce() {
    this.versionSync ??= this.versionFetcher()
      .then((v) => (v != null ? this.setVersion(v) : undefined))
      .catch(() => {
        this.versionSync = null; // bir sonraki yüklemede yeniden dene
      });
    return this.versionSync;
  }

  /** Bilinen veri seti sürümü (yoksa cihazdakinden yüklenir). */
  async getVersion(): Promise<number> {
    if (this.version == null) this.version = (await readJson<number>(VERSION_KEY)) ?? 0;
    return this.version;
  }

  /** Sunucu yeni sürüm bildirdi: eski karolar bir sonraki istekte yenilenir (tembel geçersiz kılma). */
  async setVersion(v: number) {
    const cur = await this.getVersion();
    if (v === cur) return;
    this.version = v;
    this.mem.clear();
    await writeJson(VERSION_KEY, v);
    this.listeners.forEach((l) => l());
  }

  /** Sürüm değişince haber ver (açık ekranlar görünür karoları yeniden ister). */
  subscribe(l: () => void) {
    this.listeners.add(l);
    return () => void this.listeners.delete(l);
  }

  private fresh(e: Entry | null | undefined, v: number): e is Entry {
    return !!e && e.version === v && this.now() - e.at < MAX_AGE_MS;
  }

  private async touch(keys: string[]) {
    this.index ??= (await readJson<string[]>(INDEX_KEY)) ?? [];
    const set = new Set(keys);
    const next = [...this.index.filter((k) => !set.has(k)), ...keys];
    const drop = next.length > MAX_STORED ? next.splice(0, next.length - MAX_STORED) : [];
    this.index = next;
    await Promise.all([writeJson(INDEX_KEY, next), ...drop.map((k) => removeKey(storageKey(k)))]);
  }

  /**
   * Karoların noktalarını döner. Ağ hatasında eski (sürümü geçmiş) önbellek kullanılır;
   * hiç veri yoksa hata fırlatılır.
   */
  async load(tiles: Tile[]): Promise<{ points: AssemblyPoint[]; fromCache: boolean }> {
    await this.syncVersionOnce();
    const v = await this.getVersion();
    const keys = [...new Set(tiles.map(tileKey))];
    const stale = new Map<string, Entry>();

    // 1) Bellek ve cihaz deposu
    const missing: string[] = [];
    await Promise.all(
      keys.map(async (k) => {
        if (this.fresh(this.mem.get(k), v) || this.inflight.has(k)) return;
        const stored = await readJson<Entry>(storageKey(k));
        if (this.fresh(stored, v)) this.mem.set(k, stored);
        else {
          if (stored) stale.set(k, stored);
          missing.push(k);
        }
      }),
    );

    // 2) Eksikler tek istekte (64'lük parçalar)
    let failed = false;
    // Depo okunurken başka bir çağrı aynı karoyu istemeye başlamış olabilir: yeniden süz (arada await yok).
    const toFetch = missing.filter((k) => !this.inflight.has(k) && !this.fresh(this.mem.get(k), v));
    if (toFetch.length) {
      for (let i = 0; i < toFetch.length; i += MAX_TILES) {
        const chunk = toFetch.slice(i, i + MAX_TILES);
        const p = this.fetchChunk(chunk, v);
        chunk.forEach((k) => this.inflight.set(k, p));
      }
    }
    const waits = [...new Set(keys.map((k) => this.inflight.get(k)).filter((p): p is Promise<void> => !!p))];
    const results = await Promise.allSettled(waits);
    failed = results.some((r) => r.status === 'rejected');

    const out: AssemblyPoint[] = [];
    let usedStale = false;
    for (const k of keys) {
      const e = this.mem.get(k) ?? stale.get(k);
      if (!e) continue;
      if (!this.fresh(e, v)) usedStale = true;
      out.push(...e.points);
    }
    if (failed && !out.length) {
      const r = results.find((x): x is PromiseRejectedResult => x.status === 'rejected');
      throw r?.reason ?? new Error('Toplanma alanları alınamadı');
    }
    return { points: out, fromCache: usedStale || failed };
  }

  /** Yanıt sınıra dayandıysa (kesilmiş olabilir) karo kümesini ikiye bölerek yeniden ister. */
  private async fetchAll(keys: string[]): Promise<TileRow[]> {
    const rows = await this.fetcher(
      keys.map((k) => Number(k.split(':')[0])),
      keys.map((k) => Number(k.split(':')[1])),
    );
    if (rows.length < ROW_CAP || keys.length === 1) return rows;
    const mid = Math.ceil(keys.length / 2);
    const [a, b] = await Promise.all([this.fetchAll(keys.slice(0, mid)), this.fetchAll(keys.slice(mid))]);
    return [...a, ...b];
  }

  private async fetchChunk(keys: string[], v: number) {
    try {
      const rows = await this.fetchAll(keys);
      const by = new Map<string, AssemblyPoint[]>(keys.map((k) => [k, []]));
      for (const r of rows) by.get(`${r.tile_x}:${r.tile_y}`)?.push(toPoint(r));
      const at = this.now();
      await Promise.all(
        [...by].map(([k, points]) => {
          const e = { points, version: v, at };
          this.mem.set(k, e);
          return writeJson(storageKey(k), e);
        }),
      );
      await this.touch(keys);
    } finally {
      keys.forEach((k) => this.inflight.delete(k));
    }
  }
}
