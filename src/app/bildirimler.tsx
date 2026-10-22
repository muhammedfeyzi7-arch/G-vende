import { router, Stack } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, StateMessage } from '@/components/ui';
import { IconTile, accent } from '@/components/ds';
import type { InboxKind } from '@/features/inbox/rules';
import { useInbox } from '@/providers/InboxProvider';
import { colors, spacing } from '@/theme';
import { relativeTimeTr } from '@/utils/time';

const KIND: Record<InboxKind, { icon: string; color: string; label: string }> = {
  quake: { icon: 'pulse', color: accent.orange, label: 'Deprem' },
  official: { icon: 'megaphone', color: accent.red, label: 'Resmî kayıt' },
  family: { icon: 'people', color: accent.blue, label: 'Aile' },
  community: { icon: 'chatbox-ellipses', color: accent.yellow, label: 'Topluluk' },
  system: { icon: 'information-circle', color: accent.gray, label: 'Sistem' },
};

/** Bildirim merkezi: uygulamanın gerçek veriden ürettiği ve aldığı bildirimler. */
export default function NotificationCenter() {
  const insets = useSafeAreaInsets();
  const { items, unread, markRead, markAllRead } = useInbox();
  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () =>
            unread ? (
              <Pressable onPress={markAllRead} accessibilityRole="button" style={{ padding: 8 }}>
                <AppText variant="label" color={colors.primary}>
                  Tümünü okundu say
                </AppText>
              </Pressable>
            ) : null,
        }}
      />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
        ListEmptyComponent={
          <StateMessage
            icon="notifications-outline"
            title="Bildirim yok"
            message="Tercihlerinize uyan depremler ve aile bildirimleri burada listelenir. Bildirim türlerini Ayarlar’dan seçebilirsiniz."
            actionLabel="Bildirim ayarları"
            onAction={() => router.push('/bildirim-ayarlari')}
          />
        }
        renderItem={({ item }) => {
          const k = KIND[item.kind];
          return (
            <Pressable
              onPress={() => {
                markRead(item.id);
                if (item.href) router.push(item.href as never);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${item.read ? '' : 'Okunmamış. '}${item.title}. ${item.body}`}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}
            >
              <IconTile icon={k.icon} color={k.color} size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="caption">
                  {k.label} · {relativeTimeTr(item.at)}
                </AppText>
                <AppText variant="heading" style={{ fontSize: 16, fontWeight: item.read ? '500' : '700' }}>
                  {item.title}
                </AppText>
                <AppText variant="label">{item.body}</AppText>
              </View>
              {!item.read ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
