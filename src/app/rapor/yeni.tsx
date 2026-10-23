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
import { buildStatusMessage, sendStatusSms } from '@/features/family/local';
import { useLocalFamily } from '@/features/family/useLocalFamily';
import { call112 } from '@/features/home/tabs';
import { CATEGORY_META, FELT_LEVELS } from '@/features/reports/categories';
import { MAX_DESCRIPTION, MAX_PHOTOS, validateReport } from '@/features/reports/validation';
import { useApp, useVisibleQuakes } from '@/providers/AppProvider';
import { useReports } from '@/providers/ReportsProvider';
import { isBackendConfigured } from '@/services/env';
import { colors, radius, spacing, themedStyles } from '@/theme';
import type { FeltIntensity, ReportCategory } from '@/types/report';
import { coarsen, distanceKm } from '@/utils/geo';
import { evaluateGates, gatesPass, LOCATION_REQUIRED, PHOTO_REQUIRED, type Gate } from '@/features/trust/rules';
import { useTrust } from '@/features/trust/TrustProvider';
import type { DeviceFix, ReportPhoto } from '@/types/report';

const GATE_ICON: Record<Gate['state'], { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  ok: { icon: 'checkmark-circle', color: colors.safe },
  todo: { icon: 'ellipse-outline', color: colors.caution },
  blocked: { icon: 'close-circle', color: colors.danger },
  skip: { icon: 'remove-circle-outline', color: colors.textMuted },
  info: { icon: 'information-circle', color: colors.primary },
};

const ORDER: ReportCategory[] = ['shake', 'damage', 'road', 'safe', 'help', 'other'];

