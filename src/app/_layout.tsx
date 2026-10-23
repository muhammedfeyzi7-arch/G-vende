import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BiometricGate } from '@/features/settings/BiometricGate';
import { AppProvider } from '@/providers/AppProvider';
import { InboxProvider, useInbox } from '@/providers/InboxProvider';
import { ReportsProvider } from '@/providers/ReportsProvider';
import { TrustProvider } from '@/features/trust/TrustProvider';
import { ThemeGate } from '@/theme/ThemeGate';
import { ToastProvider } from '@/components/Toast';
import { ConnectivityToasts } from '@/components/ConnectivityToasts';
import { colors } from '@/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Bildirime dokunulunca uygulama içindeki ilgili ekrana git (yalnızca guvende:// bağlantıları). */
function useNotificationRouting() {
  const inbox = useInbox();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    // Uygulama açıkken gelen push bildirimleri bildirim merkezine de yazılır.
    const recv = Notifications.addNotificationReceivedListener((n) => {
      const c = n.request.content;
      const url = typeof c.data?.url === 'string' ? c.data.url : undefined;
      inbox.add([
        {
          id: `push:${n.request.identifier}`,
          kind: url?.includes('ailem') ? 'family' : 'quake',
          title: c.title ?? 'GÜVENDE',
          body: c.body ?? '',
          at: new Date(n.date).toISOString(),
          read: false,
          href: url?.replace('guvende://', '/'),
        },
      ]);
    });
    const open = (n: Notifications.Notification | null | undefined) => {
      const url = n?.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('guvende://')) router.push(url.replace('guvende://', '/') as never);
    };
    open(Notifications.getLastNotificationResponse()?.notification);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification));
    return () => {
      sub.remove();
      recv.remove();
    };
  }, [inbox.add]); // eslint-disable-line react-hooks/exhaustive-deps
}

function NotificationRouting() {
  useNotificationRouting();
  return null;
}

/** Gezinti yığını: ThemeGate içinde çizildiği için başlık ve zemin renkleri seçili temayı izler. */
function RootStack() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="deprem/[id]" options={{ title: 'Deprem Detayı' }} />
      <Stack.Screen name="rapor/yeni" options={{ title: 'Bildirim Ekle', presentation: 'modal' }} />
      <Stack.Screen name="rapor/[id]" options={{ title: 'Bildirim' }} />
      <Stack.Screen name="rapor/bekleyen" options={{ title: 'Bekleyen Gönderiler' }} />
      <Stack.Screen name="kimlik" options={{ title: 'Kimlik Doğrulama' }} />
      <Stack.Screen name="guven" options={{ title: 'Bilgi Güvenliği' }} />
      <Stack.Screen name="toplanma/index" options={{ title: 'Toplanma Alanları' }} />
      <Stack.Screen name="toplanma/sec" options={{ title: 'Toplanma Alanımı İşaretle' }} />
      <Stack.Screen name="konum" options={{ title: 'Konum', presentation: 'modal' }} />
      <Stack.Screen name="giris" options={{ title: 'Giriş Yap', presentation: 'modal' }} />
      <Stack.Screen name="aile/davet/[token]" options={{ title: 'Aile Daveti' }} />
      <Stack.Screen name="profil" options={{ title: 'Profil Düzenle' }} />
      <Stack.Screen name="hesap" options={{ title: 'Hesap' }} />
      <Stack.Screen name="gizlilik/index" options={{ title: 'Konum ve Gizlilik' }} />
      <Stack.Screen name="gizlilik/gizle" options={{ title: 'Konumumu Gizle' }} />
      <Stack.Screen name="guvenlik" options={{ title: 'Güvenlik' }} />
      <Stack.Screen name="tercihler" options={{ title: 'Uygulama Tercihleri' }} />
      <Stack.Screen name="bildirim-ayarlari" options={{ title: 'Bildirim Ayarları' }} />
      <Stack.Screen name="yardim" options={{ title: 'Yardım Merkezi' }} />
      <Stack.Screen name="geri-bildirim" options={{ title: 'Geri Bildirim' }} />
      <Stack.Screen name="hakkinda" options={{ title: 'Hakkında' }} />
      <Stack.Screen name="bildirimler" options={{ title: 'Bildirimler' }} />
      <Stack.Screen name="akis" options={{ title: 'Son Bildirimler' }} />
      <Stack.Screen name="depremler" options={{ title: 'Deprem Geçmişi' }} />
      <Stack.Screen name="acil-mod" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="acil-sms" options={{ title: 'Hazır Mesajlar' }} />
      <Stack.Screen name="arama" options={{ title: 'Acil Arama' }} />
      <Stack.Screen name="hosgeldin" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="rapor/benim" options={{ title: 'Bildirimlerim' }} />
      <Stack.Screen name="duyurular" options={{ title: 'Resmî Bilgiler' }} />
      <Stack.Screen name="canta" options={{ title: 'Acil Durum Çantası' }} />
      <Stack.Screen name="rehber/index" options={{ title: 'Afet Rehberleri' }} />
      <Stack.Screen name="rehber/[id]" options={{ title: 'Rehber' }} />
      <Stack.Screen name="saglik-bilgilerim" options={{ title: 'Sağlık Bilgilerim' }} />
      <Stack.Screen name="aile/ekle" options={{ title: 'Üye Ekle', presentation: 'modal' }} />
      <Stack.Screen name="aile/bulusma" options={{ title: 'Toplanma Noktası' }} />
      <Stack.Screen name="aile/kisi/[id]" options={{ title: 'Aile Üyesi' }} />
      <Stack.Screen name="harita-tam" options={{ headerShown: false }} />
      <Stack.Screen name="isik" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <AppProvider>
        <TrustProvider>
          <InboxProvider>
            <ReportsProvider>
              <NotificationRouting />
              <ThemeGate>
                <ToastProvider>
                  <ConnectivityToasts />
                  <BiometricGate>
                    <RootStack />
                  </BiometricGate>
                </ToastProvider>
              </ThemeGate>
            </ReportsProvider>
          </InboxProvider>
        </TrustProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
