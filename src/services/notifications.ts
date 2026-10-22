import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Settings } from '@/features/settings/settings';
import type { LatLng } from '@/utils/geo';
import { coarsen } from '@/utils/geo';
import { getSupabase } from './supabase';

/**
 * Push bildirimleri yalnızca sunucuya kaydedilmiş deprem kayıtlarından (gecikmeli) üretilir.
 * Bu bir erken uyarı sistemi DEĞİLDİR.
 */
export type PushRegistration = { ok: true; token: string } | { ok: false; reason: string };

export async function registerForPush(): Promise<PushRegistration> {
  const sb = getSupabase();
  if (!sb) return { ok: false, reason: 'Sunucu yapılandırılmadı.' };
  const { data } = await sb.auth.getSession();
  if (!data.session) return { ok: false, reason: 'Bildirim almak için giriş yapın.' };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('quakes', {
      name: 'Deprem kayıtları',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Kaynaklarda yayımlanan yeni deprem kayıtları (erken uyarı değildir)',
    });
    await Notifications.setNotificationChannelAsync('family', { name: 'Aile durumu', importance: Notifications.AndroidImportance.HIGH });
  }
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: 'Bildirim izni verilmedi.' };

  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  if (!projectId) return { ok: false, reason: 'EAS projectId tanımlı değil (eas init çalıştırılmalı).' };
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await sb
      .from('push_tokens')
      .upsert({ token, platform: Platform.OS === 'ios' ? 'ios' : 'android', updated_at: new Date().toISOString() });
    if (error) return { ok: false, reason: error.message };
    return { ok: true, token };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'Push belirteci alınamadı' };
  }
}

/** Tercihleri sunucuya eşitler; bölge yalnızca yaklaşık (~1 km) gönderilir. */
export async function syncPreferences(s: Settings, region: LatLng | null): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  if (!data.session) return;
  const r = region ? coarsen(region) : null;
  await sb.from('notification_preferences').upsert({
    user_id: data.session.user.id,
    quakes_enabled: s.quakeNotifications,
    min_magnitude: s.minNotifyMagnitude,
    region_lat: r?.latitude ?? null,
    region_lon: r?.longitude ?? null,
    family_enabled: s.familyNotifications,
    official_enabled: s.officialNotifications,
    community_enabled: s.communityNotifications,
    min_interval_minutes: s.notifyIntervalMinutes,
    updated_at: new Date().toISOString(),
  });
}
