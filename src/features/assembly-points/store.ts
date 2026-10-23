import { SERVER_TIMEOUT_MS } from '@/features/earthquakes/serverFeed';
import { requireSupabase } from '@/services/supabase';
import { TileStore, type TileRow } from './tileStore';

/** Sunucu yanıt vermezse istek iptal edilir: liste sonsuza dek iskelette kalmaz, önbellek/hata gösterilir. */
async function withTimeout<T>(run: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SERVER_TIMEOUT_MS);
  try {
    return await run(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

/** Uygulama genelinde tek karo deposu (harita, liste ve ana sayfa aynı önbelleği paylaşır). */
export const assemblyTiles = new TileStore(
  async (xs, ys) => {
    const { data, error } = await withTimeout((s) => requireSupabase().rpc('assembly_points_in_tiles', { xs, ys }).abortSignal(s));
    if (error) throw error;
    return (data ?? []) as TileRow[];
  },
  async () => {
    const { data, error } = await withTimeout((s) =>
      requireSupabase().from('dataset_versions').select('version').eq('name', 'assembly_points').abortSignal(s).maybeSingle(),
    );
    if (error) throw error;
    return data ? Number(data.version) : null;
  },
);
