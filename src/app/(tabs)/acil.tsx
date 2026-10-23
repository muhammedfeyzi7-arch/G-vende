import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Banner, Button, Pill } from '@/components/ui';
import { IconTile, ProgressRing, ScreenHeader, accent } from '@/components/ds';
import { openDirections } from '@/features/assembly-points/api';
import { useNearbyAssembly } from '@/features/assembly-points/useNearbyAssembly';
import { placeTitle } from '@/features/earthquakes/format';
import { SOURCES } from '@/features/earthquakes/repository';
import { DCH_STEPS } from '@/features/emergency/DropCoverHold';
import { KIT_ITEMS, KIT_SHORT } from '@/features/emergency/content';
import { useFamilyActions } from '@/features/family/useFamilyActions';
import { DEFAULT_LAYERS, QuakeMap } from '@/features/map/QuakeMap';
import { useApp } from '@/providers/AppProvider';
import { colors, radius, spacing } from '@/theme';
import { formatDistance } from '@/utils/geo';
import { relativeTimeTr } from '@/utils/time';

function ActionTile({
  icon,
  color,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <IconTile icon={icon} color={color} size={40} />
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </View>
      <AppText
        variant="heading"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={{ fontSize: 12.5, lineHeight: 15, marginTop: spacing.sm }}
      >
        {title}
      </AppText>
      <AppText variant="caption" numberOfLines={3} style={{ fontSize: 10.5, lineHeight: 13 }}>
        {subtitle}
      </AppText>
    </Pressable>
  );
}

