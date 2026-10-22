import NetInfo from '@react-native-community/netinfo';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { loadEarthquakes, type CachedSnapshot, type QuakeSnapshot } from '@/features/earthquakes/repository';
import { DEFAULT_SETTINGS, type Settings } from '@/features/settings/settings';
import { PROVINCES } from '@/features/settings/provinces';
import { env } from '@/services/env';
import { fetchWithTimeout } from '@/services/http';
import { coordsOf, getPermissionStatus, readCurrent, requestAndGetLocation, type LocationState } from '@/services/location';
import { getSupabase } from '@/services/supabase';
import { readJson, writeJson } from '@/services/storage';
import type { LatLng } from '@/utils/geo';

const REFRESH_MS = 60_000;

type QuakeState = { snapshot: QuakeSnapshot | null; loading: boolean; error: string | null };

interface AppContextValue {
  settings: Settings;
  settingsLoaded: boolean;
  updateSettings: (patch: Partial<Settings>) => void;
  location: LocationState;
  userCoords: LatLng | null;
  /** İzin ister ve güncel konum durumunu döndürür. */
  requestLocation: () => Promise<LocationState>;
  setManualProvince: (name: string | null) => void;
  quakes: QuakeState;
  refreshQuakes: () => Promise<void>;
  online: boolean;
  session: Session | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<LocationState>({ status: 'unknown' });
  const [quakes, setQuakes] = useState<QuakeState>({ snapshot: null, loading: true, error: null });
  const [online, setOnline] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const cacheRef = useRef<CachedSnapshot | null>(null);
  const inflight = useRef(false);

  // Ayarlar
  useEffect(() => {
    readJson<Settings>('settings').then((s) => {
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s, emergencyInfo: { ...DEFAULT_SETTINGS.emergencyInfo, ...s.emergencyInfo } });
      setSettingsLoaded(true);
    });
  }, []);
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeJson('settings', next);
      return next;
    });
  }, []);

  // Konum: izin daha önce verildiyse sessizce oku; izin istemi yalnızca kullanıcı eylemiyle.
  useEffect(() => {
    getPermissionStatus()
      .then(async (p) => {
        if (p.status === 'granted') setGpsLocation(await readCurrent());
        else if (p.status === 'denied') setGpsLocation({ status: 'denied', canAskAgain: p.canAskAgain });
      })
      .catch(() => setGpsLocation({ status: 'unavailable', message: 'Konum servisine erişilemedi' }));
  }, []);
  const requestLocation = useCallback(async () => {
    const next = await requestAndGetLocation();
    setGpsLocation(next);
    return next;
  }, []);
  const setManualProvince = useCallback((name: string | null) => updateSettings({ manualProvince: name }), [updateSettings]);

  const location: LocationState = useMemo(() => {
    if (gpsLocation.status === 'granted') return gpsLocation;
    const p = settings.manualProvince ? PROVINCES.find((x) => x.name === settings.manualProvince) : undefined;
    if (p) return { status: 'manual', coords: { latitude: p.latitude, longitude: p.longitude }, label: `${p.name} (il merkezi, yaklaşık)` };
    return gpsLocation;
  }, [gpsLocation, settings.manualProvince]);

  // Ağ durumu
  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)), []);

  // Deprem verisi
  const refreshQuakes = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    setQuakes((q) => ({ ...q, loading: true }));
    try {
      if (!cacheRef.current) cacheRef.current = await readJson<CachedSnapshot>('quake-cache');
      const sources = settings.enabledSources.filter((s) => env.quakeSources.includes(s));
      const { snapshot, cache } = await loadEarthquakes(sources.length ? sources : env.quakeSources, fetchWithTimeout, cacheRef.current);
      cacheRef.current = cache;
      writeJson('quake-cache', cache);
      setQuakes({ snapshot, loading: false, error: snapshot.stale ? 'Deprem kaynaklarına şu anda ulaşılamıyor.' : null });
    } catch (e) {
      setQuakes((q) => ({ ...q, loading: false, error: e instanceof Error ? e.message : 'Deprem verisi alınamadı' }));
    } finally {
      inflight.current = false;
    }
  }, [settings.enabledSources]);

  useEffect(() => {
    if (!settingsLoaded) return;
    refreshQuakes();
    let timer: ReturnType<typeof setInterval> | null = setInterval(refreshQuakes, REFRESH_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        refreshQuakes();
        if (!timer) timer = setInterval(refreshQuakes, REFRESH_MS);
      } else if (timer) {
        clearInterval(timer);
        timer = null;
      }
    });
    return () => {
      sub.remove();
      if (timer) clearInterval(timer);
    };
  }, [settingsLoaded, refreshQuakes]);

  // Oturum
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      settings,
      settingsLoaded,
      updateSettings,
      location,
      userCoords: coordsOf(location),
      requestLocation,
      setManualProvince,
      quakes,
      refreshQuakes,
      online,
      session,
    }),
    [settings, settingsLoaded, updateSettings, location, requestLocation, setManualProvince, quakes, refreshQuakes, online, session],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp, AppProvider içinde kullanılmalı');
  return ctx;
}

/** Ayara göre süzülmüş deprem olayları. */
export function useVisibleQuakes() {
  const { quakes, settings } = useApp();
  return useMemo(
    () => (quakes.snapshot?.events ?? []).filter((e) => (e.primary.magnitude ?? 0) >= settings.minListMagnitude),
    [quakes.snapshot, settings.minListMagnitude],
  );
}
