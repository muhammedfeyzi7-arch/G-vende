import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { FeltIntensity, ReportCategory } from '@/types/report';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const CATEGORY_META: Record<ReportCategory, { label: string; formLabel: string; icon: IconName; color: string }> = {
  shake: { label: 'Sarsıntı', formLabel: 'Sarsıntı hissettim', icon: 'pulse', color: colors.danger },
  damage: { label: 'Hasar', formLabel: 'Hasar gözlemledim', icon: 'home', color: colors.warning },
  road: { label: 'Yol Durumu', formLabel: 'Yol kapanması veya engel', icon: 'warning', color: colors.primary },
  safe: { label: 'Güvenlik', formLabel: 'Güvendeyim', icon: 'shield-checkmark', color: colors.safe },
  help: { label: 'Yardım', formLabel: 'Yardıma ihtiyacım var', icon: 'alert', color: colors.caution },
  other: { label: 'Diğer', formLabel: 'Diğer', icon: 'chatbubble-ellipses', color: colors.info },
};

export const FILTERS: { key: ReportCategory | 'all'; label: string; icon: IconName }[] = [
  { key: 'all', label: 'Tümü', icon: 'apps' },
  { key: 'shake', label: 'Sarsıntı', icon: 'pulse' },
  { key: 'damage', label: 'Hasar', icon: 'home' },
  { key: 'road', label: 'Yol Durumu', icon: 'warning' },
  { key: 'help', label: 'Yardım', icon: 'medkit' },
  { key: 'safe', label: 'Güvenlik', icon: 'shield-checkmark' },
];

/** Kullanıcının bildirdiği hissedilen sarsıntı seviyesi (ölçüm değil, kişisel algı). */
export const FELT_LEVELS: { value: FeltIntensity; label: string; color: string }[] = [
  { value: 4, label: 'Çok güçlü', color: '#FF3548' },
  { value: 3, label: 'Güçlü', color: '#FF8A24' },
  { value: 2, label: 'Orta', color: '#FFC21A' },
  { value: 1, label: 'Hafif', color: '#B9C3CE' },
];

export const feltColor = (v: FeltIntensity | null) => FELT_LEVELS.find((l) => l.value === v)?.color ?? CATEGORY_META.shake.color;

/** Akışta gösterilen kısa başlık — kullanıcı metni değil, kategoriden türetilir. */
export function reportHeadline(category: ReportCategory, felt: FeltIntensity | null): string {
  if (category === 'shake') {
    const l = FELT_LEVELS.find((x) => x.value === felt);
    return l ? `Sarsıntı ${l.label.toLocaleLowerCase('tr-TR')} hissedildi.` : 'Sarsıntı hissedildi.';
  }
  return {
    damage: 'Hasar gözlemlendi.',
    road: 'Yolda geçiş engeli var.',
    safe: 'Güvendeyiz.',
    help: 'Yardıma ihtiyaç var.',
    other: 'Bölgesel bildirim.',
  }[category];
}
