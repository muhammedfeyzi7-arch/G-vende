import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radius, spacing, themedStyles } from '@/theme';
import { formatDateTr } from '@/utils/time';
import { CHECKED_AT, CONTENT_VERSION, isStale, type Source, type QUICK_LINKS } from './content';

type QuickTarget = (typeof QUICK_LINKS)[number]['target'];

export function openGuideTarget(t: QuickTarget) {
  if (t.kind === 'topic') router.push({ pathname: '/rehber/[id]', params: { id: t.id } });
  else if (t.kind === 'cat') router.push({ pathname: '/rehber/kategori/[id]', params: { id: t.id } });
  else router.push(t.href);
}

/** "İnternetsiz çalışır · Son doğrulama …" satırı; doğrulama eskiyse açıkça uyarır. */
export function OfflineNote() {
  const stale = isStale();
  return (
    <View style={[styles.note, stale && { borderColor: colors.warning }]} accessibilityRole="text">
      <Ionicons name={stale ? 'warning-outline' : 'cloud-offline-outline'} size={16} color={stale ? colors.warning : colors.safe} />
      <AppText variant="caption" style={{ flex: 1 }}>
        {stale
          ? `Bu rehber en son ${formatDateTr(CHECKED_AT)} tarihinde resmî kaynaklarla karşılaştırıldı ve güncel olmayabilir. İnternet varsa kaynaklardan kontrol edin.`
          : `İnternetsiz çalışır · Son doğrulama ${formatDateTr(CHECKED_AT)} · Sürüm ${CONTENT_VERSION}`}
      </AppText>
    </View>
  );
}

/** Kaynak listesi: kurum, başlık, yayın ve kontrol tarihleri; bağlantılar internet gerektirir. */
export function SourceList({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <View style={styles.sources}>
      <AppText variant="label" color={colors.text} style={{ fontWeight: '700' }}>
        Kaynaklar
      </AppText>
      {sources.map((s) => (
        <View key={s.id} style={{ gap: 2 }}>
          <AppText variant="caption" color={colors.text}>
            {s.org} — {s.title}
          </AppText>
          <AppText variant="caption">
            {s.publishedAt ? `Yayın: ${formatDateTr(s.publishedAt)} · ` : ''}Son kontrol: {formatDateTr(s.checkedAt)}
          </AppText>
          {s.url ? (
            <Pressable onPress={() => Linking.openURL(s.url!).catch(() => {})} accessibilityRole="link" hitSlop={6}>
              <AppText variant="caption" color={colors.primary}>
                Kaynağı aç (internet gerekir) ↗
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ))}
      <AppText variant="caption">
        Metinler resmî kaynaklardaki bilgilere dayanan kısa özetlerdir; kaynak metnin yerine ve eğitimin yerine geçmez. GÜVENDE, AFAD’ın
        veya başka bir kurumun resmî uygulaması değildir.
      </AppText>
    </View>
  );
}

const styles = themedStyles(() => ({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sources: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
}));
