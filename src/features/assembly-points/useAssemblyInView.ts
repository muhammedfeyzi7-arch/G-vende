import { useCallback, useEffect, useRef, useState } from 'react';
import { isBackendConfigured } from '@/services/env';
import type { AssemblyPoint } from '@/types/assembly';
import { assemblyTiles } from './store';
import { tileKey, tilesForBounds, type Tile } from './tiles';

/** Bu yakınlaştırmanın altında toplanma alanı istenmez (tüm il/ülke görünümünde binlerce nokta olur). */
export const MIN_ASSEMBLY_ZOOM = 10;
const DEBOUNCE_MS = 350;

export type Viewport = { bounds: [number, number, number, number]; zoom: number };
export type InViewStatus = 'idle' | 'zoom-in' | 'loading' | 'ready' | 'error';

/**
 * Haritada görünen alandaki toplanma alanları. Kaydırma bitince (350 ms) görünür karolar istenir;
 * önbellekteki karolar ağa gitmeden gelir, eksikler tek istekte. Aynı karo kümesi tekrar istenmez.
 */
export function useAssemblyInView() {
  const [points, setPoints] = useState<AssemblyPoint[]>([]);
  const [status, setStatus] = useState<InViewStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKey = useRef('');
  const last = useRef<Tile[] | null>(null);
  const seq = useRef(0);

  const run = useCallback(async (tiles: Tile[]) => {
    const my = ++seq.current;
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    try {
      const r = await assemblyTiles.load(tiles);
      if (my !== seq.current) return; // daha yeni bir görünüm istendi
      setPoints(r.points);
      setStatus('ready');
    } catch {
      if (my === seq.current) setStatus('error');
    }
  }, []);

  const onViewport = useCallback(
    (v: Viewport) => {
      if (!isBackendConfigured()) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const tiles = v.zoom >= MIN_ASSEMBLY_ZOOM ? tilesForBounds(v.bounds) : null;
        if (!tiles) {
          setStatus('zoom-in');
          return;
        }
        const key = tiles.map(tileKey).join(',');
        if (key === lastKey.current) return;
        lastKey.current = key;
        last.current = tiles;
        run(tiles);
      }, DEBOUNCE_MS);
    },
    [run],
  );

  // Veri seti güncellendi (Realtime): aynı görünümü yeniden iste.
  useEffect(
    () =>
      assemblyTiles.subscribe(() => {
        if (last.current) run(last.current);
      }),
    [run],
  );
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return { points, status, onViewport };
}

/** Yakındaki liste + harita görünümü noktalarını tekilleştirerek birleştirir (kendi alanınız önce). */
export function mergeAssembly(...lists: AssemblyPoint[][]): AssemblyPoint[] {
  const seen = new Set<string>();
  const out: AssemblyPoint[] = [];
  for (const list of lists) for (const p of list) if (!seen.has(p.id) && seen.add(p.id)) out.push(p);
  return out;
}
