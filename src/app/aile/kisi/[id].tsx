import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';
import { AppText, Button, StateMessage } from '@/components/ui';
import { Avatar, GroupTitle, ListRow, Page, RowGroup, ToggleRow, accent } from '@/components/ds';
import { ASK_STATUS_MESSAGE, callPhone, effectiveStatus, formatPhone, sendSms, type ContactStatusKind } from '@/features/family/local';
import { STATUS_LABEL } from '@/features/family/people';
import { useLocalFamily } from '@/features/family/useLocalFamily';
import { persistContactPhoto, pickPhoto } from '@/features/family/photos';
import { useApp } from '@/providers/AppProvider';
import { colors, spacing } from '@/theme';
import { formatDateTimeTr, relativeTimeTr } from '@/utils/time';

const MARKS: { kind: ContactStatusKind; label: string; icon: string; color: string }[] = [
  { kind: 'safe', label: 'Güvende', icon: 'shield-checkmark-outline', color: accent.green },
  { kind: 'home', label: 'Evde', icon: 'home-outline', color: accent.gray },
  { kind: 'help', label: 'Yardım istiyor', icon: 'alert-circle-outline', color: accent.red },
];

/** Yerel aile üyesi ayrıntısı: arama, durum sorma ve sizin işaretlediğiniz durum. */
export default function ContactDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fam = useLocalFamily();
  const { settings, updateSettings } = useApp();
  const c = fam.contacts.find((x) => x.id === id);
  if (!fam.loaded) return null;
  if (!c) return <StateMessage icon="person-outline" title="Kişi bulunamadı" actionLabel="Geri dön" onAction={() => router.back()} />;
  const st = effectiveStatus(c);
  const kind = st?.kind ?? 'unknown';
  const meta = STATUS_LABEL[kind];
  const hidden = settings.hideLocationFrom.includes(c.id);

  const changePhoto = () => {
    const pick = async () => {
      const r = await pickPhoto();
      if (r === 'denied') return Alert.alert('İzin gerekli', 'Fotoğraf seçmek için galeri izni verin.');
      if (!r) return;
      try {
        fam.setContactPhoto(c.id, await persistContactPhoto(r));
      } catch {
        Alert.alert('Kaydedilemedi', 'Fotoğraf kaydedilemedi.');
      }
    };
    if (!c.photoUri) return pick();
    Alert.alert('Fotoğraf', undefined, [
      { text: 'Yeni fotoğraf seç', onPress: pick },
      { text: 'Fotoğrafı kaldır', style: 'destructive', onPress: () => fam.setContactPhoto(c.id, null) },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  const ask = async () => {
    const r = await sendSms([c.phone], ASK_STATUS_MESSAGE);
    if (!r.ok) return Alert.alert('Gönderilemedi', r.reason);
    if (r.status !== 'cancelled') fam.setContactStatus([c.id], 'waiting');
  };

  return (
    <Page>
      <Stack.Screen options={{ title: c.name }} />
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Pressable onPress={changePhoto} accessibilityRole="button" accessibilityLabel="Fotoğrafı değiştir">
          <Avatar name={c.name} uri={c.photoUri} size={96} status={kind} ring={meta.color} />
        </Pressable>
        <Pressable onPress={changePhoto} hitSlop={8}>
          <AppText variant="caption" color={colors.primary}>
            {c.photoUri ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle'}
          </AppText>
        </Pressable>
        <AppText variant="title">{c.name}</AppText>
        <AppText variant="label">
          {formatPhone(c.phone)}
          {c.relation ? ` · ${c.relation}` : ''}
        </AppText>
        <AppText variant="heading" color={meta.color}>
          {meta.label}
        </AppText>
        <AppText variant="caption">
          {st ? `${relativeTimeTr(st.at)} · ${formatDateTimeTr(st.at)}` : 'Son 24 saatte durum bilgisi yok'}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button style={{ flex: 1 }} label="Ara" icon="call" onPress={() => callPhone(c.phone)} />
        <Button style={{ flex: 1 }} label="Durum sor" icon="chatbubble-ellipses-outline" variant="secondary" onPress={ask} />
      </View>

      <GroupTitle>Durumunu işaretle</GroupTitle>
      <AppText variant="caption">
        Uygulama kişinin durumunu kendiliğinden bilemez. Telefonla konuştuktan veya yanıt aldıktan sonra burada işaretleyin.
      </AppText>
      <RowGroup>
        {MARKS.map((m, i) => (
          <ListRow
            key={m.kind}
            first={i === 0}
            icon={m.icon}
            iconColor={m.color}
            title={m.label}
            right={
              st?.kind === m.kind ? (
                <AppText variant="label" color={colors.primary}>
                  Seçili
                </AppText>
              ) : undefined
            }
            onPress={() => fam.setContactStatus([c.id], m.kind)}
          />
        ))}
        <ListRow icon="close-circle-outline" title="Durumu temizle" onPress={() => fam.setContactStatus([c.id], null)} />
      </RowGroup>

      <GroupTitle>Gizlilik</GroupTitle>
      <RowGroup>
        <ToggleRow
          first
          icon="eye-off-outline"
          title="Bu kişiye konumumu gönderme"
          subtitle="Durum mesajları konumsuz hazırlanır"
          value={hidden}
          onChange={(v) =>
            updateSettings({
              hideLocationFrom: v ? [...settings.hideLocationFrom, c.id] : settings.hideLocationFrom.filter((x) => x !== c.id),
            })
          }
        />
      </RowGroup>
      <Button
        label="Kişiyi kaldır"
        icon="trash-outline"
        variant="ghost"
        onPress={() =>
          Alert.alert('Kişiyi kaldır', `${c.name} listeden kaldırılsın mı?`, [
            { text: 'Vazgeç', style: 'cancel' },
            {
              text: 'Kaldır',
              style: 'destructive',
              onPress: () => {
                fam.removeContact(c.id);
                router.back();
              },
            },
          ])
        }
      />
    </Page>
  );
}
