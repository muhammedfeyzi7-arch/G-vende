import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { ReportCategory } from '@/types/report';
import { CATEGORY_META, FILTERS } from '../categories';

export type ReportFilter = ReportCategory | 'all';

export function CategoryChips({ value, onChange }: { value: ReportFilter; onChange: (v: ReportFilter) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist">
      {FILTERS.map((f) => {
        const active = f.key === value;
        const tint = f.key === 'all' ? colors.text : CATEGORY_META[f.key].color;
        return (
          <Pressable
            key={f.key}
            onPress={() => onChange(f.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${f.label} filtresi`}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && !active && { backgroundColor: colors.surfacePressed },
            ]}
          >
            <Ionicons name={f.icon} size={16} color={active ? '#fff' : tint} />
            <AppText variant="label" color={active ? '#fff' : colors.text}>
              {f.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md + 2,
    minHeight: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
