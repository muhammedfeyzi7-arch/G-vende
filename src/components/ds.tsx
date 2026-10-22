/**
 * GÜVENDE tasarım sistemi bileşenleri (referans ekranlardaki kart, satır ve simge düzeni).
 */
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { AppText } from '@/components/ui';
import { colors, hitSlop, radius, spacing } from '@/theme';

/** "mci:whistle" → MaterialCommunityIcons, aksi halde Ionicons. */
export function Icon({ name, size = 22, color = colors.text, style }: { name: string; size?: number; color?: string; style?: object }) {
  if (name.startsWith('mci:')) return <MaterialCommunityIcons name={name.slice(4) as never} size={size} color={color} style={style} />;
  return <Ionicons name={name as never} size={size} color={color} style={style} />;
}

export const accent = {
  blue: colors.primary,
  green: colors.safe,
  red: colors.danger,
  orange: colors.warning,
  yellow: colors.caution,
  purple: '#8B5CF6',
  teal: '#22C3D6',
  gray: colors.info,
} as const;

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="display" accessibilityRole="header" style={{ fontSize: 32, lineHeight: 38 }}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="label" style={{ fontSize: 15, lineHeight: 20 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Renkli zeminli yuvarlatılmış simge kutusu. */
export function IconTile({
  icon,
  color,
  size = 44,
  iconSize,
  solid,
}: {
  icon: string;
  color: string;
  size?: number;
  iconSize?: number;
  solid?: boolean;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: solid ? color : color + '29',
        borderWidth: solid ? 0 : 1,
        borderColor: color + '33',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={iconSize ?? size * 0.52} color={solid ? '#fff' : color} />
    </View>
  );
}

export function BellButton({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={count ? `Bildirimler, ${count} okunmamış` : 'Bildirimler'}
      style={({ pressed }) => [styles.bell, pressed && { opacity: 0.8 }]}
    >
      <Ionicons name="notifications-outline" size={24} color={colors.text} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} maxFontSizeMultiplier={1.2}>
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Başlıklı bölüm kartı: üstte simge + başlık + açıklama (+ ok), altta iç satır grubu. */
export function SectionCard({
  icon,
  color,
  title,
  subtitle,
  onPress,
  children,
  style,
}: {
  icon: string;
  color: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.section, style]}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : 'header'}
        style={({ pressed }) => [styles.sectionHead, pressed && { opacity: 0.85 }]}
      >
        <IconTile icon={icon} color={color} size={48} />
        <View style={{ flex: 1 }}>
          <AppText variant="heading" style={{ fontSize: 18 }}>
            {title}
          </AppText>
          {subtitle ? <AppText variant="label">{subtitle}</AppText> : null}
        </View>
        {onPress ? <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} /> : null}
      </Pressable>
      {children}
    </View>
  );
}

/** Bölüm kartının içindeki satır grubu. */
export function RowGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.group, style]}>{children}</View>;
}

export function ListRow({
  icon,
  iconColor,
  iconTile,
  title,
  subtitle,
  value,
  valueColor,
  onPress,
  right,
  danger,
  first,
  disabled,
  accessibilityHint,
}: {
  icon?: string;
  iconColor?: string;
  /** Simgeyi renkli kutu içinde göster */
  iconTile?: boolean;
  title: string;
  subtitle?: string;
  value?: string;
  valueColor?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
  first?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const tint = danger ? colors.danger : (iconColor ?? colors.text);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || disabled}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, subtitle, value].filter(Boolean).join('. ')}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.row,
        !first && styles.rowDivider,
        pressed && { backgroundColor: colors.surfacePressed },
        disabled && { opacity: 0.5 },
      ]}
    >
      {icon ? (
        iconTile ? (
          <IconTile icon={icon} color={tint} size={40} />
        ) : (
          <View style={styles.rowIcon}>
            <Icon name={icon} size={23} color={tint} />
          </View>
        )
      ) : null}
      <View style={{ flex: 1, gap: 1 }}>
        <AppText variant="body" color={danger ? colors.danger : colors.text} style={{ fontSize: 16, fontWeight: '500' }}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="label" style={{ fontSize: 13.5 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="label" color={valueColor ?? colors.textSecondary} numberOfLines={1} style={{ maxWidth: 140, textAlign: 'right' }}>
          {value}
        </AppText>
      ) : null}
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /> : null)}
    </Pressable>
  );
}

export function ToggleRow(props: {
  icon?: string;
  iconColor?: string;
  iconTile?: boolean;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  first?: boolean;
  disabled?: boolean;
}) {
  const { value, onChange, ...rest } = props;
  return (
    <ListRow
      {...rest}
      onPress={props.disabled ? undefined : () => onChange(!value)}
      right={
        <Switch
          value={value}
          onValueChange={onChange}
          disabled={props.disabled}
          trackColor={{ true: colors.primary, false: colors.borderStrong }}
          thumbColor="#fff"
          accessibilityLabel={props.title}
        />
      }
    />
  );
}

