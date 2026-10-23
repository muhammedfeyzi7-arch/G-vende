import { Ionicons } from '@expo/vector-icons';
import { useCanReport } from '@/features/reports/useReportGate';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { LiveFeedTab } from '@/features/home/tabs';
import type { ReportFilter } from '@/features/reports/components/CategoryChips';
import { useApp } from '@/providers/AppProvider';
import { useReports } from '@/providers/ReportsProvider';
import { colors, font, radius, spacing, themedStyles } from '@/theme';
import { userMessage } from '@/services/errors';

/** Tüm kullanıcı bildirimleri (canlı akış) — kategori filtreli. */
export default function FeedScreen() {
  const canReport = useCanReport();
  const insets = useSafeAreaInsets();
  const { online } = useApp();
  const feed = useReports();
  const [filter, setFilter] = useState<ReportFilter>('all');
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/rapor/benim')} accessibilityRole="button" style={{ padding: 6 }}>
              <AppText variant="label" color={colors.primary}>
                Olay bildirimlerim{feed.mine.length ? ` (${feed.mine.length})` : ''}
              </AppText>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}>
        <LiveFeedTab
          filter={filter}
          onFilter={setFilter}
          reports={feed.reports}
          status={feed.status}
          error={feed.error}
          lastSyncedAt={feed.lastSyncedAt}
          pending={feed.pending}
          helpful={feed.helpful}
          onHelpful={(id) => {
            const r = feed.reports.find((x) => x.id === id);
            if (!r) return;
            feed.toggleHelpful(id).catch((e: Error) => Alert.alert('İşlem yapılamadı', userMessage(e)));
          }}
          onRetry={feed.refresh}
          online={online}
        />
      </ScrollView>
      {canReport ? (
        <Pressable
          onPress={() => router.push('/rapor/yeni')}
          accessibilityRole="button"
          accessibilityLabel="Bildirim ekle"
          style={({ pressed }) => [styles.fab, { bottom: insets.bottom + spacing.lg }, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="pencil" size={22} color="#fff" />
          <AppText variant="heading" color="#fff" style={{ fontSize: font.size.lg }}>
            Olay Bildir
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    minHeight: 58,
    boxShadow: '0 8px 26px rgba(22,131,255,0.45)',
  },
}));
