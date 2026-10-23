import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, spacing, themedStyles } from '@/theme';

export function TopTabs<K extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist">
        {tabs.map((t) => {
          const active = t.key === value;
          return (
            <Pressable
              key={t.key}
              onPress={() => onChange(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={styles.tab}
            >
              <AppText
                variant="heading"
                color={active ? colors.primary : colors.textSecondary}
                style={{ fontSize: 13, fontWeight: active ? '700' : '500' }}
              >
                {t.label}
              </AppText>
              <View style={[styles.underline, active && { backgroundColor: colors.primary }]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  row: { paddingHorizontal: spacing.sm },
  tab: { paddingHorizontal: spacing.md, paddingTop: spacing.sm + 2, minHeight: 42, justifyContent: 'space-between' },
  underline: { height: 3, borderRadius: 2, marginTop: spacing.sm, backgroundColor: 'transparent' },
}));
