import * as Contacts from 'expo-contacts/legacy';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { GroupTitle, Page } from '@/components/ds';
import { MAX_LOCAL_CONTACTS } from '@/features/family/local';
import { useLocalFamily } from '@/features/family/useLocalFamily';
import { colors, radius, spacing } from '@/theme';

/** Aile üyesi ekleme: elle veya rehberden. Kişiler yalnızca bu cihazda saklanır. */
export default function AddMember() {
  const fam = useLocalFamily();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');

  const done = (err: string | null) => {
    if (err) return Alert.alert('Eklenemedi', err);
    router.back();
  };

  const pick = async () => {
    try {
      const c = await Contacts.presentContactPickerAsync();
      if (!c) return;
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
      <Button
        label="Kaydet"
        icon="checkmark"
        onPress={() => done(fam.addContact(name, phone, relation))}
        disabled={!name.trim() || !phone.trim()}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
});
