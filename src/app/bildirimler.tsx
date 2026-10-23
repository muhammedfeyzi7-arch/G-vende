import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, StateMessage } from '@/components/ui';
import { IconTile, accent } from '@/components/ds';
import type { InboxItem, InboxKind } from '@/features/inbox/rules';
import { useInbox } from '@/providers/InboxProvider';
import { colors, hitSlop, radius, spacing, themedStyles } from '@/theme';
import { relativeTimeTr } from '@/utils/time';

const KIND = (): Record<InboxKind, { icon: string; color: string; label: string }> => ({
  quake: { icon: 'pulse', color: accent.orange, label: 'Deprem' },
  official: { icon: 'megaphone', color: accent.red, label: 'Resmî kayıt' },
  family: { icon: 'people', color: accent.blue, label: 'Aile' },
  community: { icon: 'chatbox-ellipses', color: accent.yellow, label: 'Topluluk' },
  report: { icon: 'document-text', color: accent.purple, label: 'Bildirimim' },
  system: { icon: 'information-circle', color: accent.gray, label: 'Sistem' },
});

type Filter = 'all' | 'unread' | 'quake' | 'family' | 'report';
const FILTERS: { key: Filter; label: string; match: (i: InboxItem) => boolean }[] = [
  { key: 'all', label: 'Tümü', match: () => true },
  { key: 'unread', label: 'Okunmamış', match: (i) => !i.read },
  { key: 'quake', label: 'Depremler', match: (i) => i.kind === 'quake' || i.kind === 'official' },
  { key: 'family', label: 'Aile', match: (i) => i.kind === 'family' },
  { key: 'report', label: 'Olaylarım', match: (i) => i.kind === 'report' || i.kind === 'community' },
];

function dayLabel(iso: string, now = new Date()) {
  const t = new Date(iso).getTime();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (t >= start) return 'Bugün';
  if (t >= start - 86400_000) return 'Dün';
  return 'Daha önce';
}

/** Bildirim merkezi: gerçek deprem verisinden, aileden ve kendi bildirimlerinizden gelen olaylar. */
export default function NotificationCenter() {
  const insets = useSafeAreaInsets();
  const { items, unread, markRead, markAllRead, remove, clear } = useInbox();
  const [filter, setFilter] = useState<Filter>('all');
  const kinds = KIND();

  const sections = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!;
    const groups = new Map<string, InboxItem[]>();
    for (const i of items.filter(f.match)) {
      const k = dayLabel(i.at);
      groups.set(k, [...(groups.get(k) ?? []), i]);
    }
    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [items, filter]);

  const onLong = (i: InboxItem) =>
    Alert.alert(i.title, undefined, [
      { text: 'Okundu yap', onPress: () => markRead(i.id) },
      { text: 'Sil', style: 'destructive', onPress: () => remove(i.id) },
      { text: 'Vazgeç', style: 'cancel' },
    ]);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              {unread ? (
                <Pressable onPress={markAllRead} accessibilityRole="button" hitSlop={hitSlop}>
                  <AppText variant="label" color={colors.primary}>
                    Tümünü oku
                  </AppText>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => router.push('/bildirim-ayarlari')}
                accessibilityRole="button"
                accessibilityLabel="Bildirim ayarları"
                hitSlop={hitSlop}
              >
                <Ionicons name="settings-outline" size={20} color={colors.text} />
              </Pressable>
            </View>
          ),
        }}
      />
      <View style={{ flex: 1 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => {
            const n = items.filter(f.match).length;
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.chip, active && styles.chipOn]}
              >
                <AppText variant="label" color={active ? '#fff' : colors.text}>
                  {f.label}
                  {n ? ` · ${n}` : ''}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
        <SectionList
          sections={sections}
          keyExtractor={(i) => i.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.md, flexGrow: 1 }}
          ListEmptyComponent={
            <StateMessage
              icon="notifications-outline"
              title={filter === 'all' ? 'Bildirim yok' : 'Bu filtrede bildirim yok'}
              message="Tercihlerinize uyan depremler, aile durumları ve gönderdiğiniz olay bildirimlerinin sonuçları burada listelenir."
              actionLabel="Bildirim ayarları"
              onAction={() => router.push('/bildirim-ayarlari')}
            />
          }
          renderSectionHeader={({ section }) => (
            <AppText variant="label" style={styles.sectionTitle}>
              {section.title.toLocaleUpperCase('tr-TR')}
            </AppText>
          )}
          renderItem={({ item }) => {
            const k = kinds[item.kind];
            return (
              <Pressable
                onPress={() => {
                  markRead(item.id);
                  if (item.href) router.push(item.href as never);
                }}
                onLongPress={() => onLong(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.read ? '' : 'Okunmamış. '}${k.label}. ${item.title}. ${item.body}. ${relativeTimeTr(item.at)}`}
                accessibilityHint="Uzun basınca silme seçeneği"
                style={({ pressed }) => [styles.row, !item.read && styles.rowUnread, pressed && { opacity: 0.85 }]}
              >
                <IconTile icon={k.icon} color={k.color} size={40} solid={!item.read} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppText variant="caption" color={k.color} style={{ fontWeight: '700' }}>
                      {k.label}
                    </AppText>
                    <AppText variant="caption">· {relativeTimeTr(item.at)}</AppText>
                  </View>
                  <AppText variant="heading" style={{ fontSize: 14, fontWeight: item.read ? '500' : '700' }}>
                    {item.title}
                  </AppText>
                  <AppText variant="label" numberOfLines={2} style={{ fontSize: 11.5 }}>
                    {item.body}
                  </AppText>
                </View>
                {!item.read ? <View style={styles.dot} /> : <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
              </Pressable>
            );
          }}
          ListFooterComponent={
            items.length ? (
              <Pressable
                onPress={() =>
                  Alert.alert('Tüm bildirimler silinsin mi?', 'Bu işlem geri alınamaz.', [
                    { text: 'Vazgeç', style: 'cancel' },
                    { text: 'Sil', style: 'destructive', onPress: clear },
                  ])
                }
                accessibilityRole="button"
                style={styles.clear}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <AppText variant="label" color={colors.danger}>
                  Tümünü temizle
                </AppText>
              </Pressable>
            ) : undefined
          }
        />
      </View>
    </>
  );
}

const styles = themedStyles(() => ({
  chips: { gap: spacing.xs + 2, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chip: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  sectionTitle: { marginTop: spacing.md, marginBottom: spacing.xs, marginLeft: spacing.xs, fontSize: 11, letterSpacing: 0.6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.xs + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowUnread: { borderColor: colors.primary + '66', backgroundColor: colors.surfaceRaised },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  clear: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, marginTop: spacing.sm },
}));
