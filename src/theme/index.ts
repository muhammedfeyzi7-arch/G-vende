import { createContext } from 'react';
import { Platform, StyleSheet } from 'react-native';

export type Scheme = 'dark' | 'light';

/** Koyu tema: gece ve elektrik kesintisinde göz yormayan lacivert-siyah. */
export const darkPalette = {
  bg: '#030B14',
  surface: '#071522',
  surfaceRaised: '#0B1928',
  surfacePressed: '#10233A',
  border: '#142538',
  borderStrong: '#1E3550',

  primary: '#1683FF',
  primaryMuted: 'rgba(22,131,255,0.16)',
  danger: '#FF3548',
  dangerSurface: '#3A0D16',
  dangerBorder: '#6E1A26',
  safe: '#14D99A',
  safeMuted: 'rgba(20,217,154,0.14)',
  warning: '#FF8A24',
  caution: '#FFC21A',
  info: '#8FA3B8',

  text: '#F2F6FA',
  textSecondary: '#A9B8C8',
  textMuted: '#6F8297',
  overlay: 'rgba(3,11,20,0.82)',

  /** Alt menü zemini */
  tabBar: '#040D17',
  /** Harita üstündeki paneller (lejant, düğmeler, seçim kartı) */
  mapPanel: 'rgba(8,20,33,0.88)',
  mapPanelBorder: 'rgba(60,90,120,0.45)',
  /** Harita yüklenirken zemin */
  mapPlaceholder: '#0A1824',
  /** Kart gölgesi (koyu temada belirsiz parıltı) */
  shadow: '0 6px 24px rgba(0,0,0,0.35)',
  shadowSoft: '0 2px 10px rgba(0,0,0,0.25)',
  /** Kırmızı uyarı kartı degrade tonları */
  alertFrom: '#5A0F1C',
  alertTo: '#2A0911',
  alertBorder: '#8A1F2E',
  /** Renkli zeminler üstündeki yazı */
  onAccent: '#FFFFFF',
};

export type Palette = { [K in keyof typeof darkPalette]: string };

/** Açık tema: gün ışığında okunaklı, beyaz kartlı ve yumuşak gölgeli premium görünüm. */
export const lightPalette: Palette = {
  bg: '#F2F5F9',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfacePressed: '#E8EEF5',
  border: '#E3E9F0',
  borderStrong: '#D2DBE5',

  primary: '#0B6BF2',
  primaryMuted: 'rgba(11,107,242,0.10)',
  danger: '#E3263D',
  dangerSurface: '#FDECEF',
  dangerBorder: '#F4B6BF',
  safe: '#0BA673',
  safeMuted: 'rgba(11,166,115,0.12)',
  warning: '#EA7410',
  caution: '#D99A00',
  info: '#5D7086',

  text: '#0B1726',
  textSecondary: '#4A5B70',
  textMuted: '#7B8A9C',
  overlay: 'rgba(242,245,249,0.88)',

  tabBar: '#FFFFFF',
  mapPanel: 'rgba(255,255,255,0.94)',
  mapPanelBorder: 'rgba(15,40,70,0.12)',
  mapPlaceholder: '#DCE6EF',
  shadow: '0 8px 24px rgba(16,38,66,0.10)',
  shadowSoft: '0 2px 8px rgba(16,38,66,0.08)',
  alertFrom: '#E8273D',
  alertTo: '#B5142A',
  alertBorder: '#F26B7B',
  onAccent: '#FFFFFF',
};

/**
 * Canlı renk nesnesi: tema değişince içeriği yerinde güncellenir. Bileşenler `colors.x` değerini
 * render sırasında okur; tema değişiminde ağaç yeniden kurulur (bkz. ThemeGate).
 */
export const colors: Palette = { ...darkPalette };

let version = 0;
let current: Scheme = 'dark';

export function applyScheme(s: Scheme) {
  if (s === current) return;
  Object.assign(colors, s === 'light' ? lightPalette : darkPalette);
  current = s;
  version += 1;
}
export const currentScheme = () => current;

/**
 * Temaya duyarlı StyleSheet: stil nesnesi ilk erişimde ve her tema değişiminden sonra yeniden üretilir.
 * Kullanım: `const styles = themedStyles(() => ({ box: { backgroundColor: colors.surface } }));`
 */
type Styles = Parameters<typeof StyleSheet.create>[0];
export function themedStyles<S extends Styles>(factory: () => S & Styles): Readonly<S> {
  let builtFor = -1;
  let cache: Readonly<S>;
  return new Proxy({} as Readonly<S>, {
    get(_t, key) {
      if (builtFor !== version) {
        cache = StyleSheet.create(factory());
        builtFor = version;
      }
      return cache[key as keyof S];
    },
  });
}

/** #RRGGBB rengine saydamlık ekler. */
export function alpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

export const font = {
  family: Platform.select({ ios: 'System', default: undefined }),
  size: { xs: 11, sm: 12, md: 13.5, lg: 15, xl: 18, xxl: 23, display: 30 },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700' } as const,
} as const;

/** Minimum dokunma alanı (Apple HIG 44pt / Material 48dp). */
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const minTouch = 44;

/** Temadan bağımsız her zaman koyu çizilen yüzeyler (ör. Acil Durum Modu) için: AppText varsayılan renkleri koyu paletten alır. */
export const ForceDark = createContext(false);

/**
 * Ortak yüzeyler: tüm ekranlarda aynı görünmeleri için yalnızca bunlar kullanılır.
 * themedStyles fabrikası içinde çağrılır (renkler tema değişince yeniden okunur).
 */
export const surface = {
  /** İnce kenarlıklı kart */
  card: () => ({
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  }),
  /** Tek satırlık metin alanı */
  input: () => ({
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  }),
};

/** Yazı ölçeği: bölüm başlığı · kart başlığı · satır başlığı · küçük karo başlığı. */
export const type = { section: 17.5, card: 15, row: 14, tile: 13 } as const;
