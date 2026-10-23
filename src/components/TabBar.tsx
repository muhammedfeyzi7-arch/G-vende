import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { haptic } from '@/services/haptics';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, themedStyles } from '@/theme';

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
  // Referans tasarımdaki gibi: Ana Sayfa'dayken Acil Durum yükseltilmiş kırmızı daire olarak öne çıkar.
  const onHome = state.routes[state.index]?.name === 'index';
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const item = ITEMS[route.name];
        if (!item) return null;
        const focused = state.index === index;
        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            haptic.select();
            navigateToTab(route.key);
          }
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
              {item.center && onHome ? (
                <View style={styles.raised}>
                  <Ionicons name="warning-outline" size={26} color="#fff" />
                </View>
              ) : item.center ? (
                <MaterialCommunityIcons name="alarm-light" size={28} color={color} style={focused ? styles.glow : undefined} />
              ) : (
                <Ionicons name={item.iconActive as never} size={24} color={color} />
              )}
            </View>
            <Text
              style={[
                styles.label,
                { color: item.center && onHome ? colors.text : color, fontWeight: focused || item.center ? '600' : '500' },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() => ({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.tabBar,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
    paddingTop: 6,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3, minHeight: 56 },
  iconWrap: { height: 32, justifyContent: 'center' },
  raised: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginTop: -26,
    backgroundColor: colors.danger,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(255,53,72,0.6)',
  },
  glow: { textShadowColor: 'rgba(255,53,72,0.8)', textShadowRadius: 12 },
  label: { fontSize: 11.5 },
}));
