import { Platform } from 'react-native';

export const colors = {
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
} as const;

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
