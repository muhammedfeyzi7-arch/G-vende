import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { IconTile, Page } from '@/components/ds';
import { CONTENT_SOURCE, GUIDES } from '@/features/emergency/content';
import { AfterIcon, CoverIcon, DropIcon, HoldIcon } from '@/features/emergency/DropCoverHold';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, themedStyles } from '@/theme';

/** Afet rehberleri (uygulamaya gömülü, internetsiz). */
export default function Guides() {
  return (
    <Page>
      <View style={styles.hero}>
        {[DropIcon, CoverIcon, HoldIcon, AfterIcon].map((I, i) => (
          <I key={i} size={72} />
        ))}
      </View>
      {GUIDES.map((g) => (
        <Pressable
          key={g.id}
          onPress={() => router.push({ pathname: '/rehber/[id]', params: { id: g.id } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
        >
          <IconTile icon={g.icon} color={g.color} size={46} />
          <View style={{ flex: 1 }}>
            <AppText variant="heading" style={{ fontSize: 14 }}>
              {g.title}
            </AppText>
            <AppText variant="caption">{g.summary}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
      ))}
      <Pressable onPress={() => Linking.openURL(CONTENT_SOURCE.url)} accessibilityRole="link">
        <AppText variant="caption">Kaynak: {CONTENT_SOURCE.name}. Güncel ve tam metin için afad.gov.tr ↗</AppText>
      </Pressable>
    </Page>
  );
}

const styles = themedStyles(() => ({
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
}));
