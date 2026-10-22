import { useCallback, useEffect, useState } from 'react';
import { isBackendConfigured } from '@/services/env';
import { friendlyError } from '@/services/supabase';
import type { LatLng } from '@/utils/geo';
import { fetchNearby, type NearbyResult } from './api';

export type NearbyState =
  | { status: 'no-location' }
  | { status: 'not-configured' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | ({ status: 'ready' } & NearbyResult);

export function useNearbyAssembly(center: LatLng | null, radiusKm = 5) {
  const [state, setState] = useState<NearbyState>({ status: 'loading' });
  const lat = center?.latitude;
  const lon = center?.longitude;

  const load = useCallback(async () => {
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

  return { state, reload: load, points: state.status === 'ready' ? state.points : [] };
}
