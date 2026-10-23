import { useToast } from '@/components/Toast';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { Avatar, GroupTitle, Page, RowGroup, ToggleRow } from '@/components/ds';
import { normalizePhone } from '@/features/family/local';
import { EMPTY_PROFILE, loadProfile, persistPhoto, removePhoto, saveProfile, type Profile } from '@/features/settings/profile';
import { useAreaLabel } from '@/hooks/useAreaLabel';
import { useApp } from '@/providers/AppProvider';
import { getSupabase } from '@/services/supabase';
import { colors, radius, spacing, themedStyles } from '@/theme';

export default function EditProfile() {
  const { session } = useApp();
  const area = useAreaLabel();
  const [p, setP] = useState<Profile>(EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile().then(setP);
  }, []);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('İzin gerekli', 'Fotoğraf seçmek için galeri izni verin.');
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      exif: false,
    });
    if (r.canceled || !r.assets[0]) return;
    try {
      setP((x) => ({ ...x, photoUri: r.assets[0]!.uri }));
      const uri = await persistPhoto(r.assets[0].uri);
      setP((x) => ({ ...x, photoUri: uri }));
    } catch {
      Alert.alert('Fotoğraf kaydedilemedi');
    }
  };

  const toast = useToast();
  const save = async () => {
    const phone = p.phone.trim() ? normalizePhone(p.phone) : '';
    if (phone === null) return Alert.alert('Telefon numarası geçersiz');
    setSaving(true);
    const next = { ...p, name: p.name.trim(), phone };
    await saveProfile(next);
    // Girişliyse yalnızca görünen ad sunucuya eşitlenir.
    const sb = getSupabase();
    if (sb && session && next.name) {
      const { error } = await sb.from('profiles').upsert({ id: session.user.id, display_name: next.name.slice(0, 40) });
      if (error) Alert.alert('Ad sunucuya kaydedilemedi', 'Cihazda kaydedildi; daha sonra tekrar deneyin.');
    }
    setSaving(false);
    toast.show({ text: 'Profil kaydedildi' });
    router.back();
  };

  return (
    <Page keyboard>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel="Profil fotoğrafı seç">
          <Avatar name={p.name || '?'} uri={p.photoUri} size={112} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            label={p.photoUri ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle'}
            variant="secondary"
            icon="image-outline"
            onPress={pickPhoto}
          />
          {p.photoUri ? (
            <Button
              label="Kaldır"
              variant="ghost"
              icon="trash-outline"
              onPress={async () => {
                await removePhoto();
                setP((x) => ({ ...x, photoUri: null }));
              }}
            />
          ) : null}
        </View>
      </View>

      <GroupTitle>Bilgiler</GroupTitle>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="label">Ad Soyad</AppText>
        <TextInput
          value={p.name}
          onChangeText={(name) => setP((x) => ({ ...x, name }))}
          placeholder="Adınız"
          placeholderTextColor={colors.textMuted}
          maxLength={40}
          style={styles.input}
          accessibilityLabel="Ad soyad"
        />
        <AppText variant="label">Telefon (isteğe bağlı)</AppText>
        <TextInput
          value={p.phone}
          onChangeText={(phone) => setP((x) => ({ ...x, phone }))}
          placeholder="0532 123 45 67"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          maxLength={20}
          style={styles.input}
          accessibilityLabel="Telefon"
        />
        {session?.user.email ? <AppText variant="caption">Hesap e-postası: {session.user.email}</AppText> : null}
      </View>

      <RowGroup>
        <ToggleRow
          first
          icon="location-outline"
          title="Profilde konumumu göster"
          subtitle={area.label ? `Şu an: ${area.label}` : 'Konum bilinmiyor'}
          value={p.showLocation}
          onChange={(showLocation) => setP((x) => ({ ...x, showLocation }))}
        />
      </RowGroup>
      <AppText variant="caption">
        Fotoğraf, telefon ve konum yalnızca bu cihazda saklanır ve kimseyle paylaşılmaz. Giriş yaptıysanız yalnızca adınız aile grubunuzda
        görünmesi için sunucuya kaydedilir.
      </AppText>
      <Button label="Kaydet" icon="checkmark" onPress={save} loading={saving} />
    </Page>
  );
}

const styles = themedStyles(() => ({
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
}));
