import { requireSupabase } from '@/services/supabase';
import { TileStore, type TileRow } from './tileStore';

/** Uygulama genelinde tek karo deposu (harita, liste ve ana sayfa aynı önbelleği paylaşır). */
export const assemblyTiles = new TileStore(
  async (xs, ys) => {
    const { data, error } = await requireSupabase().rpc('assembly_points_in_tiles', { xs, ys });
    if (error) throw error;
    return (data ?? []) as TileRow[];
  },
  async () => {
    const { data, error } = await requireSupabase().from('dataset_versions').select('version').eq('name', 'assembly_points').maybeSingle();
    if (error) throw error;
    return data ? Number(data.version) : null;
  },
);
