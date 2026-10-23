import { ListSkeleton } from '@/components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Banner, Button, Card, StateMessage } from '@/components/ui';
import { EDEVLET_ASSEMBLY_URL, getSaved, openDirections, toggleSaved } from '@/features/assembly-points/api';
import { saveMyPoint } from '@/features/assembly-points/mine';
import { useNearbyAssembly } from '@/features/assembly-points/useNearbyAssembly';
import { CompassToTarget } from '@/features/sensors/Compass';
import { useApp } from '@/providers/AppProvider';
import { colors, radius, spacing, themedStyles } from '@/theme';
import type { AssemblyPoint } from '@/types/assembly';
import { distanceKm, formatDistance } from '@/utils/geo';
import { formatDateTr, relativeTimeTr } from '@/utils/time';

const RADII = [2, 5, 10, 25];

export default function AssemblyScreen() {
  const insets = useSafeAreaInsets();
  const { userCoords, location } = useApp();
  const [radiusKm, setRadiusKm] = useState(5);
  const { state, reload, myPoint } = useNearbyAssembly(userCoords, radiusKm);
  const [saved, setSaved] = useState<AssemblyPoint[]>([]);
  useEffect(() => {
    getSaved().then(setSaved);
  }, []);
  const isSaved = (id: string) => saved.some((s) => s.id === id);

  const renderPoint = (p: AssemblyPoint) => (
    <Card key={p.id} style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={styles.apIcon}>
          <Ionicons name="people" size={18} color={colors.safe} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="heading">{p.name}</AppText>
          <AppText variant="label">
            {[p.neighborhood, p.district, p.province].filter(Boolean).join(', ') || p.address || 'Adres belirtilmemiş'}
          </AppText>
          {userCoords ? (
            <AppText variant="label" color={colors.text}>
              {formatDistance(distanceKm(userCoords, p))} {location.status === 'manual' ? '(il merkezine göre)' : 'kuş uçuşu'}
            </AppText>
          ) : null}
        </View>
        <Pressable
          onPress={async () => setSaved(await toggleSaved(p))}
          accessibilityRole="button"
          accessibilityLabel={isSaved(p.id) ? 'Kayıtlılardan çıkar' : 'Çevrimdışı için kaydet'}
          style={{ padding: 8 }}
        >
          <Ionicons name={isSaved(p.id) ? 'bookmark' : 'bookmark-outline'} size={22} color={colors.primary} />
        </Pressable>
      </View>
      {p.capacity ? <AppText variant="caption">Kapasite: {p.capacity.toLocaleString('tr-TR')} kişi (kaynağa göre)</AppText> : null}
      <AppText variant="caption">
        Kaynak: {p.sourceName}
        {p.sourcePublishedAt ? ` · yayım ${formatDateTr(p.sourcePublishedAt)}` : ''} · içe aktarıldı {formatDateTr(p.importedAt)}
      </AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button style={{ flex: 1 }} label="Yol tarifi" icon="walk-outline" onPress={() => openDirections(p)} />
        <Button style={{ flex: 1 }} label="Kaynak" icon="open-outline" variant="secondary" onPress={() => Linking.openURL(p.sourceUrl)} />
      </View>
    </Card>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xxl }}>
      <Card style={[{ gap: spacing.sm }, myPoint ? styles.myCard : null]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={[styles.apIcon, { borderWidth: 3 }]}>
            <Ionicons name="flag" size={18} color={colors.safe} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="heading">{myPoint ? myPoint.name : 'Size atanan toplanma alanı'}</AppText>
            <AppText variant="caption">
              {myPoint
                ? `${myPoint.address ? myPoint.address + ' · ' : ''}${Number.isFinite(myPoint.distanceKm) ? formatDistance(myPoint.distanceKm) + ' · ' : ''}Kendi kaydınız, bu cihazda`
                : 'e-Devlet’teki AFAD sorgusundan öğrendiğiniz alanı haritada işaretleyin; internet olmasa da yol tarifi alabilirsiniz.'}
            </AppText>
          </View>
          {myPoint ? (
            <Pressable
              onPress={() =>
                Alert.alert('Kaydı sil', 'Kaydettiğiniz toplanma alanı silinsin mi?', [
                  { text: 'Vazgeç', style: 'cancel' },
                  { text: 'Sil', style: 'destructive', onPress: () => saveMyPoint(null).then(reload) },
                ])
              }
              accessibilityRole="button"
              accessibilityLabel="Kaydı sil"
              style={{ padding: 8 }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
        {myPoint && userCoords && location.status === 'granted' ? (
          <CompassToTarget from={userCoords} target={myPoint} label={myPoint.name} />
        ) : null}
        {myPoint ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button style={{ flex: 1 }} label="Yol tarifi" icon="walk-outline" onPress={() => openDirections(myPoint)} />
            <Button
              style={{ flex: 1 }}
              label="Düzenle"
              icon="create-outline"
              variant="secondary"
              onPress={() => router.push('/toplanma/sec')}
            />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              style={{ flex: 1 }}
              label="e-Devlet’te sorgula"
              icon="open-outline"
              variant="secondary"
              onPress={() => Linking.openURL(EDEVLET_ASSEMBLY_URL)}
            />
            <Button style={{ flex: 1 }} label="Haritada işaretle" icon="flag-outline" onPress={() => router.push('/toplanma/sec')} />
          </View>
        )}
      </Card>
      <Banner
        icon="information-circle-outline"
        text="Rota uygulaması yolların afet sonrası durumunu bilmez. Kapalı yol ve hasarlı yapılara dikkat edin."
      />
      {location.status === 'manual' ? (
        <Banner
          icon="location-outline"
          tone="warning"
          text={`Konum: ${location.label}. Kesin mesafe için konum izni verin.`}
          onPress={() => router.push('/konum')}
        />
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm }} accessibilityRole="radiogroup">
        {RADII.map((r) => (
          <Pressable
            key={r}
            onPress={() => setRadiusKm(r)}
            accessibilityRole="radio"
            accessibilityState={{ checked: radiusKm === r }}
            style={[styles.radius, radiusKm === r && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <AppText variant="label" color={radiusKm === r ? '#fff' : colors.text}>
              {r} km
            </AppText>
          </Pressable>
        ))}
      </View>

      {state.status === 'no-location' ? (
        <StateMessage
          icon="location-outline"
          title="Konumunuz bilinmiyor"
          message="Konum izni verin veya ilinizi elle seçin."
          actionLabel="Konum seç"
          onAction={() => router.push('/konum')}
        />
      ) : state.status === 'loading' ? (
        <ListSkeleton />
      ) : state.status === 'ready' && state.points.length > 0 ? (
        <>
          <AppText variant="caption">
            {state.points.length} resmî alan · {state.fromCache ? 'önbellekten, ' : ''}güncellendi {relativeTimeTr(state.fetchedAt)}
          </AppText>
          {state.points.map(renderPoint)}
        </>
      ) : (
        <StateMessage
          icon="people-outline"
          tone={state.status === 'error' ? 'error' : 'neutral'}
          title={state.status === 'error' ? 'Veri alınamadı' : 'Bu bölge için doğrulanmış resmî veri yok'}
          message={
            state.status === 'error'
              ? state.error
              : state.status === 'not-configured'
                ? 'Sunucu yapılandırılmadı. Uygulama toplanma alanı uydurmaz.'
                : `${radiusKm} km içinde içe aktarılmış resmî kayıt bulunamadı. Uygulama toplanma alanı uydurmaz.`
          }
          actionLabel={state.status === 'error' ? 'Tekrar dene' : undefined}
          onAction={state.status === 'error' ? reload : undefined}
          compact
        />
      )}

      {saved.length ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="heading">Kaydedilenler (çevrimdışı erişilebilir)</AppText>
          {saved.map(renderPoint)}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  myCard: { borderColor: colors.safe + '66' },
  apIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.safe,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radius: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
