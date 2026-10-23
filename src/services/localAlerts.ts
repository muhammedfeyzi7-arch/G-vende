import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { InboxItem } from '@/features/inbox/rules';

/**
 * Sunucusuz yerel bildirim: uygulama açıkken (veya arka plandan döndüğünde) kaynaklardan gelen yeni
 * deprem kaydı tercihlere uyuyorsa telefona bildirim düşer. Uygulama tamamen kapalıyken bildirim için
 * sunucu tarafı push (notify / ingest işlevleri) gerekir. Erken uyarı DEĞİLDİR.
 */
let configured = false;
function configure() {
  if (configured || Platform.OS === 'web') return;
  configured = true;
  Notifications.setNotificationHandler?.({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync?.('quakes', {
      name: 'Deprem kayıtları',
      importance: Notifications.AndroidImportance?.HIGH ?? 4,
      description: 'Kaynaklarda yayımlanan yeni deprem kayıtları (erken uyarı değildir)',
    }).catch(() => {});
  }
}

/** Yalnızca son 15 dakikadaki ve daha önce bildirilmemiş öğeler için telefona bildirim gönderir. */
export async function notifyLocally(items: InboxItem[], now = Date.now()): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const fresh = items.filter((i) => (i.kind === 'quake' || i.kind === 'official') && now - Date.parse(i.at) < 15 * 60_000);
  if (!fresh.length) return 0;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return 0;
    configure();
    for (const i of fresh.slice(0, 3)) {
      await Notifications.scheduleNotificationAsync({
        content: { title: i.title, body: i.body, data: { url: i.href ? `guvende:/${i.href}` : undefined } },
        trigger: Platform.OS === 'android' ? { channelId: 'quakes' } as never : null,
      });
    }
    return Math.min(fresh.length, 3);
  } catch {
    return 0;
  }
}
