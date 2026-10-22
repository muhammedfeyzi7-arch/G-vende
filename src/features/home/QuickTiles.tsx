import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { Icon } from '@/components/ds';
import { radius, spacing } from '@/theme';

export type Tile = { key: string; icon: string; color: string; title: string; subtitle?: string; onPress: () => void; big?: boolean };

/** Ana sayfadaki renkli hızlı erişim kutuları (yatay sığar; dar ekranda kaydırılır). */
export function QuickTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <View style={styles.row}>
      {tiles.map((t) => (
        <Pressable
          key={t.key}
          onPress={t.onPress}
          accessibilityRole="button"
          accessibilityLabel={[t.title, t.subtitle].filter(Boolean).join(', ')}
          style={({ pressed }) => [
            styles.tile,
            { borderColor: t.color + '66' },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          <LinearGradient
            colors={[t.color + '40', t.color + '14']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Icon name={t.icon} size={28} color={t.color} />
          {t.big ? (
            <AppText variant="title" color="#fff" style={{ fontSize: 22, lineHeight: 26 }}>
              {t.title}
            </AppText>
          ) : (
            <AppText variant="label" color={t.color === '#8B5CF6' ? '#C4B5FD' : t.color} numberOfLines={2} style={styles.title}>
              {t.title}
            </AppText>
          )}
          {t.subtitle ? (
            <AppText variant="caption" color={t.big ? '#F6C9CE' : '#C9D4E0'} numberOfLines={2} style={styles.sub}>
              {t.subtitle}
            </AppText>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs + 2 },
  tile: {
    flex: 1,
    minHeight: 112,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  title: { textAlign: 'center', fontSize: 13, fontWeight: '700', lineHeight: 16 },
  sub: { textAlign: 'center', fontSize: 11, lineHeight: 14 },
});
