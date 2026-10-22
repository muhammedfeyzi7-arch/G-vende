import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { BellButton } from '@/components/ds';
import { useAreaLabel } from '@/hooks/useAreaLabel';
import { useApp } from '@/providers/AppProvider';
import { useInbox } from '@/providers/InboxProvider';
import { colors, spacing } from '@/theme';

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <View style={{ alignItems: 'center' }} accessible accessibilityRole="header" accessibilityLabel="GÜVENDE, Afet Anında Yanınızda">
      <Ionicons
        name="pulse"
        size={compact ? 18 : 22}
        color={colors.danger}
        style={{ marginBottom: -6, textShadowColor: colors.danger, textShadowRadius: 8 }}
      />
      <AppText variant="title" style={{ fontSize: compact ? 18 : 22, letterSpacing: 0.5, fontWeight: '800' }}>
        GÜVENDE
      </AppText>
      <AppText variant="caption" color={colors.textSecondary} style={{ fontSize: 11 }}>
        Afet Anında Yanınızda
      </AppText>
    </View>
  );
}

/** Ana sayfa üst çubuğu: konum, logo ve bildirim zili. */
export function HomeHeader() {
  const { location } = useApp();
  const { unread } = useInbox();
  const area = useAreaLabel();
  const city = area.label?.split(' · ')[0] ?? null;
  const sub =
    location.status === 'granted'
      ? 'Konumunuzu kullanıyoruz'
      : location.status === 'manual'
        ? 'Elle seçilen il'
        : location.status === 'denied'
          ? 'Konum izni yok'
          : 'Konum belirlenmedi';
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.push('/konum')}
        accessibilityRole="button"
        accessibilityLabel={`Konum: ${city ?? 'seçilmedi'}. ${sub}`}
        style={styles.loc}
      >
        <Ionicons name="location" size={24} color={colors.primary} />
        <View style={{ flexShrink: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppText variant="heading" numberOfLines={1} style={{ fontSize: 17, flexShrink: 1 }}>
              {city ?? 'Konum seç'}
            </AppText>
            <Ionicons name="chevron-down" size={16} color={colors.text} />
          </View>
          <AppText variant="caption" numberOfLines={1} style={{ fontSize: 11 }}>
            {sub}
          </AppText>
        </View>
      </Pressable>
      <Logo />
      <View style={styles.right}>
        <BellButton count={unread} onPress={() => router.push('/bildirimler')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 56 },
  loc: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  right: { width: 50, alignItems: 'flex-end' },
});
