import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/providers/AppProvider';
import { ReportsProvider } from '@/providers/ReportsProvider';
import { colors } from '@/theme';

export default function RootLayout() {
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
