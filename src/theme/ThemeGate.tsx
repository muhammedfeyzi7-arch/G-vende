import { router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';
import { useApp } from '@/providers/AppProvider';
import { applyScheme, colors, type Scheme } from './index';

/**
 * Seçilen temayı (cihazla aynı / koyu / açık) uygular. Tema değişince ekran ağacı yeniden kurulur;
 * böylece tüm stiller yeni renklerle çizilir. Kullanıcının bulunduğu sayfa korunur.
 */
export function ThemeGate({ children }: { children: ReactNode }) {
  const { settings, settingsLoaded } = useApp();
  const system = useColorScheme();
  const scheme: Scheme = settings.theme === 'system' ? (system === 'light' ? 'light' : 'dark') : settings.theme;

  // Render sırasında uygulanır ki alt bileşenler ilk çizimde doğru renkleri okusun.
  useMemo(() => applyScheme(scheme), [scheme]);

  const pathname = usePathname();
  const lastPath = useRef(pathname);
  const lastScheme = useRef(scheme);
  useEffect(() => {
    if (lastScheme.current !== scheme) {
      lastScheme.current = scheme;
      const p = lastPath.current;
      // Yeniden kurulumdan sonra kullanıcıyı aynı sayfaya geri götür.
      if (p && p !== '/') setTimeout(() => router.navigate(p as never), 0);
    } else {
      lastPath.current = pathname;
    }
  }, [scheme, pathname]);

  // Ayarlar okunmadan çizme: açık tema seçen kullanıcı koyu ekran yanıp sönmesi görmesin.
  if (!settingsLoaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <View key={scheme} style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      {children}
    </View>
  );
}
