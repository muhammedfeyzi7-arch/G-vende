import { useEffect, useState } from 'react';
import { readJson, writeJson } from '@/services/storage';
import { getSupabase } from '@/services/supabase';

/**
 * Aktif fay hatları katmanı. Veri: GEM Global Active Faults Database (CC BY-SA 4.0), Türkiye için
 * çoğunlukla EMME (Orta Doğu Deprem Modeli). Genelleştirilmiş bölgesel modeldir; resmî MTA Diri Fay
 * Haritası değildir ve bina/parsel ölçeğinde kullanılamaz.
 *
 * ~80 KB; bir kez indirilir ve cihazda saklanır (internetsiz de çizilir). Yalnızca sunucudaki veri
 * seti sürümü değişince yeniden indirilir; uygulama açılışında sürüm için tek satır sorgulanır.
 */
export const FAULT_ATTRIBUTION = 'Fay hatları: GEM Global Active Faults (EMME), CC BY-SA 4.0 · yaklaşık konum, resmî MTA haritası değildir';

export type FaultLine = { id: number; slip: string | null; coords: [number, number][] };
type Cached = { version: number; lines: FaultLine[]; at: string };
const KEY = 'fault-lines';

let memory: FaultLine[] | null = null;
let loading: Promise<FaultLine[]> | null = null;

async function load(): Promise<FaultLine[]> {
  const cached = await readJson<Cached>(KEY);
  if (cached) memory = cached.lines;
  const sb = getSupabase();
  if (!sb) return memory ?? [];
  try {
    const { data: v } = await sb.from('dataset_versions').select('version').eq('name', 'fault_lines').maybeSingle();
    const version = Number(v?.version ?? 0);
    if (cached && cached.version === version && cached.lines.length) return cached.lines;
    const { data, error } = await sb.from('fault_lines').select('id, slip_type, coords').order('id');
    if (error) throw error;
    const lines = (data ?? []).map((r) => ({ id: r.id as number, slip: (r.slip_type as string) ?? null, coords: r.coords as [number, number][] }));
    if (lines.length) {
      memory = lines;
      await writeJson<Cached>(KEY, { version, lines, at: new Date().toISOString() });
    }
    return memory ?? [];
  } catch {
    // Çevrimdışı: varsa saklanan çizgiler (hata kullanıcıya gösterilmez; katman boş kalır)
    return memory ?? [];
  }
}

/** Uygulama açılışında bir kez çağrılır: afet anında internet olmasa da katman hazır olsun. */
export function prefetchFaultLines(): Promise<FaultLine[]> {
  loading ??= load().finally(() => {
    loading = null;
  });
  return loading;
}

/** Katman açıkken çizgileri verir (önce bellek/cihaz, gerekirse indirir). */
export function useFaultLines(enabled: boolean): FaultLine[] {
  const [lines, setLines] = useState<FaultLine[]>(memory ?? []);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    prefetchFaultLines().then((l) => alive && setLines(l));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return enabled ? lines : [];
}

export function faultsToGeoJSON(lines: FaultLine[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: lines.map((l) => ({
      type: 'Feature',
      id: l.id,
      geometry: { type: 'LineString', coordinates: l.coords },
      properties: { kind: 'fault', slip: l.slip ?? '' },
    })),
  };
}
