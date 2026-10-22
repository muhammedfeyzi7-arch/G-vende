import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Banner, Button, Card } from '@/components/ui';
import { call112 } from '@/features/home/tabs';
import { CATEGORY_META, FELT_LEVELS } from '@/features/reports/categories';
import { MAX_DESCRIPTION, MAX_PHOTOS, validateReport } from '@/features/reports/validation';
import { useApp, useVisibleQuakes } from '@/providers/AppProvider';
import { useReports } from '@/providers/ReportsProvider';
import { isBackendConfigured } from '@/services/env';
import { colors, radius, spacing } from '@/theme';
import type { FeltIntensity, ReportCategory } from '@/types/report';
import { coarsen, distanceKm } from '@/utils/geo';

const ORDER: ReportCategory[] = ['shake', 'damage', 'road', 'safe', 'help', 'other'];

export default function NewReport() {
  const insets = useSafeAreaInsets();
  const { location, userCoords, requestLocation, settings, session, online } = useApp();
  const events = useVisibleQuakes();
  const { submit } = useReports();
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [felt, setFelt] = useState<FeltIntensity | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [attachLocation, setAttachLocation] = useState(settings.attachLocationByDefault);
  const [areaLabel, setAreaLabel] = useState('');
  const [sending, setSending] = useState(false);

  // Yaklaşık konumdan ilçe/il etiketi öner (kullanıcı düzenleyebilir).
  useEffect(() => {
    if (!attachLocation || !userCoords || areaLabel) return;
    if (location.status === 'manual') {
      setAreaLabel(location.label.split(' (')[0] ?? '');
      return;
    }
    Location.reverseGeocodeAsync(userCoords)
      .then(([a]) => {
        if (!a) return;
        const parts = [a.region ?? a.city, a.subregion ?? a.district].filter(Boolean);
        setAreaLabel([...new Set(parts)].join(' · '));
      })
      .catch(() => {});
  }, [attachLocation, userCoords, location, areaLabel]);

  const addPhoto = async (fromCamera: boolean) => {
    if (photos.length >= MAX_PHOTOS) return;
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin gerekli', fromCamera ? 'Fotoğraf çekmek için kamera izni verin (Ayarlar).' : 'Fotoğraf seçmek için galeri izni verin (Ayarlar).');
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, exif: false, allowsMultipleSelection: false };
    const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets[0]) setPhotos((p) => [...p, res.assets[0]!.uri].slice(0, MAX_PHOTOS));
  };

  const onSubmit = async () => {
    if (!category) return;
    const coords = attachLocation && userCoords ? coarsen(userCoords) : null;
    // En yakın, 1 saatten yeni ve 300 km içindeki depremle ilişkilendir (varsa).
    const related = userCoords
      ? events.find((e) => Date.now() - Date.parse(e.primary.occurredAt) < 3600_000 && distanceKm(userCoords, e.primary) < 300)
      : undefined;
    const input = {
      clientId: Crypto.randomUUID(),
      category,
      feltIntensity: category === 'shake' ? felt : null,
      description,
      location: coords,
      areaLabel: areaLabel.trim() || null,
      earthquakeEventId: related?.id ?? null,
      photos,
    };
    const v = validateReport(input);
    if (!v.ok) return Alert.alert('Bildirim gönderilemedi', v.error);
    const go = async () => {
      setSending(true);
      const res = await submit(input);
      setSending(false);
      Alert.alert(res.sent ? 'Gönderildi' : 'Gönderim bekliyor', res.message, [{ text: 'Tamam', onPress: () => router.back() }]);
    };
    if (v.warnings.length) Alert.alert('Kişisel bilgi uyarısı', v.warnings.join('\n'), [{ text: 'Düzenle', style: 'cancel' }, { text: 'Yine de gönder', onPress: go }]);
    else go();
  };

  const signedIn = !!session;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} keyboardShouldPersistTaps="handled">
        {!isBackendConfigured() ? (
          <Banner icon="server-outline" tone="warning" text="Sunucu yapılandırılmadığı için bildirim gönderilemez (geliştirme ortamı)." />
        ) : !signedIn ? (
          <Banner icon="person-circle-outline" tone="warning" text="Kötüye kullanımı önlemek için bildirim göndermeden önce giriş yapmanız gerekir." onPress={() => router.push('/giris')} />
        ) : null}
        {!online ? <Banner icon="cloud-offline-outline" tone="warning" text="Çevrimdışısınız. Bildiriminiz cihazda bekletilip bağlantı gelince gönderilir." /> : null}

        <View style={{ gap: spacing.sm }}>
          <AppText variant="heading">Ne bildirmek istiyorsunuz?</AppText>
          <View style={styles.grid}>
            {ORDER.map((c) => {
              const m = CATEGORY_META[c];
              const active = category === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    setCategory(c);
                    if (c !== 'shake') setFelt(null);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  style={[styles.catCard, active && { borderColor: m.color, backgroundColor: m.color + '1F' }]}
                >
                  <Ionicons name={m.icon} size={24} color={m.color} />
                  <AppText variant="label" color={colors.text} style={{ textAlign: 'center' }}>
                    {m.formLabel}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {category === 'help' ? (
          <Card style={{ gap: spacing.sm, borderColor: colors.dangerBorder }}>
            <AppText variant="heading">Hayati tehlike varsa önce 112’yi arayın</AppText>
            <AppText variant="label">Bu bildirim acil çağrı yerine geçmez ve ekiplere iletilmesi garanti edilmez.</AppText>
            <Button label="112’yi ara" icon="call" variant="danger" onPress={call112} />
          </Card>
        ) : null}

        {category === 'shake' ? (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="heading">Sarsıntıyı nasıl hissettiniz?</AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              {[...FELT_LEVELS].reverse().map((l) => (
                <Pressable
                  key={l.value}
                  onPress={() => setFelt(l.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: felt === l.value }}
                  style={[styles.feltChip, felt === l.value && { borderColor: l.color, backgroundColor: l.color + '26' }]}
                >
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: l.color }} />
                  <AppText variant="label" color={colors.text}>
                    {l.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <AppText variant="caption">Kişisel algınızdır; ölçüm değildir.</AppText>
          </View>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <AppText variant="heading">Açıklama {category === 'other' ? '' : '(isteğe bağlı)'}</AppText>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Kısa ve net yazın. Ad, telefon veya adres gibi kişisel bilgi paylaşmayın."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={MAX_DESCRIPTION}
            style={styles.input}
            accessibilityLabel="Açıklama"
          />
          <AppText variant="caption" style={{ textAlign: 'right' }}>
            {description.length}/{MAX_DESCRIPTION}
          </AppText>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="heading">Fotoğraf (isteğe bağlı, en fazla {MAX_PHOTOS})</AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {photos.map((uri, i) => (
              <View key={uri}>
                <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                <Pressable onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))} style={styles.removePhoto} accessibilityRole="button" accessibilityLabel="Fotoğrafı kaldır">
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <>
                <Pressable onPress={() => addPhoto(true)} style={styles.addPhoto} accessibilityRole="button" accessibilityLabel="Fotoğraf çek">
                  <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
                </Pressable>
                <Pressable onPress={() => addPhoto(false)} style={styles.addPhoto} accessibilityRole="button" accessibilityLabel="Galeriden seç">
                  <Ionicons name="images-outline" size={24} color={colors.textSecondary} />
                </Pressable>
              </>
            ) : null}
          </View>
          <AppText variant="caption">Fotoğraflar yeniden kodlanır; konum (EXIF) bilgisi silinir. İnsan yüzü ve plaka içermemesine dikkat edin.</AppText>
        </View>

        <Card style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">Yaklaşık konumu ekle</AppText>
              <AppText variant="caption">Konum ~1 km’ye yuvarlanarak yayınlanır. Kesin konumunuz paylaşılmaz.</AppText>
            </View>
            <Switch value={attachLocation} onValueChange={setAttachLocation} trackColor={{ true: colors.primary, false: colors.borderStrong }} accessibilityLabel="Yaklaşık konumu ekle" />
          </View>
          {attachLocation && !userCoords ? (
            <Button
              label={location.status === 'denied' && !location.canAskAgain ? 'İl seç' : 'Konumumu al'}
              icon="locate-outline"
              variant="secondary"
              onPress={() => (location.status === 'denied' && !location.canAskAgain ? router.push('/konum') : requestLocation())}
            />
          ) : null}
          {attachLocation ? (
            <TextInput
              value={areaLabel}
              onChangeText={setAreaLabel}
              placeholder="Bölge (ör. Düzce · Gölyaka)"
              placeholderTextColor={colors.textMuted}
              maxLength={80}
              style={[styles.input, { minHeight: 44 }]}
              accessibilityLabel="Bölge adı"
            />
          ) : null}
        </Card>

        <AppText variant="caption">
          Gönderdiğiniz bildirim; kategori, açıklama, fotoğraf, bölge adı ve yaklaşık konumla birlikte herkese açık görünür. Hesabınız ve kimliğiniz gösterilmez. Yanlış
          bildirimler topluluk tarafından işaretlenip gizlenebilir.
        </AppText>

        <Button
          label={sending ? 'Gönderiliyor…' : 'Bildirimi gönder'}
          icon="send"
          onPress={onSubmit}
          loading={sending}
          disabled={!category || (category === 'other' && !description.trim()) || !isBackendConfigured() || !signedIn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catCard: {
    width: '31.5%',
    flexGrow: 1,
    minHeight: 92,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: spacing.sm,
  },
  feltChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    minHeight: 100,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    color: colors.text,
    padding: spacing.md,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  photo: { width: 84, height: 84, borderRadius: radius.md },
  removePhoto: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  addPhoto: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