export default function NewReport() {
  const insets = useSafeAreaInsets();
  const { location, userCoords, requestLocation, settings, session, online } = useApp();
  const events = useVisibleQuakes();
  const { submit } = useReports();
  const family = useLocalFamily();
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [felt, setFelt] = useState<FeltIntensity | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [fix, setFix] = useState<DeviceFix | null>(null);
  const [locating, setLocating] = useState(false);
  const { trust } = useTrust();
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

  // Yalnızca uygulama kamerası: galeriden eski/internetten bulunmuş fotoğraf yüklenemez.
  const takePhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert('İzin gerekli', 'Fotoğraf çekmek için kamera izni verin (Ayarlar).');
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, exif: false });
    if (!res.canceled && res.assets[0]) {
      const shot = { uri: res.assets[0].uri, capturedAt: new Date().toISOString() };
      setPhotos((p) => [...p, shot].slice(0, MAX_PHOTOS));
    }
  };

  // Canlı GPS: bildirilen yer bu konumun 1 km yakınında olmalı (sunucu da kontrol eder).
  const locate = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Konum izni gerekli', 'Olay yeri bildirmek için bulunduğunuz yerin GPS konumu gerekir.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setFix({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy ?? 9999 });
    } catch {
      Alert.alert('Konum alınamadı', 'GPS açık mı? Açık alanda tekrar deneyin.');
    } finally {
      setLocating(false);
    }
  };

  const needLocation = !!category && LOCATION_REQUIRED.includes(category);
  const withLocation = attachLocation || needLocation;
  useEffect(() => {
    if (withLocation && !fix && location.status === 'granted') locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withLocation]);

  const onSubmit = async () => {
    if (!category) return;
    // Tam konum gönderilir: sunucu herkese ~1 km'ye yuvarlayarak gösterir, tam halini yalnızca
    // yakındaki kişilerin oylamasını ölçmek için saklar.
    const coords = withLocation && fix ? { latitude: fix.latitude, longitude: fix.longitude } : null;
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
      device: withLocation ? fix : null,
    };
    const v = validateReport(input);
    if (!v.ok) return Alert.alert('Bildirim gönderilemedi', v.error);
    const go = async () => {
      setSending(true);
      const res = await submit(input);
      setSending(false);
      Alert.alert(res.sent ? 'Gönderildi' : 'Gönderim bekliyor', res.message, [{ text: 'Tamam', onPress: () => router.back() }]);
    };
    if (v.warnings.length)
      Alert.alert('Kişisel bilgi uyarısı', v.warnings.join('\n'), [
        { text: 'Düzenle', style: 'cancel' },
        { text: 'Yine de gönder', onPress: go },
      ]);
    else go();
  };

  const signedIn = !!session;
  const gates = evaluateGates({
    backend: isBackendConfigured(),
    signedIn,
    trust,
    category,
    withLocation,
    device: fix,
    point: fix,
    photos,
  });
  const canPublish = isBackendConfigured() && signedIn && gatesPass(gates);
  const onGate = (g: Gate) => {
    if (g.key === 'identity' && g.state === 'todo') router.push(signedIn ? '/kimlik' : '/giris');
    else if (g.key === 'location' && g.state === 'todo') locate();
    else if (g.key === 'photo' && g.state === 'todo') takePhoto();
    else router.push('/guven');
  };

  const smsFamily = async () => {
    if (category !== 'safe' && category !== 'help') return;
    if (!family.contacts.length) {
      return Alert.alert('Kişi yok', 'Önce Ailem sekmesinden acil durum kişilerinizi ekleyin.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Ailem’e git', onPress: () => router.push('/ailem') },
      ]);
    }
    const gps = attachLocation && location.status === 'granted' ? coarsen(location.coords, 0.001) : null;
    const msg = buildStatusMessage(category === 'safe' ? 'safe' : 'need_help', {
      location: gps,
      meetingPoint: family.meetingPoint,
      note: description,
    });
    const r = await sendStatusSms(family.contacts, msg);
    if (!r.ok) Alert.alert('Gönderilemedi', r.reason);
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        {!isBackendConfigured() ? (
          <Banner
            icon="server-outline"
            tone="warning"
            text="Herkese açık yayın için sunucu gerekli (bu kurulumda yok). “Güvendeyim” ve “Yardım” için acil kişilerinize SMS gönderebilirsiniz."
          />
        ) : !signedIn ? (
          <Banner
            icon="person-circle-outline"
            tone="warning"
            text="Kötüye kullanımı önlemek için bildirim göndermeden önce giriş yapmanız gerekir."
            onPress={() => router.push('/giris')}
          />
        ) : null}
        {!online ? (
          <Banner
            icon="cloud-offline-outline"
            tone="warning"
            text="Çevrimdışısınız. Bildiriminiz cihazda bekletilip bağlantı gelince gönderilir."
          />
        ) : null}

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
          <AppText variant="heading">
            {category && PHOTO_REQUIRED.includes(category) ? 'Kanıt fotoğrafı (zorunlu)' : 'Fotoğraf (isteğe bağlı)'} · en fazla{' '}
            {MAX_PHOTOS}
          </AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {photos.map((ph, i) => (
              <View key={ph.uri}>
                <Image source={{ uri: ph.uri }} style={styles.photo} contentFit="cover" />
                <Pressable
                  onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                  style={styles.removePhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Fotoğrafı kaldır"
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <Pressable onPress={takePhoto} style={styles.addPhoto} accessibilityRole="button" accessibilityLabel="Fotoğraf çek">
                <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
                <AppText variant="caption">Çek</AppText>
              </Pressable>
            ) : null}
          </View>
          <AppText variant="caption">
            Yalnızca uygulama kamerasıyla şimdi çekilen fotoğraf eklenebilir; galeriden yükleme kapalıdır. Fotoğraflar yeniden kodlanır,
            konum (EXIF) bilgisi silinir. İnsan yüzü ve plaka içermemesine dikkat edin.
          </AppText>
        </View>

        <Card style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">{needLocation ? 'Olay yeri konumu (zorunlu)' : 'Konumu ekle'}</AppText>
              <AppText variant="caption">
                Telefonunuzun canlı GPS konumu kullanılır. Herkese ~1 km’ye yuvarlanarak gösterilir; tam konum yalnızca yakındaki kişilerin
                oylamasını ölçmek için sunucuda tutulur.
              </AppText>
            </View>
            {needLocation ? null : (
              <Switch
                value={attachLocation}
                onValueChange={setAttachLocation}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                accessibilityLabel="Konumu ekle"
              />
            )}
          </View>
          {withLocation ? (
            <Button
              label={locating ? 'Konum alınıyor…' : fix ? `Konum alındı (±${Math.round(fix.accuracy)} m) · yenile` : 'Canlı konumumu al'}
              icon="locate-outline"
              variant="secondary"
              loading={locating}
              onPress={locate}
            />
          ) : null}
          {withLocation ? (
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

        <Card style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <AppText variant="heading" style={{ flex: 1 }}>
              Yayın kontrolleri
            </AppText>
            <Pressable onPress={() => router.push('/guven')} accessibilityRole="link" hitSlop={8}>
              <AppText variant="label" color={colors.primary}>
                Neden?
              </AppText>
            </Pressable>
          </View>
          {gates.map((g, i) => (
            <Pressable
              key={g.key}
              onPress={() => onGate(g)}
              accessibilityRole="button"
              accessibilityLabel={`${i + 1}. ${g.title}. ${g.detail}`}
              style={styles.gate}
            >
              <Ionicons name={GATE_ICON[g.state].icon} size={20} color={GATE_ICON[g.state].color} />
              <View style={{ flex: 1 }}>
                <AppText variant="label" color={colors.text} style={{ fontWeight: '600' }}>
                  {i + 1}. {g.title}
                </AppText>
                <AppText variant="caption">{g.detail}</AppText>
              </View>
              {g.state === 'todo' ? <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} /> : null}
            </Pressable>
          ))}
        </Card>

        <AppText variant="caption">
          Bildiriminiz kategori, açıklama, fotoğraf, bölge adı ve yaklaşık konumla herkese açık görünür; adınız gösterilmez. Kimliğiniz
          yalnızca yanlış ihbar durumunda hesabınıza yaptırım uygulanabilmesi için doğrulanmıştır.
        </AppText>

        {category === 'safe' || category === 'help' ? (
          <Button
            label={`Acil kişilerime SMS gönder${family.contacts.length ? ` (${family.contacts.length})` : ''}`}
            icon="chatbubble-ellipses-outline"
            variant={canPublish ? 'secondary' : 'primary'}
            onPress={smsFamily}
            accessibilityHint="İnternet gerekmez; telefonunuzun SMS uygulaması açılır"
          />
        ) : null}
        <Button
          label={sending ? 'Gönderiliyor…' : 'Bildirimi herkese yayınla'}
          icon="send"
          onPress={onSubmit}
          loading={sending}
          disabled={!category || (category === 'other' && !description.trim()) || !canPublish}
        />
        {!canPublish ? (
          <AppText variant="caption" style={{ textAlign: 'center' }}>
            {!isBackendConfigured()
              ? 'Herkese açık yayın için sunucu bağlantısı gerekli (bu kurulumda yok).'
              : !signedIn
                ? 'Herkese açık yayın için giriş yapmalısınız.'
                : 'Yayın kontrollerindeki eksikleri tamamlayın.'}
          </AppText>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = themedStyles(() => ({
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
    fontSize: 13,
    textAlignVertical: 'top',
  },
  photo: { width: 84, height: 84, borderRadius: radius.md },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gate: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  addPhoto: {
    gap: 2,
    width: 84,
    height: 84,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
