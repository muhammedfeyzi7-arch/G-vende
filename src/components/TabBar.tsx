import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

const ITEMS: Record<string, { label: string; icon: string; iconActive: string; center?: boolean }> = {
  index: { label: 'Ana Sayfa', icon: 'home-outline', iconActive: 'home' },
  harita: { label: 'Harita', icon: 'map-outline', iconActive: 'map' },
  acil: { label: 'Acil Durum', icon: 'warning-outline', iconActive: 'warning', center: true },
  ailem: { label: 'Ailem', icon: 'people-outline', iconActive: 'people' },
  ayarlar: { label: 'Ayarlar', icon: 'settings-outline', iconActive: 'settings' },
};

/**
 * Referans tasarımdaki beş bölümlü alt navigasyon. Ortadaki Acil Durum düğmesi her zaman
 * kırmızı ve yükseltilmiştir; bu bir alarm göstergesi değil, hızlı erişim düğmesidir.
 */
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
        if (item.center) {
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={item.label}
              onPress={onPress}
              style={styles.item}
            >
              <View style={[styles.centerBtn, focused && styles.centerBtnActive]}>
                <Ionicons name="warning-outline" size={30} color="#fff" />
              </View>
              <Text
                style={[styles.label, { color: focused ? colors.danger : colors.text, fontWeight: '700', marginTop: 2 }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        }
        const color = focused ? colors.primary : colors.textSecondary;
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
              <Ionicons name={(focused ? item.iconActive : item.icon) as never} size={27} color={color} />
            </View>
            <Text style={[styles.label, { color, fontWeight: focused ? '700' : '500' }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
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
  centerBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    marginTop: -28,
    backgroundColor: colors.danger,
    borderWidth: 3,
    borderColor: '#FF6B78',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 22px rgba(255,53,72,0.55)',
  },
  centerBtnActive: { borderColor: '#FFFFFF' },
  label: { fontSize: 12.5 },
});
