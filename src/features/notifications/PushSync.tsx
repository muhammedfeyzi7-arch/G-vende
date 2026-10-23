import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useApp } from '@/providers/AppProvider';
import { registerForPush, syncPreferences } from '@/services/notifications';
import { coarsen } from '@/utils/geo';

/**
 * Oturum açıkken bildirim tercihlerini ve (izin zaten verilmişse) push belirtecini sunucuyla
 * hangi ekranda olunursa olsun eşitler. İzin istemi göstermez; izin yalnızca kullanıcı eylemiyle istenir.
 */
export function PushSync() {
  const { settings, settingsLoaded, userCoords, session } = useApp();
  const lastKey = useRef('');
  const registeredFor = useRef<string | null>(null);

  const region = userCoords ? coarsen(userCoords) : null;
  const key = JSON.stringify([
    session?.user.id ?? null,
    settings.quakeNotifications,
    settings.officialNotifications,
    settings.familyNotifications,
    settings.communityNotifications,
    settings.minNotifyMagnitude,
    settings.notifyIntervalMinutes,
    region?.latitude ?? null,
    region?.longitude ?? null,
  ]);

  useEffect(() => {
    if (!settingsLoaded || !session || key === lastKey.current) return;
    const t = setTimeout(() => {
      lastKey.current = key;
      syncPreferences(settings, userCoords).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [key, settingsLoaded, session]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const uid = session?.user.id;
    if (!uid || registeredFor.current === uid || Platform.OS === 'web') return;
    Notifications.getPermissionsAsync()
      .then((p) => (p.granted ? registerForPush() : null))
      .then((r) => {
        if (r?.ok) registeredFor.current = uid;
      })
      .catch(() => {});
  }, [session?.user.id]);

  return null;
}
