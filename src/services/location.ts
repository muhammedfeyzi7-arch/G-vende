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

/** Yeni konum en fazla bu kadar beklenir (internetsiz/kapalı alanda GPS ilk konumu dakikalar sürebilir). */
export const FIX_TIMEOUT_MS = 8000;

/**
 * Pil dostu tek seferlik okuma: önce son bilinen konum (anında, ek pil yok), yoksa "dengeli"
 * doğrulukta yeni konum (hücre/Wi-Fi destekli; sürekli GPS açmaz). Sürekli veya arka plan takibi yapılmaz.
 */
export async function readCurrent(): Promise<LocationState> {
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000, requiredAccuracy: 2000 });
    const pos =
      last ??
      (await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), FIX_TIMEOUT_MS)),
      ]).catch(async (e) => {
        // Süre doldu: daha eski de olsa son bilinen konum (acil SMS konumsuz kalmasın).
        const old = await Location.getLastKnownPositionAsync();
        if (old) return old;
        throw e;
      }));
    return {
      status: 'granted',
      coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
      accuracyM: pos.coords.accuracy ?? null,
      at: new Date(pos.timestamp).toISOString(),
    };
  } catch (e) {
    return { status: 'unavailable', message: 'Konum alınamadı. Konum servislerinin açık olduğundan emin olun.' };
  }
}

export const coordsOf = (s: LocationState): LatLng | null => (s.status === 'granted' || s.status === 'manual' ? s.coords : null);
