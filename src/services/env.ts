import type { QuakeSourceId } from '@/types/earthquake';

const ALL_SOURCES: QuakeSourceId[] = ['afad', 'kandilli', 'usgs'];

function parseSources(raw: string | undefined): QuakeSourceId[] {
  if (!raw) return ALL_SOURCES;
  const ids = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is QuakeSourceId => (ALL_SOURCES as string[]).includes(s));
  return ids.length ? ids : ALL_SOURCES;
}

// EXPO_PUBLIC_* değişkenleri derleme anında satır içine alınır; dinamik erişim çalışmaz.
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  mapStyleUrl: process.env.EXPO_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/dark',
  quakeSources: parseSources(process.env.EXPO_PUBLIC_QUAKE_SOURCES),
  demoReports: typeof __DEV__ !== 'undefined' && __DEV__ && process.env.EXPO_PUBLIC_DEMO_REPORTS === '1',
};

export const isBackendConfigured = () => Boolean(env.supabaseUrl && env.supabaseAnonKey);