export type AvatarStatus = 'safe' | 'help' | 'waiting' | 'home' | 'unknown' | null;

const STATUS_STYLE: Record<Exclude<AvatarStatus, null>, { color: string; icon: string }> = {
  safe: { color: colors.safe, icon: 'checkmark' },
  help: { color: colors.danger, icon: 'alert' },
  waiting: { color: colors.warning, icon: 'time' },
  home: { color: colors.info, icon: 'home' },
  unknown: { color: colors.textMuted, icon: 'help' },
};

export function Avatar({
  name,
  uri,
  size = 56,
  status,
  ring,
}: {
  name: string;
  uri?: string | null;
  size?: number;
  status?: AvatarStatus;
  ring?: string;
}) {
  const s = status ? STATUS_STYLE[status] : null;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase('tr-TR'))
    .join('');
  const ringColor = ring ?? s?.color;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2, borderWidth: ringColor ? 2.5 : 0, borderColor: ringColor ?? 'transparent' },
        ]}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 }} contentFit="cover" />
        ) : (
          <AppText variant="heading" color={colors.text} style={{ fontSize: size * 0.34 }}>
            {initials || '?'}
          </AppText>
        )}
      </View>
      {s ? (
        <View
          style={[styles.statusBadge, { backgroundColor: s.color, width: size * 0.36, height: size * 0.36, borderRadius: size * 0.18 }]}
        >
          <Ionicons name={s.icon as never} size={size * 0.22} color="#fff" />
        </View>
      ) : null}
    </View>
  );
}

export function ProgressRing({
  value,
  total,
  size = 96,
  color = colors.safe,
  children,
}: {
  value: number;
  total: number;
  size?: number;
  color?: string;
  children?: ReactNode;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? Math.min(1, value / total) : 0;
  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityLabel={`${value} / ${total}`}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.borderStrong} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Ayarlar üstündeki küçük hızlı erişim kartı. */
export function QuickCard({
  icon,
  color,
  label,
  value,
  valueColor,
  onPress,
}: {
  icon: string;
  color: string;
  label: string;
  value: string;
  valueColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.quick, pressed && { opacity: 0.85 }]}
    >
      <IconTile icon={icon} color={color} size={42} solid />
      <View style={{ flex: 1 }}>
        <AppText variant="caption" numberOfLines={1} style={{ fontSize: 12 }}>
          {label}
        </AppText>
        <AppText variant="heading" color={valueColor ?? colors.text} numberOfLines={1} style={{ fontSize: 15 }}>
          {value}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  bell: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.xs },
  group: {
    backgroundColor: colors.bg + 'B3',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowIcon: { width: 36, alignItems: 'center' },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  statusBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  quick: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    padding: spacing.sm + 2,
    minHeight: 68,
  },
});

/** Yığın (stack) ekranları için kaydırılabilir sayfa gövdesi. */
export function Page({ children, keyboard }: { children: ReactNode; keyboard?: boolean }) {
  const insets = useSafeAreaInsets();
  const body = (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: insets.bottom + spacing.xxl }}
    >
      {children}
    </ScrollView>
  );
  return keyboard ? (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );
}

export function GroupTitle({ children }: { children: string }) {
  return (
    <AppText variant="label" style={{ textTransform: 'uppercase', letterSpacing: 0.6, marginTop: spacing.sm, marginLeft: spacing.xs }}>
      {children}
    </AppText>
  );
}

export function Stepper({
  label,
  value,
  step,
  min,
  max,
  format,
  onChange,
  first,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  first?: boolean;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 10) / 10)));
  return (
    <View
      style={[styles.row, !first && styles.rowDivider]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${label}: ${format(value)}`}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => set(value + (e.nativeEvent.actionName === 'increment' ? step : -step))}
    >
      <AppText variant="body" style={{ flex: 1, fontSize: 16 }}>
        {label}
      </AppText>
      <Pressable onPress={() => set(value - step)} style={styles.stepBtn} accessibilityLabel="Azalt" hitSlop={hitSlop}>
        <Ionicons name="remove" size={18} color={colors.text} />
      </Pressable>
      <AppText variant="heading" style={{ minWidth: 60, textAlign: 'center' }}>
        {format(value)}
      </AppText>
      <Pressable onPress={() => set(value + step)} style={styles.stepBtn} accessibilityLabel="Artır" hitSlop={hitSlop}>
        <Ionicons name="add" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}
