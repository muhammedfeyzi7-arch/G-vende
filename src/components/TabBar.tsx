import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const ITEMS: Record<string, { label: string; icon: IconName; iconActive: IconName; emergency?: boolean }> = {
  index: { label: 'Ana Sayfa', icon: 'home-outline', iconActive: 'home' },
  harita: { label: 'Harita', icon: 'map-outline', iconActive: 'map' },
  acil: { label: 'Acil Durum', icon: 'medkit-outline', iconActive: 'medkit', emergency: true },
  ailem: { label: 'Ailem', icon: 'people-outline', iconActive: 'people' },
  ayarlar: { label: 'Ayarlar', icon: 'settings-outline', iconActive: 'settings' },
};

/** Referans görseldeki beş bölümlü alt navigasyon. Acil Durum sabit vurgu rengindedir (alarm değildir). */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const item = ITEMS[route.name];
        if (!item) return null;
        const focused = state.index === index;
        const color = item.emergency ? colors.danger : focused ? colors.primary : colors.textSecondary;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={item.label}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigateToTab(route.key);
            }}
            style={styles.item}
          >
            <View style={[styles.indicator, focused && { backgroundColor: item.emergency ? colors.danger : colors.primary }]} />
            <Ionicons name={focused ? item.iconActive : item.icon} size={26} color={color} />
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
    backgroundColor: '#050F1A',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
    paddingTop: 2,
  },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: 56, justifyContent: 'flex-start' },
  indicator: { width: 28, height: 3, borderRadius: 2, marginBottom: 6, backgroundColor: 'transparent' },
  label: { fontSize: 12 },
});
