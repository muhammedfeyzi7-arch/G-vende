import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/providers/AppProvider';
import { ReportsProvider } from '@/providers/ReportsProvider';
import { colors } from '@/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Bildirime dokunulunca uygulama içindeki ilgili ekrana git (yalnızca guvende:// bağlantıları). */
function useNotificationRouting() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const open = (n: Notifications.Notification | null | undefined) => {
      const url = n?.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('guvende://')) router.push(url.replace('guvende://', '/') as never);
    };
    open(Notifications.getLastNotificationResponse()?.notification);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification));
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  useNotificationRouting();
  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <AppProvider>
        <ReportsProvider>
          <StatusBar style="light" />
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
            <Stack.Screen name="toplanma" options={{ title: 'Toplanma Alanları' }} />
            <Stack.Screen name="konum" options={{ title: 'Konum', presentation: 'modal' }} />
            <Stack.Screen name="giris" options={{ title: 'Giriş Yap', presentation: 'modal' }} />
            <Stack.Screen name="aile/davet/[token]" options={{ title: 'Aile Daveti' }} />
          </Stack>
        </ReportsProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
