import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import type { AlertState } from '@/features/earthquakes/alertState';
import type { MyStatus } from '@/features/family/local';
import { colors, iconColors, radius, spacing, themedStyles } from '@/theme';
import { relativeTimeTr } from '@/utils/time';

/**
 * Yakında yeni bir önemli deprem kaydı varsa ve kişi o depremden sonra durum bildirmediyse
 * "Güvende misin?" sorulur. (Kaynak kaydına dayanır; erken uyarı değildir.)
 */
export function shouldAskCheckIn(alert: AlertState, my: MyStatus | null): boolean {
  if (alert.kind !== 'recent-significant') return false;
  return !my || Date.parse(my.at) < Date.parse(alert.event.primary.occurredAt);
}

export function CheckInCard({
  alert,
  myStatus,
  onSafe,
  onHelp,
}: {
  alert: AlertState;
  myStatus: MyStatus | null;
  onSafe: () => void;
  onHelp: () => void;
}) {
  if (alert.kind !== 'recent-significant') return null;
  if (!shouldAskCheckIn(alert, myStatus)) {
    // Bildirildi: küçük onay satırı (yeniden göndermek Ailem sekmesinden).
    return (
      <Pressable onPress={() => router.push('/ailem')} accessibilityRole="button" style={[styles.done]}>
        <Ionicons
          name={myStatus?.kind === 'help' ? 'alert-circle' : 'checkmark-circle'}
          size={20}
          color={myStatus?.kind === 'help' ? iconColors.red : iconColors.green}
        />
        <AppText variant="label" color={colors.text} style={{ flex: 1 }}>
          {myStatus?.kind === 'help' ? 'Yardım mesajı hazırlandı' : 'Ailene “Güvendeyim” dedin'} · {relativeTimeTr(myStatus!.at)}
        </AppText>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </Pressable>
    );
  }
  return (
    <View style={styles.card} accessibilityRole="summary">
      <AppText variant="title" style={{ fontSize: 17.5 }}>
        Güvende misin?
      </AppText>
      <AppText variant="caption">Tek dokunuşla ailene haber ver. Mesaj, gönder’e basmadan gitmez.</AppText>
      <View style={styles.row}>
        <Pressable
          onPress={onSafe}
          accessibilityRole="button"
          accessibilityLabel="Güvendeyim mesajı gönder"
          style={({ pressed }) => [styles.btn, { backgroundColor: iconColors.green }, pressed && styles.pressed]}
        >
          <Ionicons name="shield-checkmark" size={22} color="#fff" />
          <AppText variant="heading" color="#fff" style={{ fontSize: 16 }}>
            Güvendeyim
          </AppText>
        </Pressable>
        <Pressable
          onPress={onHelp}
          accessibilityRole="button"
          accessibilityLabel="Yardım lazım mesajı hazırla"
          style={({ pressed }) => [styles.btn, styles.helpBtn, pressed && styles.pressed]}
        >
          <Ionicons name="alert-circle" size={22} color={iconColors.red} />
          <AppText variant="heading" color={iconColors.red} style={{ fontSize: 16 }}>
            Yardım lazım
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: iconColors.green + '66',
    boxShadow: colors.shadowSoft,
  },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  btn: {
    flex: 1,
    minHeight: 56,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  helpBtn: { borderWidth: 1.5, borderColor: iconColors.red, backgroundColor: iconColors.red + '12' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
}));
