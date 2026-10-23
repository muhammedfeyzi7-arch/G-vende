import * as Contacts from 'expo-contacts/legacy';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { Avatar, GroupTitle, Page } from '@/components/ds';
import { deleteContactPhoto, persistContactPhoto, pickPhoto } from '@/features/family/photos';
import { MAX_LOCAL_CONTACTS } from '@/features/family/local';
import { useLocalFamily } from '@/features/family/useLocalFamily';
import { colors, radius, spacing } from '@/theme';

/** Aile üyesi ekleme: elle veya rehberden. Kişiler yalnızca bu cihazda saklanır. */
export default function AddMember() {
  const fam = useLocalFamily();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const choosePhoto = async () => {
    const r = await pickPhoto();
    if (r === 'denied') return Alert.alert('İzin gerekli', 'Fotoğraf seçmek için galeri izni verin.');
    if (r) setPhoto(r);
  };

  const save = async () => {
    setSaving(true);
    let uri: string | null = null;
    try {
      // Fotoğraf yalnızca cihazda, uygulama klasöründe saklanır.
      if (photo) uri = photo.startsWith('data:') ? photo : await persistContactPhoto(photo);
    } catch {
      uri = null;
    }
    const err = fam.addContact(name, phone, relation, uri);
    if (err && uri) deleteContactPhoto(uri);
    setSaving(false);
    done(err);
  };

  const done = (err: string | null) => {
    if (err) return Alert.alert('Eklenemedi', err);
    router.back();
  };

  const pick = async () => {
    try {
      const c = await Contacts.presentContactPickerAsync();
      if (!c) return;
      if (c.imageAvailable && c.image?.uri) setPhoto(c.image.uri);
      const num = c.phoneNumbers?.find((p) => p.isPrimary)?.number ?? c.phoneNumbers?.[0]?.number;
      if (!num) return Alert.alert('Numara yok', 'Seçilen kişinin telefon numarası bulunmuyor.');
      setName(c.name);
      setPhone(num);
    } catch {
      Alert.alert('Rehber açılamadı', 'Bilgileri elle girebilirsiniz.');
    }
  };

  return (
    <Page keyboard>
      <AppText variant="label">
        Eklediğiniz kişilere “Güvendeyim”, “Yardım lazım” ve “İyi misin?” mesajlarını SMS ile tek dokunuşla hazırlayabilirsiniz. Kişiler
        sunucuya gönderilmez ({fam.contacts.length}/{MAX_LOCAL_CONTACTS}).
      </AppText>
      <Pressable onPress={choosePhoto} accessibilityRole="button" accessibilityLabel="Fotoğraf seç" style={styles.photoRow}>
        <Avatar name={name || relation || '?'} uri={photo} size={72} />
        <View style={{ flex: 1 }}>
          <AppText variant="heading">{photo ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle (isteğe bağlı)'}</AppText>
          <AppText variant="caption">Ailem listesinde ve haritada görünür. Yalnızca bu cihazda saklanır.</AppText>
        </View>
        {photo ? (
          <Pressable onPress={() => setPhoto(null)} accessibilityRole="button" accessibilityLabel="Fotoğrafı kaldır" hitSlop={8}>
            <AppText variant="label" color={colors.danger}>
              Kaldır
            </AppText>
          </Pressable>
        ) : null}
      </Pressable>
      <Button label="Rehberden seç" icon="book-outline" variant="secondary" onPress={pick} />
      <GroupTitle>Kişi bilgileri</GroupTitle>
      <View style={{ gap: spacing.sm }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="İsim"
          placeholderTextColor={colors.textMuted}
          maxLength={40}
          style={styles.input}
          accessibilityLabel="İsim"
        />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Telefon (0532 123 45 67)"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          maxLength={20}
          style={styles.input}
          accessibilityLabel="Telefon"
        />
        <TextInput
          value={relation}
          onChangeText={setRelation}
          placeholder="Yakınlık (ör. Eşim, Babam)"
          placeholderTextColor={colors.textMuted}
          maxLength={30}
          style={styles.input}
          accessibilityLabel="Yakınlık"
        />
      </View>
      <Button label="Kaydet" icon="checkmark" onPress={save} loading={saving} disabled={!name.trim() || !phone.trim() || saving} />
    </Page>
  );
}

const styles = StyleSheet.create({
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
});
