import type { SourceReading } from '@/types/earthquake';
import { colors } from '@/theme';
import { SOURCES } from './repository';

export { formatDepth, formatMagnitude, placeTitle } from './format.core';

export const sourceLabel = (r: SourceReading) => SOURCES[r.source].label;

export function magnitudeColor(m: number | null): string {
  if (m == null) return colors.info;
  if (m >= 5) return colors.danger;
  if (m >= 4) return colors.warning;
  if (m >= 3) return colors.caution;
  return colors.info;
}
