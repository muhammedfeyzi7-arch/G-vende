import * as Location from 'expo-location';
import type { LatLng } from '@/utils/geo';

export type LocationState =
  | { status: 'unknown' }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'unavailable'; message: string }
  | { status: 'granted'; coords: LatLng; accuracyM: number | null; at: string }
  | { status: 'manual'; coords: LatLng; label: string };

export async function getPermissionStatus(): Promise<Location.PermissionResponse> {
  return Location.getForegroundPermissionsAsync();
}

/** Yalnızca ön plan konumu istenir; arka plan konumu hiç istenmez. */
export async function requestAndGetLocation(): Promise<LocationState> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') return { status: 'denied', canAskAgain: perm.canAskAgain };
  return readCurrent();
}

export async function readCurrent(): Promise<LocationState> {
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000, requiredAccuracy: 2000 });
    const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return {
      status: 'granted',
      coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
      accuracyM: pos.coords.accuracy ?? null,
      at: new Date(pos.timestamp).toISOString(),
    };
  } catch (e) {
    return { status: 'unavailable', message: e instanceof Error ? e.message : 'Konum alınamadı' };
  }
}

export const coordsOf = (s: LocationState): LatLng | null => (s.status === 'granted' || s.status === 'manual' ? s.coords : null);
