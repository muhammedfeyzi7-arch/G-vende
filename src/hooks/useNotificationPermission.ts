import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

export type NotifPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

/** İşletim sistemi bildirim izni (ekran her açıldığında yeniden okunur). */
export function useNotificationPermission() {
  const [status, setStatus] = useState<NotifPermission>('undetermined');
  const refresh = useCallback(() => {
    if (Platform.OS === 'web') return setStatus('unavailable');
    Notifications.getPermissionsAsync()
      .then((p) => setStatus(p.granted ? 'granted' : p.canAskAgain === false || p.status === 'denied' ? 'denied' : 'undetermined'))
      .catch(() => setStatus('unavailable'));
  }, []);
  useFocusEffect(refresh);
  const request = useCallback(async () => {
    try {
      const p = await Notifications.requestPermissionsAsync();
      setStatus(p.granted ? 'granted' : 'denied');
      return p.granted;
    } catch {
      setStatus('unavailable');
      return false;
    }
  }, []);
  return { status, refresh, request };
}
