import NetInfo from '@react-native-community/netinfo';
import { prefetchFaultLines } from '@/features/map/faults';
import { assemblyTiles } from '@/features/assembly-points/store';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { loadEarthquakes, type CachedSnapshot, type QuakeSnapshot } from '@/features/earthquakes/repository';
import { rowToReading, type ReadingRow } from '@/features/earthquakes/rows';
import { buildServerSnapshot, fetchServerReadings, snapshotFromCache, upsertReading, upsertSync, type SyncRow } from '@/features/earthquakes/serverFeed';
import { DEFAULT_SETTINGS, type Settings } from '@/features/settings/settings';
import { PROVINCES } from '@/features/settings/provinces';
import { env } from '@/services/env';
import { fetchWithTimeout } from '@/services/http';
import { coordsOf, getPermissionStatus, readCurrent, requestAndGetLocation, type LocationState } from '@/services/location';
import { getSupabase } from '@/services/supabase';
import { readJson, writeJson } from '@/services/storage';
import type { QuakeSourceId, SourceReading } from '@/types/earthquake';
import { distanceKm, type LatLng } from '@/utils/geo';
import { userMessage } from '@/services/errors';
import { nextRefreshDelay, RECONNECT_SPREAD_MS } from '@/features/earthquakes/refreshPolicy';

/** Konum en fazla bu yaşta tutulur; daha eskiyse uygulamaya dönüşte bir kez yeniden okunur. */
const LOCATION_MAX_AGE_MS = 10 * 60_000;
/** Bundan küçük yer değişikliği "aynı yer" sayılır. */
const SIGNIFICANT_MOVE_M = 200;


