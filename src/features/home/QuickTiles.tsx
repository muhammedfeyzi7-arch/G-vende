import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { Icon } from '@/components/ds';
import { colors, currentScheme, radius, spacing, themedStyles } from '@/theme';

export type Tile = {
  key: string;
  icon: string;
  color: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  onLongPress?: () => void;
  big?: boolean;
};

/** Ana sayfadaki renkli hızlı erişim kutuları (yatay sığar; dar ekranda kaydırılır). */
export function QuickTiles({ tiles }: { tiles: Tile[] }) {
  const light = currentScheme() === 'light';
  return (
    <View style={styles.row}>
      {tiles.map((t) => (
        <Pressable
          key={t.key}
          onPress={t.onPress}
          onLongPress={t.onLongPress}
          accessibilityHint={t.onLongPress ? 'Uzun basınca diğer acil numaralar' : undefined}
          accessibilityRole="button"
          accessibilityLabel={[t.title, t.subtitle].filter(Boolean).join(', ')}
          style={({ pressed }) => [
            styles.tile,
            { borderColor: t.color + '66' },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          <LinearGradient
            colors={
              t.big ? [colors.alertFrom, colors.alertTo] : light ? [t.color + '24', t.color + '0A'] : [t.color + '40', t.color + '14']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Icon name={t.icon} size={24} color={t.big ? colors.onAccent : t.color} />
          {t.big ? (
            <AppText variant="title" color="#fff" style={{ fontSize: 19.5, lineHeight: 23 }}>
              {t.title}
            </AppText>
          ) : (
            <AppText variant="label" color={t.key === 'toplanma' ? t.color : colors.text} numberOfLines={3} style={styles.title}>
              {t.title}
            </AppText>
          )}
          {t.subtitle ? (
            <AppText variant="caption" color={t.big ? '#FDE3E6' : colors.textSecondary} numberOfLines={2} style={styles.sub}>
              {t.subtitle}
            </AppText>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = themedStyles(() => ({
  row: { flexDirection: 'row', gap: spacing.xs },
  tile: {
    flex: 1,
    minHeight: 86,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  title: { textAlign: 'center', fontSize: 12, fontWeight: '700', lineHeight: 14.5 },
  sub: { textAlign: 'center', fontSize: 11, lineHeight: 13.5 },
}));