export default function EmergencyScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { width } = useWindowDimensions();
  const { settings, updateSettings, online, quakes, userCoords, location } = useApp();
  const fam = useFamilyActions();
  const nearby = useNearbyAssembly(userCoords);
  const wide = width >= 380;
  const stepIcon = Math.min(100, (width - 2 * spacing.md - 2 * spacing.sm - 3 * 6) / 4 - 4);

  const point = nearby.myPoint ?? (nearby.official[0] ? { ...nearby.official[0] } : null);
  const kitDone = settings.kitChecked.filter((id) => KIT_ITEMS.some((k) => k.id === id)).length;
  const toggleKit = (id: string) =>
    updateSettings({
      kitChecked: settings.kitChecked.includes(id) ? settings.kitChecked.filter((x) => x !== id) : [...settings.kitChecked, id],
    });

  // Resmî kurum kaynaklı son önemli kayıtlar (M4+, son 7 gün) — metin uydurulmaz, kayıttan üretilir.
  const official = useMemo(
    () =>
      (quakes.snapshot?.events ?? [])
        .filter((e) => (e.primary.magnitude ?? 0) >= 4 && e.readings.some((r) => r.source !== 'usgs'))
        .slice(0, 2),
    [quakes.snapshot],
  );

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: spacing.md,
        paddingBottom: tabBarHeight + spacing.xl,
        gap: spacing.md,
      }}
    >
      <ScreenHeader
        title="Acil Durum"
        subtitle="Olası bir afet durumunda hızlıca erişebileceğiniz bilgiler ve araçlar."
        right={
          <Pressable
            onPress={() => router.push('/acil-mod')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.modeBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="megaphone-outline" size={18} color={colors.danger} />
            <AppText variant="label" color={colors.danger} style={{ fontSize: 11.5, fontWeight: '700' }}>
              Acil Durum Modu
            </AppText>
            <Ionicons name="chevron-forward" size={16} color={colors.danger} />
          </Pressable>
        }
      />
      {!online ? (
        <Banner
          icon="cloud-offline-outline"
          tone="warning"
          text="Çevrimdışısınız. Bu sayfadaki araçlar ve rehberler internetsiz çalışır."
        />
      ) : null}

      {/* 112 */}
      <View style={styles.callCard}>
        <LinearGradient colors={['#5A0F1C', '#3A0B14']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Pressable
          onPress={() => Linking.openURL('tel:112')}
          accessibilityRole="button"
          accessibilityLabel="112’yi ara"
          style={styles.phoneCircle}
        >
          <Ionicons name="call" size={34} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color="#F6C9CE">
            Acil Çağrı
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AppText variant="display" style={{ fontSize: 35, lineHeight: 38.5 }}>
              112
            </AppText>
            <AppText variant="caption" color="#F6C9CE" style={{ fontSize: 10, lineHeight: 13, flexShrink: 1 }}>
              {'Sağlık · İtfaiye · Polis\nAFAD · Jandarma'}
            </AppText>
          </View>
        </View>
        <Pressable
          onPress={() => Linking.openURL('tel:112')}
          accessibilityRole="button"
          accessibilityLabel="Hemen ara"
          style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="call" size={18} color="#fff" />
          <AppText variant="heading" color="#fff" style={{ fontSize: 13 }}>
            Hemen Ara
          </AppText>
        </Pressable>
      </View>

      {/* Hızlı eylemler */}
      <View style={styles.actions}>
        <ActionTile
          icon="chatbubble-ellipses-outline"
          color={accent.blue}
          title="Acil SMS"
          subtitle="Hazır mesaj gönder"
          onPress={() => router.push('/acil-sms')}
        />
        <ActionTile
          icon="location"
          color={accent.green}
          title="Konum Paylaş"
          subtitle="Konumunu ailene gönder"
          onPress={fam.shareLocation}
        />
        <ActionTile icon="people" color={accent.purple} title="Aileye Bildir" subtitle="Herkese durum sor" onPress={fam.askEveryone} />
        <ActionTile
          icon="megaphone-outline"
          color={accent.orange}
          title="Acil Duyurular"
          subtitle="Resmî kayıtları takip et"
          onPress={() => router.push('/duyurular')}
        />
      </View>

      {/* Çök – Kapan – Tutun */}
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <AppText variant="title" style={{ fontSize: 16.5, flex: 1 }}>
            Deprem Anında Ne Yapmalıyım?
          </AppText>
          <Pressable onPress={() => router.push('/rehber')} accessibilityRole="link" style={{ padding: 4 }}>
            <AppText variant="label" color={colors.primary}>
              Tüm Rehberler ›
            </AppText>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: spacing.sm }}>
          {DCH_STEPS.map(({ n, title, text, Icon }) => (
            <Pressable
              key={n}
              onPress={() => router.push({ pathname: '/rehber/[id]', params: { id: n === 4 ? 'after' : 'during' } })}
              style={styles.step}
              accessibilityRole="button"
              accessibilityLabel={`${n}. ${title}: ${text}`}
            >
              <View style={styles.stepImg}>
                <Icon size={stepIcon} />
                <View style={styles.stepNum}>
                  <AppText variant="label" color="#fff" style={{ fontWeight: '800' }}>
                    {n}
                  </AppText>
                </View>
              </View>
              <AppText variant="heading" style={{ fontSize: 13, fontWeight: '800', marginTop: 6 }}>
                {title}
              </AppText>
              <AppText variant="caption" style={{ fontSize: 10, lineHeight: 13 }}>
                {text}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Toplanma noktamız + Afet çantası */}
      <View style={[styles.pair, !wide && { flexDirection: 'column' }]}>
        <View style={[styles.card, styles.halfCard, { borderColor: colors.safe + '88' }]}>
          <Pressable onPress={() => router.push('/toplanma')} style={styles.halfHead} accessibilityRole="button">
            <IconTile icon="flag" color={accent.green} size={34} />
            <View style={{ flex: 1 }}>
              <AppText variant="label" color={colors.safe} style={{ fontWeight: '700' }}>
                Toplanma Noktamız
              </AppText>
              <AppText variant="heading" numberOfLines={2} style={{ fontSize: 13 }}>
                {point ? point.name : 'Henüz belirlenmedi'}
              </AppText>
              {point ? (
                <AppText variant="caption" numberOfLines={1}>
                  {[point.district ?? point.address, Number.isFinite(point.distanceKm) ? formatDistance(point.distanceKm) : null]
                    .filter(Boolean)
                    .join(' · ') || (point.isUserSaved ? 'Kendi kaydınız' : point.sourceName)}
                </AppText>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
          {point ? (
            <>
              <View style={styles.miniMap}>
                <QuakeMap
                  mapStyle={settings.mapStyle}
                  events={[]}
                  focus={null}
                  reports={[]}
                  assemblyPoints={[point]}
                  user={userCoords}
                  userIsPrecise={location.status === 'granted'}
                  layers={{ ...DEFAULT_LAYERS, rings: false }}
                  onSelect={() => {}}
                  initialCenter={point}
                  initialZoom={14}
                  interactive={false}
                />
              </View>
              <View style={{ flexDirection: width >= 520 ? 'row' : 'column', gap: spacing.xs }}>
                <Button
                  size="sm"
                  style={{ flex: 1 }}
                  variant="secondary"
                  icon="map-outline"
                  label="Haritada Göster"
                  onPress={() => router.push('/toplanma')}
                />
                <Button
                  size="sm"
                  style={{ flex: 1 }}
                  variant="primary"
                  icon="navigate-outline"
                  label="Yola Çık"
                  onPress={() => openDirections(point)}
                />
              </View>
            </>
          ) : (
            <View style={{ gap: spacing.sm }}>
              <AppText variant="caption">e-Devlet’ten öğrendiğiniz toplanma alanınızı işaretleyin; internetsiz de yol tarifi alın.</AppText>
              <Button
                size="sm"
                variant="secondary"
                icon="flag-outline"
                label="Alanımı işaretle"
                onPress={() => router.push('/toplanma/sec')}
              />
            </View>
          )}
        </View>

        <View style={[styles.card, styles.halfCard]}>
          <Pressable onPress={() => router.push('/canta')} style={styles.halfHead} accessibilityRole="button">
            <IconTile icon="mci:bag-personal" color={accent.red} size={34} />
            <View style={{ flex: 1 }}>
              <AppText variant="heading" style={{ fontSize: 13 }}>
                Acil Durum Çantası
              </AppText>
              <AppText variant="caption">Hazırlık kontrol listesi</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <ProgressRing value={kitDone} total={KIT_ITEMS.length} size={70}>
                <AppText variant="heading" style={{ fontSize: 15 }}>
                  {kitDone}/{KIT_ITEMS.length}
                </AppText>
              </ProgressRing>
              <AppText variant="caption" style={{ fontSize: 9, textAlign: 'center' }}>
                Hazır olma{'\n'}durumunuz
              </AppText>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              {KIT_ITEMS.slice(0, 6).map((k) => {
                const on = settings.kitChecked.includes(k.id);
                return (
                  <Pressable
                    key={k.id}
                    onPress={() => toggleKit(k.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={styles.kitRow}
                  >
                    <Ionicons name={on ? 'checkbox' : 'square-outline'} size={18} color={on ? colors.safe : colors.textMuted} />
                    <AppText variant="caption" color={colors.text} numberOfLines={1} style={{ fontSize: 11 }}>
                      {KIT_SHORT[k.id]}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Button size="sm" variant="secondary" icon="list-outline" label="Listeyi Görüntüle" onPress={() => router.push('/canta')} />
        </View>
      </View>

      {/* Resmî bilgiler */}
      <View style={styles.card}>
        <Pressable onPress={() => router.push('/duyurular')} style={[styles.cardHead, { alignItems: 'center' }]} accessibilityRole="button">
          <IconTile icon="radio-outline" color={accent.red} size={44} />
          <View style={{ flex: 1 }}>
            <AppText variant="heading" style={{ fontSize: 15 }}>
              Resmî Bilgiler ve Duyurular
            </AppText>
            <AppText variant="caption">AFAD ve Kandilli’nin yayımladığı son önemli deprem kayıtları.</AppText>
          </View>
          <AppText variant="label" color={colors.textSecondary}>
            Tümü ›
          </AppText>
        </Pressable>
        <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          {official.length ? (
            official.map((e) => {
              const src = e.readings.find((r) => r.source !== 'usgs')!;
              const fresh = Date.now() - Date.parse(e.primary.occurredAt) < 60 * 60_000;
              return (
                <Pressable
                  key={e.id}
                  onPress={() => router.push({ pathname: '/deprem/[id]', params: { id: e.id } })}
                  style={styles.news}
                  accessibilityRole="button"
                >
                  <View style={styles.srcBadge}>
                    <AppText variant="label" color="#fff" style={{ fontWeight: '800', fontSize: 10.5 }}>
                      {SOURCES[src.source].label.toUpperCase().slice(0, 5)}
                    </AppText>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {fresh ? <Pill label="Son Dakika" color={colors.danger} /> : null}
                      <AppText variant="caption">{relativeTimeTr(e.primary.occurredAt)}</AppText>
                    </View>
                    <AppText variant="heading" numberOfLines={2} style={{ fontSize: 13 }}>
                      {placeTitle(e)} · {src.magnitude?.toFixed(1).replace('.', ',') ?? '?'} büyüklüğünde deprem
                    </AppText>
                    <AppText variant="caption">
                      {SOURCES[src.source].label} kaydı{src.depthKm != null ? ` · Derinlik ${src.depthKm} km` : ''}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
              );
            })
          ) : (
            <AppText variant="caption">{quakes.error ?? 'Son 7 günde M4 ve üzeri resmî kayıt yok.'}</AppText>
          )}
          <Pressable onPress={() => Linking.openURL('https://www.afad.gov.tr')} accessibilityRole="link" style={{ paddingVertical: 6 }}>
            <AppText variant="label" color={colors.primary}>
              AFAD duyurularını resmî sitede aç ↗
            </AppText>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 42,
    marginTop: 4,
  },
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#8A1F2E',
    padding: spacing.md,
    overflow: 'hidden',
    boxShadow: '0 6px 24px rgba(255,53,72,0.25)',
  },
  phoneCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 18px rgba(255,53,72,0.6)',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C81E32',
    borderWidth: 1,
    borderColor: '#FF6B78',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  actions: { flexDirection: 'row', gap: spacing.xs + 2 },
  action: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    padding: spacing.sm,
    minHeight: 120,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  step: { flex: 1, flexBasis: 0, minWidth: 0, gap: 2 },
  stepImg: {
    overflow: 'hidden',
    height: 80,
    borderRadius: radius.md,
    backgroundColor: '#0B1928',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pair: { flexDirection: 'row', gap: spacing.sm },
  halfCard: { flex: 1, paddingHorizontal: spacing.sm + 2 },
  halfHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  miniMap: { height: 110, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#0A1824' },
  kitRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 24 },
  news: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  srcBadge: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#C81E32', alignItems: 'center', justifyContent: 'center' },
});