export type LiveStatus = 'off' | 'connecting' | 'connected';

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
  /** Realtime (canlı) bağlantı durumu; sunucu yapılandırılmamışsa 'off'. */
  liveStatus: LiveStatus;
  online: boolean;
  session: Session | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<LocationState>({ status: 'unknown' });
  const gpsRef = useRef(gpsLocation);
  gpsRef.current = gpsLocation;
  const [quakes, setQuakes] = useState<QuakeState>({ snapshot: null, loading: true, error: null });
  const [online, setOnline] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const cacheRef = useRef<CachedSnapshot | null>(null);
  const inflight = useRef(false);
  const serverRef = useRef<{ readings: SourceReading[]; sync: SyncRow[] } | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('off');
  const liveRef = useRef<LiveStatus>('off');
  liveRef.current = liveStatus;
  /** Art arda başarısız/eskimiş yenileme sayısı (bekleme süresini uzatmak için). */
  const failuresRef = useRef(0);

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
  // Pil: sürekli/arka plan GPS yok. Uygulamaya dönüldüğünde son konum 10 dk'dan eskiyse tek seferlik
  // ucuz okuma yapılır (önce telefonun son bilinen konumu); 200 m'den az yer değişikliği yok sayılır,
  // böylece konuma bağlı yeniden hesaplamalar ve istekler tetiklenmez.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (st) => {
      if (st !== 'active') return;
      const prev = gpsRef.current;
      if (prev.status !== 'granted' || Date.now() - Date.parse(prev.at) < LOCATION_MAX_AGE_MS) return;
      const next = await readCurrent();
      if (next.status !== 'granted') return;
      setGpsLocation(distanceKm(prev.coords, next.coords) * 1000 < SIGNIFICANT_MOVE_M ? { ...prev, at: next.at } : next);
    });
    return () => sub.remove();
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

  // Fay hatları (~80 KB) bağlantı varken bir kez indirilip saklanır: afet anında internet olmasa da katman çizilir.
  useEffect(() => {
    if (online) prefetchFaultLines();
  }, [online]);

  // Ağ durumu
  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)), []);

  // Deprem verisi: sunucu (Supabase) varsa oradan okunur ve Realtime ile güncellenir; kaynaklar cihazdan
  // yalnızca sunucu yapılandırılmamışsa veya sunucuya ulaşılamadığında doğrudan sorgulanır.
  const sources = useMemo<QuakeSourceId[]>(() => {
    const s = settings.enabledSources.filter((x) => env.quakeSources.includes(x));
    return s.length ? s : env.quakeSources;
  }, [settings.enabledSources]);

  const publishServer = useCallback(() => {
    const data = serverRef.current;
    if (!data) return;
    const readings = data.readings.filter((r) => sources.includes(r.source));
    const snapshot = buildServerSnapshot(readings, data.sync, sources);
    cacheRef.current = { readings, health: snapshot.health };
    writeJson('quake-cache', cacheRef.current);
    setQuakes({
      snapshot,
      loading: false,
      error: snapshot.stale ? 'Sunucu senkronu gecikti; gösterilen deprem verileri güncel olmayabilir.' : null,
    });
  }, [sources]);
  const publishRef = useRef(publishServer);
  publishRef.current = publishServer;
  const publishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedulePublish = useCallback(() => {
    if (publishTimer.current) clearTimeout(publishTimer.current);
    publishTimer.current = setTimeout(() => publishRef.current(), 300);
  }, []);

  const refreshQuakes = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    setQuakes((q) => ({ ...q, loading: true }));
    try {
      if (!cacheRef.current) cacheRef.current = await readJson<CachedSnapshot>('quake-cache');
      // Açılışta ağı beklemeden son kaydedilen liste gösterilir (yaşıyla birlikte); yeni veri gelince değişir.
      const cached = cacheRef.current ? snapshotFromCache(cacheRef.current, sources) : null;
      if (cached) setQuakes((q) => (q.snapshot ? q : { snapshot: cached, loading: true, error: null }));
      const sb = getSupabase();
      if (sb) {
        try {
          serverRef.current = await fetchServerReadings(sb, env.quakeSources);
          publishRef.current();
          failuresRef.current = 0;
          return;
        } catch {
          // Sunucuya ulaşılamadı: aşağıda kaynaklardan doğrudan bir kez denenir (sürekli sorgu yapılmaz).
        }
      }
      const { snapshot, cache } = await loadEarthquakes(sources, fetchWithTimeout, cacheRef.current);
      failuresRef.current = snapshot.stale ? failuresRef.current + 1 : 0;
      cacheRef.current = cache;
      writeJson('quake-cache', cache);
      setQuakes({
        snapshot: { ...snapshot, via: 'direct' },
        loading: false,
        error: snapshot.stale ? 'Deprem kaynaklarına ulaşılamadı. Lütfen internet bağlantınızı kontrol edin.' : null,
      });
    } catch (e) {
      failuresRef.current += 1;
      setQuakes((q) => ({ ...q, loading: false, error: userMessage(e, 'Deprem verisi alınamadı. Lütfen biraz sonra tekrar deneyin.') }));
    } finally {
      inflight.current = false;
    }
  }, [sources]);

  // Yenileme zamanlayıcısı: sabit aralık yerine rastgele kaydırmalı ve hatada katlanarak uzayan bekleme
  // (bkz. refreshPolicy). Uygulama arka plandayken hiç istek atılmaz.
  useEffect(() => {
    if (!settingsLoaded) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let active = true;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      const delay = nextRefreshDelay({ hasServer: !!getSupabase(), live: liveRef.current === 'connected', failures: failuresRef.current });
      timer = setTimeout(async () => {
        if (!active) return;
        await refreshQuakes();
        schedule();
      }, delay);
    };
    refreshQuakes().finally(schedule);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        active = true;
        refreshQuakes().finally(schedule);
      } else {
        active = false;
        if (timer) clearTimeout(timer);
        timer = null;
      }
    });
    return () => {
      active = false;
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, [settingsLoaded, refreshQuakes]);

  // Canlı güncelleme: yeni/değişen okumalar ve senkron durumu (yalnızca okuma; RLS herkese açık okuma).
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !settingsLoaded) return;
    setLiveStatus('connecting');
    const channel = sb
      .channel('guvende-quakes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'earthquake_readings' }, (payload) => {
        const r = rowToReading(payload.new as ReadingRow);
        if (!r || !serverRef.current) return;
        serverRef.current = { ...serverRef.current, readings: upsertReading(serverRef.current.readings, r) };
        schedulePublish();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quake_sync_state' }, (payload) => {
        const row = payload.new as SyncRow;
        if (!row?.source || !serverRef.current) return;
        serverRef.current = { ...serverRef.current, sync: upsertSync(serverRef.current.sync, row) };
        schedulePublish();
      })
      // Toplanma alanı veri seti sürümü: büyük tablo değil, tek satır dinlenir (önbellek geçersiz kılma).
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dataset_versions' }, (payload) => {
        const row = payload.new as { name?: string; version?: number };
        if (row?.name === 'assembly_points' && row.version != null) assemblyTiles.setVersion(Number(row.version));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setLiveStatus('connected');
          // Bağlantı kopup geri geldiyse aradaki değişiklikleri kaçırmamak için bir kez yeniden oku;
          // büyük depremde herkes aynı anda bağlanır, okuma birkaç saniyeye rastgele yayılır.
          setTimeout(() => refreshQuakes(), Math.random() * RECONNECT_SPREAD_MS);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setLiveStatus('off');
      });
    return () => {
      sb.removeChannel(channel);
      setLiveStatus('off');
    };
  }, [settingsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Kaynak seçimi değişince sunucu verisinden yeniden süz (ağ isteği yok).
  useEffect(() => {
    if (serverRef.current) publishServer();
  }, [publishServer]);

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
      liveStatus,
      online,
      session,
    }),
    [
      settings,
      settingsLoaded,
      updateSettings,
      location,
      requestLocation,
      setManualProvince,
      quakes,
      refreshQuakes,
      liveStatus,
      online,
      session,
    ],
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

/** Sağlayıcı dışında da çizilebilen bileşenler için (ör. önizleme, testler): yoksa null. */
export function useAppOptional(): AppContextValue | null {
  return useContext(AppContext);
}
