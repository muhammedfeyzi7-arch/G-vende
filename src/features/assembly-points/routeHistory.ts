import { readJson, writeJson } from '@/services/storage';
import type { AssemblyPoint } from '@/types/assembly';

const KEY = 'route-history';
const MAX = 20;

/** Bu cihazda yol tarifi açılan alanlar (yalnızca cihazda saklanır; rota hesaplanmaz, harita uygulamasına devredilir). */
export type RouteHistoryItem = { point: AssemblyPoint; at: string };

export async function loadRouteHistory(): Promise<RouteHistoryItem[]> {
  return (await readJson<RouteHistoryItem[]>(KEY)) ?? [];
}

export async function addRouteHistory(point: AssemblyPoint, now = new Date()): Promise<RouteHistoryItem[]> {
  const list = (await loadRouteHistory()).filter((h) => h.point.id !== point.id);
  const next = [{ point, at: now.toISOString() }, ...list].slice(0, MAX);
  await writeJson(KEY, next);
  return next;
}
