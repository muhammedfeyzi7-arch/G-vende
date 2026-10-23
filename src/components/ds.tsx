import { LinearGradient } from 'expo-linear-gradient';
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
import { colors, hitSlop, radius, spacing, themedStyles } from '@/theme';

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
    <View style={{ gap: 4 }}>
      <View style={styles.header}>
        <AppText variant="display" accessibilityRole="header" style={{ fontSize: 25, lineHeight: 30, flex: 1 }}>
          {title}
        </AppText>
        {right}
      </View>
      {subtitle ? (
        <AppText variant="label" style={{ fontSize: 12, lineHeight: 16 }}>
          {subtitle}
        </AppText>
      ) : null}
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
  // Premium görünüm: renkten koyusuna degrade, ince ışıklı kenar ve hafif parıltı.
  const r = size * 0.3;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        borderWidth: 1,
        borderColor: solid ? color + 'AA' : color + '40',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxShadow: solid ? `0 4px 14px ${color}55` : undefined,
      }}
    >
      <LinearGradient
        colors={solid ? [shade(color, 0.12), shade(color, -0.28)] : [color + '3D', color + '12']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Icon name={icon} size={iconSize ?? size * 0.52} color={solid ? '#fff' : color} />
    </View>
  );
}

/** #RRGGBB rengini açar (+) veya koyulaştırır (-). */
export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1, 7), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  const v = (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255);
  return `#${v.toString(16).padStart(6, '0')}`;
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
        <IconTile icon={icon} color={color} size={40} solid />
        <View style={{ flex: 1 }}>
          <AppText variant="heading" style={{ fontSize: 15 }}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="label" style={{ fontSize: 11 }}>
              {subtitle}
            </AppText>
          ) : null}
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
          <IconTile icon={icon} color={tint} size={32} />
        ) : (
          <View style={styles.rowIcon}>
            <Icon name={icon} size={20} color={tint} />
          </View>
        )
      ) : null}
      <View style={{ flex: 1, gap: 1 }}>
        <AppText variant="body" color={danger ? colors.danger : colors.text} style={{ fontSize: 12.5, fontWeight: '500', lineHeight: 16 }}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="label" style={{ fontSize: 10.5, lineHeight: 13.5 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText
          variant="label"
          color={valueColor ?? colors.textSecondary}
          numberOfLines={1}
          style={{ maxWidth: 140, textAlign: 'right', fontSize: 11 }}
        >
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
          style={{ transform: [{ scale: 0.85 }] }}
          accessibilityLabel={props.title}
        />
      }
    />
  );
}

export type AvatarStatus = 'safe' | 'help' | 'waiting' | 'home' | 'unknown' | null;

const STATUS_STYLE = (): Record<Exclude<AvatarStatus, null>, { color: string; icon: string }> => ({
  safe: { color: colors.safe, icon: 'checkmark' },
  help: { color: colors.danger, icon: 'alert' },
  waiting: { color: colors.warning, icon: 'time' },
  home: { color: colors.info, icon: 'home' },
  unknown: { color: colors.textMuted, icon: 'help' },
});

// Fotoğrafsız kişiler için isimden türetilen sabit degrade (her kişi kendi renginde).
const AVATAR_GRADIENTS: [string, string][] = [
  ['#3B82F6', '#1E3A8A'],
  ['#10B981', '#065F46'],
  ['#F59E0B', '#92400E'],
  ['#8B5CF6', '#4C1D95'],
  ['#EC4899', '#831843'],
  ['#06B6D4', '#164E63'],
  ['#EF4444', '#7F1D1D'],
];
const gradientFor = (name: string) =>
  AVATAR_GRADIENTS[[...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % AVATAR_GRADIENTS.length]!;

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
  const s = status ? STATUS_STYLE()[status] : null;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase('tr-TR'))
    .join('');
  const ringColor = ring ?? s?.color;
  // Halka ile fotoğraf arasında ince boşluk (referanstaki gibi).
  const inner = ringColor ? size - 7 : size;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: ringColor ? 2 : 0,
            borderColor: ringColor ?? 'transparent',
            backgroundColor: 'transparent',
            boxShadow: ringColor ? `0 0 12px ${ringColor}55` : undefined,
          },
        ]}
      >
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {uri ? (
            <Image source={{ uri }} style={{ width: inner, height: inner }} contentFit="cover" />
          ) : (
            <>
              <LinearGradient colors={gradientFor(name)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <AppText variant="heading" color="#FFFFFF" style={{ fontSize: size * 0.34, fontWeight: '700' }}>
                {initials || '?'}
              </AppText>
            </>
          )}
        </View>
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
      <IconTile icon={icon} color={color} size={30} solid />
      <View style={{ flex: 1 }}>
        <AppText variant="caption" numberOfLines={2} style={{ fontSize: 9.5, lineHeight: 11.5 }}>
          {label}
        </AppText>
        <AppText variant="heading" color={valueColor ?? colors.text} numberOfLines={1} style={{ fontSize: 12.5 }}>
          {value}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bell: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: colors.shadowSoft,
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
  badgeText: { color: '#fff', fontSize: 9.5, fontWeight: '700' },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    padding: spacing.xs + 2,
    gap: spacing.xs + 2,
    boxShadow: colors.shadowSoft,
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
    gap: spacing.sm + 2,
    minHeight: 44,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
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
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.sm,
    paddingHorizontal: 8,
    minHeight: 64,
    boxShadow: colors.shadowSoft,
  },
}));

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
      <AppText variant="body" style={{ flex: 1, fontSize: 14 }}>
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
