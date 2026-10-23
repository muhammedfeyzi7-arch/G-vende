import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

const ITEMS: Record<string, { label: string; icon: string; iconActive: string; center?: boolean }> = {
  index: { label: 'Ana Sayfa', icon: 'home-outline', iconActive: 'home' },
  harita: { label: 'Harita', icon: 'map-outline', iconActive: 'map' },
  acil: { label: 'Acil Durum', icon: 'alarm-light', iconActive: 'alarm-light', center: true },
  ailem: { label: 'Ailem', icon: 'people-outline', iconActive: 'people' },
  ayarlar: { label: 'Ayarlar', icon: 'settings-outline', iconActive: 'settings' },
};

/** Referans tasarımdaki beş bölümlü alt navigasyon; ortadaki Acil Durum her zaman kırmızıdır. */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const item = ITEMS[route.name];
        if (!item) return null;
        const focused = state.index === index;
        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };
        // Acil Durum her zaman kırmızıdır (hızlı erişim; alarm göstergesi değildir).
        const color = item.center ? colors.danger : focused ? colors.primary : colors.textSecondary;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={item.label}
            onPress={onPress}
            style={styles.item}
          >
            <View style={styles.iconWrap}>
              {item.center ? (
                <MaterialCommunityIcons name="alarm-light" size={30} color={color} style={focused ? styles.glow : undefined} />
              ) : (
                <Ionicons name={item.iconActive as never} size={26} color={color} />
              )}
            </View>
            <Text style={[styles.label, { color, fontWeight: focused || item.center ? '600' : '500' }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#040D17',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
    paddingTop: 6,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3, minHeight: 56 },
  iconWrap: { height: 32, justifyContent: 'center' },
  glow: { textShadowColor: 'rgba(255,53,72,0.8)', textShadowRadius: 12 },
  label: { fontSize: 12 },
});
