import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '@/components/TabBar';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa' }} />
      <Tabs.Screen name="harita" options={{ title: 'Harita' }} />
      <Tabs.Screen name="acil" options={{ title: 'Acil Durum' }} />
      <Tabs.Screen name="ailem" options={{ title: 'Ailem' }} />
      <Tabs.Screen name="ayarlar" options={{ title: 'Ayarlar' }} />
    </Tabs>
  );
}
