import type { QuakeSourceId } from '@/types/earthquake';

const ALL_SOURCES: QuakeSourceId[] = ['afad', 'kandilli', 'emsc', 'usgs'];

function parseSources(raw: string | undefined): QuakeSourceId[] {
  if (!raw) return ALL_SOURCES;
  const ids = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is QuakeSourceId => (ALL_SOURCES as string[]).includes(s));
  return ids.length ? ids : ALL_SOURCES;
}

/**
 * GÜVENDE Supabase projesi (herkese açık adres ve anon anahtar — istemciye gömülmek üzere tasarlanmıştır;
 * veri erişimini sunucudaki RLS kuralları sınırlar). .env ile başka bir projeye yönlendirilebilir.
 * Testlerde varsayılan kullanılmaz (sunucusuz davranış test edilir).
 */
const IS_TEST = process.env.NODE_ENV === 'test';
const DEFAULT_SUPABASE_URL = IS_TEST ? '' : 'https://mklhmdpwfxhkjnrokqmk.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = IS_TEST
  ? ''
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rbGhtZHB3Znhoa2pucm9rcW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3Mzc3MjMsImV4cCI6MjEwODMxMzcyM30.9Aw197_AcMi0owlwf0BYTddgFLophuRYAYRr7KpA5vI';

// EXPO_PUBLIC_* değişkenleri derleme anında satır içine alınır; dinamik erişim çalışmaz.
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
  mapStyleUrl: process.env.EXPO_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/dark',
  quakeSources: parseSources(process.env.EXPO_PUBLIC_QUAKE_SOURCES),
};

export const isBackendConfigured = () => Boolean(env.supabaseUrl && env.supabaseAnonKey);
