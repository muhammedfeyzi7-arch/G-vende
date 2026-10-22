import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isBackendConfigured } from '@/services/env';
import { friendlyError } from '@/services/supabase';
import type { AssemblyPoint } from '@/types/assembly';
import { distanceKm, type LatLng } from '@/utils/geo';
import { fetchNearby, type NearbyResult } from './api';
import { loadMyPoint, myPointAsAssembly, type MyAssemblyPoint } from './mine';

export type NearbyState =
  | { status: 'no-location' }
  | { status: 'not-configured' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | ({ status: 'ready' } & NearbyResult);

export function useNearbyAssembly(center: LatLng | null, radiusKm = 5) {
  const [state, setState] = useState<NearbyState>({ status: 'loading' });
  const [mine, setMine] = useState<MyAssemblyPoint | null>(null);
  const lat = center?.latitude;
  const lon = center?.longitude;

  const load = useCallback(async () => {
    loadMyPoint().then(setMine);
    if (lat == null || lon == null) return setState({ status: 'no-location' });
    if (!isBackendConfigured()) return setState({ status: 'not-configured' });
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', ...(await fetchNearby({ latitude: lat, longitude: lon }, radiusKm)) });
    } catch (e) {
      setState({ status: 'error', error: friendlyError(e) });
    }
  }, [lat, lon, radiusKm]);

  useEffect(() => {
    load();
  }, [load]);

  // Kayıt başka ekranda değişmiş olabilir.
  useFocusEffect(
    useCallback(() => {
      loadMyPoint().then(setMine);
    }, []),
  );

  const official = state.status === 'ready' ? state.points : [];
  const myPoint = useMemo(
    () => (mine ? { ...myPointAsAssembly(mine), distanceKm: center ? distanceKm(center, mine) : NaN } : null),
    [mine, center],
  );
  /** Haritada gösterilecek tüm noktalar: kullanıcının kendi alanı + resmî alanlar */
  const points: AssemblyPoint[] = useMemo(() => (myPoint ? [myPoint, ...official] : official), [myPoint, official]);

  return { state, reload: load, points, official, myPoint };
}
