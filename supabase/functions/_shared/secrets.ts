import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const cache = new Map<string, string>();

/**
 * Sunucu gizli değeri: önce Edge Function ortam değişkeni (ör. INGEST_SECRET), yoksa veritabanı
 * Vault'undaki karşılığı (public.internal_secret, yalnızca service_role çağırabilir).
 */
export async function serverSecret(sb: SupabaseClient, envName: string, vaultName: string): Promise<string | null> {
  const env = Deno.env.get(envName);
  if (env) return env;
  const hit = cache.get(vaultName);
  if (hit) return hit;
  const { data, error } = await sb.rpc('internal_secret', { p_name: vaultName });
  if (error || typeof data !== 'string' || !data) return null;
  cache.set(vaultName, data);
  return data;
}
