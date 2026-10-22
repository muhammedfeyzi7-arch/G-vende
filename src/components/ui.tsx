import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors, font, hitSlop, minTouch, radius, spacing } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function AppText({
  children,
  variant = 'body',
  color,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      maxFontSizeMultiplier={1.6}
      style={[textStyles[variant], color ? { color } : null, style]}
    >
      {children}
    </Text>
  );
}

const textStyles = StyleSheet.create({
  display: { color: colors.text, fontSize: font.size.display, fontWeight: font.weight.bold, letterSpacing: -0.5 },
  title: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold },
  heading: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold },
  body: { color: colors.text, fontSize: font.size.md, lineHeight: 21 },
  label: { color: colors.textSecondary, fontSize: font.size.sm, fontWeight: font.weight.medium },
  caption: { color: colors.textMuted, fontSize: font.size.xs },
});

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  loading,
  disabled,
  style,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const bg = { primary: colors.primary, secondary: colors.surfaceRaised, danger: colors.danger, ghost: 'transparent' }[variant];
  const fg = variant === 'secondary' || variant === 'ghost' ? colors.text : '#fff';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.borderStrong },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }]} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  active,
  size = 46,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, opacity: pressed ? 0.8 : 1 },
        active && { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
      ]}
    >
      <Ionicons name={icon} size={22} color={active ? colors.primary : colors.text} />
    </Pressable>
  );
}

export function StateMessage({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  tone = 'neutral',
  compact,
}: {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'error' | 'warning';
  compact?: boolean;
}) {
  const c = tone === 'error' ? colors.danger : tone === 'warning' ? colors.warning : colors.textSecondary;
  return (
    <View style={[styles.state, compact && { paddingVertical: spacing.lg }]} accessibilityRole="summary">
      <Ionicons name={icon} size={compact ? 24 : 32} color={c} />
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="label" style={{ textAlign: 'center' }}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" style={{ marginTop: spacing.sm }} /> : null}
    </View>
  );
}

export function Banner({ icon, text, tone = 'info', onPress }: { icon: IconName; text: string; tone?: 'info' | 'warning' | 'error'; onPress?: () => void }) {
  const c = tone === 'error' ? colors.danger : tone === 'warning' ? colors.warning : colors.primary;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      style={[styles.banner, { borderColor: c + '55', backgroundColor: c + '14' }]}
    >
      <Ionicons name={icon} size={18} color={c} />
      <AppText variant="label" color={colors.text} style={{ flex: 1 }}>
        {text}
      </AppText>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

export function Pill({ label, color = colors.textSecondary }: { label: string; color?: string }) {
  return (
    <View style={[styles.pill, { borderColor: color + '66', backgroundColor: color + '1A' }]}>
      <Text style={{ color, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="heading">{title}</AppText>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={hitSlop} accessibilityRole="button">
          <AppText variant="label" color={colors.primary}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  button: {
    minHeight: minTouch + 4,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonText: { fontSize: font.size.md, fontWeight: font.weight.semibold },
  iconButton: {
    borderRadius: radius.md,
    backgroundColor: 'rgba(7,21,34,0.92)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  state: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  pill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, alignSelf: 'flex-start' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
});
