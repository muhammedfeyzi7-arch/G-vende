import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

type Item = { label: string; icon: (color: string, focused: boolean) => ReactNode; emergency?: boolean };

const SIZE = 27;
const ITEMS: Record<string, Item> = {
  index: { label: 'Ana Sayfa', icon: (c, f) => <Ionicons name={f ? 'home' : 'home-outline'} size={SIZE} color={c} /> },
  harita: { label: 'Harita', icon: (c, f) => <Ionicons name={f ? 'map' : 'map-outline'} size={SIZE} color={c} /> },
  acil: {
    label: 'Acil Durum',
    icon: (c, f) => <MaterialCommunityIcons name={f ? 'alarm-light' : 'alarm-light-outline'} size={SIZE + 1} color={c} />,
    emergency: true,
  },
  ailem: { label: 'Ailem', icon: (c, f) => <Ionicons name={f ? 'people' : 'people-outline'} size={SIZE} color={c} /> },
  ayarlar: { label: 'Ayarlar', icon: (c, f) => <Ionicons name={f ? 'settings' : 'settings-outline'} size={SIZE - 1} color={c} /> },
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
            <View style={[styles.indicator, focused && { backgroundColor: color }]} />
            <View
              style={focused ? { filter: [{ dropShadow: { offsetX: 0, offsetY: 0, standardDeviation: 6, color: color + '88' } }] } : null}
            >
              {item.icon(color, focused || !!item.emergency)}
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
  },
  item: { flex: 1, alignItems: 'center', gap: 3, minHeight: 58, justifyContent: 'flex-start' },
  indicator: {
    width: 34,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  label: { fontSize: 12.5 },
});
