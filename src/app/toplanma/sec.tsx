import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button } from '@/components/ui';
import { EDEVLET_ASSEMBLY_URL } from '@/features/assembly-points/api';
import { loadMyPoint, saveMyPoint } from '@/features/assembly-points/mine';
import { DEFAULT_LAYERS, QuakeMap, type QuakeMapHandle } from '@/features/map/QuakeMap';
import { useApp } from '@/providers/AppProvider';
import { colors, radius, spacing } from '@/theme';
import { Linking } from 'react-native';

/** Kullanıcının kendisine atanmış toplanma alanını haritadan seçip bu cihaza kaydetmesi. */
export default function PickAssemblyPoint() {
  const insets = useSafeAreaInsets();
  const { userCoords, location } = useApp();
  const mapRef = useRef<QuakeMapHandle>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [start, setStart] = useState<{ latitude: number; longitude: number } | null | undefined>(undefined);

  useEffect(() => {
    loadMyPoint().then((p) => {
      if (p) {
        setName(p.name);
        setAddress(p.address ?? '');
        setStart({ latitude: p.latitude, longitude: p.longitude });
      } else setStart(userCoords ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    const c = await mapRef.current?.getCenter();
    if (!c) return Alert.alert('Konum alınamadı', 'Haritanın yüklenmesini bekleyip tekrar deneyin.');
    await saveMyPoint({
      name: name.trim(),
      address: address.trim() || null,
      latitude: c.latitude,
      longitude: c.longitude,
      savedAt: new Date().toISOString(),
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <View style={styles.mapBox}>
        {start !== undefined ? (
          <QuakeMap
            ref={mapRef}
            events={[]}
            focus={null}
            reports={[]}
            assemblyPoints={[]}
            user={userCoords}
            userIsPrecise={location.status === 'granted'}
            layers={{ ...DEFAULT_LAYERS, rings: false }}
            onSelect={() => {}}
            initialCenter={start ?? undefined}
            initialZoom={start ? 15 : 5.5}
          />
        ) : null}
        {/* Nişangâh: kaydedilecek nokta haritanın merkezidir */}
        <View pointerEvents="none" style={styles.crosshair}>
          <Ionicons name="flag" size={34} color={colors.safe} style={{ marginBottom: 30, textShadowColor: '#000', textShadowRadius: 6 }} />
        </View>
        <View style={styles.hint} pointerEvents="none">
          <AppText variant="caption" color={colors.text}>
            Haritayı kaydırarak bayrağı alanın üzerine getirin
          </AppText>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: insets.bottom + spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="label">
          Size atanan alanı e-Devlet’teki AFAD sorgusundan öğrenip burada işaretleyin. Kayıt yalnızca bu cihazda tutulur ve internetsiz de
          görüntülenir.
        </AppText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Alan adı (ör. Atatürk Parkı Toplanma Alanı)"
          placeholderTextColor={colors.textMuted}
          maxLength={80}
          style={styles.input}
          accessibilityLabel="Alan adı"
        />
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Adres veya tarif (isteğe bağlı)"
          placeholderTextColor={colors.textMuted}
          maxLength={120}
          style={styles.input}
          accessibilityLabel="Adres"
        />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            style={{ flex: 1 }}
            variant="secondary"
            icon="open-outline"
            label="e-Devlet"
            onPress={() => Linking.openURL(EDEVLET_ASSEMBLY_URL)}
          />
          <Button
            style={{ flex: 1 }}
            variant="secondary"
            icon="locate-outline"
            label="Konumuma git"
            disabled={!userCoords}
            onPress={() => userCoords && mapRef.current?.flyTo(userCoords, 15)}
          />
        </View>
        <Button label="Bu noktayı kaydet" icon="checkmark" disabled={!name.trim()} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mapBox: { flex: 1, minHeight: 280, backgroundColor: '#0A1824' },
  crosshair: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  hint: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
});
