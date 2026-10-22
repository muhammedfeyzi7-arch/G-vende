import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { Avatar } from '@/components/ds';
import { useProfile } from '@/hooks/useProfile';
import { colors, radius, spacing } from '@/theme';
import { relativeTimeTr } from '@/utils/time';
import type { FamilyGroup } from './api';
import { buildPeople } from './people';
import { useFamilyActions } from './useFamilyActions';

/** Ana sayfadaki "Ailem Güvende mi?" özeti. */
export function FamilySafetyCard({ groups, myUserId }: { groups: FamilyGroup[]; myUserId: string | null }) {
  const fam = useFamilyActions();
  const { profile } = useProfile();
  const people = useMemo(
    () => buildPeople({ name: profile.name, status: fam.myStatus }, fam.contacts, groups, myUserId),
    [profile.name, fam.myStatus, fam.contacts, groups, myUserId],
  );

  const onMe = () =>
    Alert.alert('Durumunu bildir', 'Acil durum kişilerine SMS hazırlanır.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Yardım lazım', style: 'destructive', onPress: fam.confirmHelp },
      { text: 'Güvendeyim', onPress: () => fam.sendStatus('safe') },
    ]);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <AppText variant="title" style={{ fontSize: 20 }}>
          Ailem Güvende mi?
        </AppText>
        <Pressable onPress={() => router.push('/ailem')} accessibilityRole="link" style={{ padding: 4 }}>
          <AppText variant="label" color={colors.primary}>
            Tümünü Gör ›
          </AppText>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {people.map((p) => (
          <Pressable
            key={p.key}
            onPress={() =>
              p.source === 'me'
                ? onMe()
                : p.contactId
                  ? router.push({ pathname: '/aile/kisi/[id]', params: { id: p.contactId } })
                  : router.push('/ailem')
            }
            accessibilityRole="button"
            accessibilityLabel={`${p.name}: ${p.label}${p.at ? `, ${relativeTimeTr(p.at)}` : ''}`}
            style={styles.person}
          >
            <Avatar
              name={p.source === 'me' ? profile.name || 'Ben' : p.name}
              uri={p.source === 'me' ? profile.photoUri : null}
              size={64}
              status={p.status}
              ring={p.color}
            />
            <AppText variant="heading" numberOfLines={1} style={{ fontSize: 14, marginTop: 6 }}>
              {p.name}
            </AppText>
            <AppText variant="label" color={p.color} numberOfLines={1} style={{ fontSize: 12 }}>
              {p.label}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {p.at ? relativeTimeTr(p.at) : ' '}
            </AppText>
          </Pressable>
        ))}
        {fam.loaded && fam.contacts.length === 0 && groups.length === 0 ? (
          <View style={[styles.person, { width: 170, justifyContent: 'center' }]}>
            <AppText variant="caption" style={{ textAlign: 'center' }}>
              Durumlarını takip etmek için aile üyelerinizi ekleyin.
            </AppText>
            <Button
              label="Kişi ekle"
              icon="person-add-outline"
              variant="secondary"
              onPress={() => router.push('/ailem')}
              style={{ marginTop: 6, minHeight: 40 }}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  list: { paddingHorizontal: spacing.md, gap: spacing.sm },
  person: { width: 74, alignItems: 'center' },
});
