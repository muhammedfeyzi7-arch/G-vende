import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { call112 } from '@/features/emergency/call';
import { AppText } from '@/components/ui';
import { Icon } from '@/components/ds';
import { KIT_ITEMS } from '@/features/emergency/content';
import { computeAlertState, type AlertState } from '@/features/earthquakes/alertState';
import { formatMagnitude, placeTitle } from '@/features/earthquakes/format';
import { SOURCES, type QuakeSnapshot } from '@/features/earthquakes/repository';
import { useFamily } from '@/features/family/useFamily';
import { useFamilyActions } from '@/features/family/useFamilyActions';
import { GuideImage } from '@/features/guide/Art';
import { MapLegend } from '@/features/map/MapOverlays';
import { DEFAULT_LAYERS, QuakeMap } from '@/features/map/QuakeMap';
import { useApp, useVisibleQuakes } from '@/providers/AppProvider';
import { useInbox } from '@/providers/InboxProvider';
import { useReports } from '@/providers/ReportsProvider';
import { alpha, colors, radius, spacing, themedStyles } from '@/theme';
import type { EarthquakeEvent } from '@/types/earthquake';
import { relativeTimeTr } from '@/utils/time';

export { call112 } from '@/features/emergency/call';

/** Metni tek satıra sığdıran yazı boyutu (web'de adjustsFontSizeToFit yok; her platformda aynı sonuç). */
const fit = (text: string, width: number, max: number, bold = true) =>
  Math.max(8, Math.min(max, width / (text.length * (bold ? 0.56 : 0.56))));

type Tone = 'ok' | 'alert' | 'warn' | 'unknown';
const TONE_COLOR: Record<Tone, string> = { ok: '#19C37D', alert: '#FF3548', warn: '#FF8A24', unknown: '#7B8A9C' };

/**
 * "Şu an deprem var mı?" kartının durumu. Yalnızca kaynaklardan alınmış son veriye dayanır;
 * veri yoksa veya eskiyse kesin "deprem yok" demez.
 */
export function quakeStatus(
  alert: AlertState,
  snap: QuakeSnapshot | null,
  loading: boolean,
  located: boolean,
): { tone: Tone; text: string; sub: string | null } {
  if (alert.kind === 'recent-significant') {
    const e = alert.event;
    return {
      tone: 'alert',
      text: `${alert.minutesAgo} dk önce ${placeTitle(e)} · ${formatMagnitude(e.primary.magnitude)} büyüklüğünde deprem kaydedildi.`,
      sub: `Kaynak: ${SOURCES[e.primary.source].label}${alert.distanceKm != null ? ` · ${Math.round(alert.distanceKm)} km uzakta` : ''}`,
    };
  }
  if (!snap) {
    return loading
      ? { tone: 'unknown', text: 'Deprem verileri yükleniyor…', sub: null }
      : { tone: 'unknown', text: 'Deprem verisi alınamadı. Lütfen internet bağlantınızı kontrol edin.', sub: null };
  }
  const when = snap.lastSuccessAt ? relativeTimeTr(snap.lastSuccessAt) : null;
  if (snap.stale || snap.via === 'cache') {
    return {
      tone: 'warn',
      text: 'Veriler güncel olmayabilir; yeni deprem kayıtları alınamadı.',
      sub: when ? `Son başarılı güncelleme ${when}` : null,
    };
  }
  return {
    tone: 'ok',
    text: located
      ? 'Son 30 dakikada yakınınızda önemli bir deprem kaydı yok.'
      : 'Son 30 dakikada Türkiye genelinde 5 ve üzeri deprem kaydı yok.',
    sub: when ? `Son güncelleme ${when}` : null,
  };
}

function NewsCard({ e, width, compact }: { e: EarthquakeEvent; width: number; compact?: boolean }) {
  const src = SOURCES[e.primary.source].label;
  const m = e.primary.magnitude ?? 0;
  const tint = m >= 5 ? '#FF3548' : m >= 4 ? '#FF8A24' : '#E5484D';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/deprem/[id]', params: { id: e.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${src}: ${placeTitle(e)}, ${formatMagnitude(e.primary.magnitude)} büyüklüğünde deprem, ${relativeTimeTr(e.primary.occurredAt)}`}
      style={({ pressed }) => [styles.news, { width }, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.newsTop, compact && { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
        <View style={[styles.newsIcon, { backgroundColor: alpha(tint, 0.18) }]}>
          <Ionicons name="pulse" size={14} color={tint} />
        </View>
        <AppText variant="caption" numberOfLines={1} style={{ flex: 1, fontSize: 10 }}>
          {relativeTimeTr(e.primary.occurredAt)}
        </AppText>
      </View>
      <AppText variant="heading" numberOfLines={compact ? 6 : 4} style={{ fontSize: 12, lineHeight: 16, fontWeight: '600' }}>
        {src}: {placeTitle(e).split(' · ')[0]} · {formatMagnitude(e.primary.magnitude)} büyüklüğünde deprem
      </AppText>
    </Pressable>
  );
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { width } = useWindowDimensions();
  const { quakes, refreshQuakes, userCoords, location, online, settings } = useApp();
  const events = useVisibleQuakes();
  const feed = useReports();
  const family = useFamily();
  const fam = useFamilyActions();
  const { unread } = useInbox();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const pageW = Math.min(width, 640);
  const gap = spacing.sm;
  const quickW = (pageW - spacing.md * 2 - gap * 3) / 4;
  // Dar ekranlarda (≤ 360 pt) hızlı işlem metinleri orantılı küçülür, taşmaz.
  const k = Math.min(1, quickW / 82);
  // Küçük telefonlar (ör. iPhone SE 320 pt): çevrimdışı rozeti yalnız simge, alt kartlar alt alta.
  const narrow = pageW < 360;
  // Son gelişmeler: kart içinde üç eşit sütun
  const newsW = (pageW - spacing.md * 2 - spacing.sm * 2 - gap * 2) / 3;
  const mapTextW = pageW - spacing.md * 4 - 150;
  const pairTextW = (narrow ? pageW - spacing.md * 2 : (pageW - spacing.md * 2 - gap) / 2) - 38 - 14 - 10 - 14;

  const alert = useMemo(() => computeAlertState(events, userCoords), [events, userCoords]);
  const status = quakeStatus(alert, quakes.snapshot, quakes.loading, !!userCoords);
  // Haritada son 24 saatin olayları
  const mapEvents = useMemo(() => events.filter((e) => Date.now() - Date.parse(e.primary.occurredAt) < 24 * 3600_000), [events]);
  const kitDone = settings.kitChecked.filter((id) => KIT_ITEMS.some((x) => x.id === id)).length;
  const kitPct = KIT_ITEMS.length ? kitDone / KIT_ITEMS.length : 0;
  const news = events.slice(0, 6);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshQuakes(), feed.refresh(), family.reload()]);
    setRefreshing(false);
    toast.show(
      online ? { text: 'Güncellendi', tone: 'success' } : { text: 'Çevrimdışı: son kayıtlı veriler gösteriliyor', tone: 'warning' },
    );
  };

  const offlineInfo = () =>
    Alert.alert(
      online ? 'Çevrimdışı erişilebilir' : 'İnternet bağlantısı yok',
      `${online ? '' : 'Son kayıtlı veriler gösteriliyor. '}Acil durum rehberi internetsiz açılır; 112 araması ve “Güvendeyim” SMS’i telefon şebekesiyle çalışır.`,
    );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: tabBarHeight + spacing.xl,
          gap: 8,
          width: '100%',
          maxWidth: 640,
          alignSelf: 'center',
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
      >
        {/* A. Üst başlık */}
        <View style={styles.header}>
          <View style={styles.brand} accessible accessibilityRole="header" accessibilityLabel="GÜVENDE, Afet Anında Yanınızda">
            <GuideImage img="logo" style={{ width: 30, height: 33 }} />
            <View style={{ flexShrink: 1 }}>
              <AppText variant="title" numberOfLines={1} style={{ fontSize: 20, lineHeight: 24, fontWeight: '800', letterSpacing: 0.3 }}>
                GÜVENDE
              </AppText>
              <AppText variant="caption" numberOfLines={1} style={{ fontSize: 10 }}>
                Afet Anında Yanınızda
              </AppText>
            </View>
          </View>
          <Pressable
            onPress={offlineInfo}
            accessibilityRole="button"
            accessibilityLabel={online ? 'Çevrimdışı erişilebilir' : 'İnternet yok, kayıtlı veriler gösteriliyor'}
            style={({ pressed }) => [
              styles.offline,
              !online && { borderColor: colors.warning, backgroundColor: alpha(colors.warning, 0.08) },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons
              name={online ? 'cloud-download-outline' : 'cloud-offline-outline'}
              size={17}
              color={online ? colors.safe : colors.warning}
            />
            {narrow ? null : (
              <AppText
                variant="label"
                numberOfLines={1}
                color={online ? colors.safe : colors.warning}
                style={{ fontSize: 11, fontWeight: '600', flexShrink: 1 }}
              >
                {online ? 'Çevrimdışı erişilebilir' : 'Çevrimdışı · kayıtlı veri'}
              </AppText>
            )}
          </Pressable>
          <Pressable
            onPress={() => router.push('/bildirimler')}
            accessibilityRole="button"
            accessibilityLabel={unread ? `Bildirimler, ${unread} okunmamış` : 'Bildirimler'}
            hitSlop={6}
            style={({ pressed }) => [styles.bell, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            {unread > 0 ? <View style={styles.bellDot} /> : null}
          </Pressable>
        </View>

        {/* B. Acil Durum */}
        <Pressable
          onPress={() => router.push('/acil')}
          accessibilityRole="button"
          accessibilityLabel="Acil Durum. Yardıma mı ihtiyacınız var?"
          style={({ pressed }) => [styles.sos, pressed && { opacity: 0.92 }]}
        >
          <LinearGradient colors={['#E8323F', '#A9121F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.sosIcon}>
            <Ionicons name="call" size={30} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText
              variant="display"
              color="#fff"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ fontSize: narrow ? 22 : 26, lineHeight: narrow ? 27 : 31 }}
            >
              Acil Durum
            </AppText>
            <AppText variant="body" color="#FFE3E5" style={{ fontSize: narrow ? 12.5 : 14 }}>
              Yardıma mı ihtiyacınız var?
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={28} color="#fff" />
        </Pressable>

        {/* C. Dört hızlı işlem */}
        <View style={{ flexDirection: 'row', gap }}>
          {(
            [
              { key: '112', icon: 'call', title: '112', sub: 'Acil Çağrı', onPress: call112, red: true },
              {
                key: 'araclar',
                icon: 'mci:ambulance',
                title: 'Acil Araçlar',
                sub: 'İtfaiye · Polis · Sağlık',
                onPress: () => router.push('/acil-araclar'),
              },
              { key: 'paylas', icon: 'people', title: 'Ailemle Paylaş', sub: 'Güvendeyim bildir', onPress: () => fam.sendStatus('safe') },
              {
                key: 'enkaz',
                icon: 'megaphone',
                title: 'Enkaz Altı Modu',
                sub: 'Siren · Flaş · Rehber',
                onPress: () => router.push('/enkaz'),
              },
            ] as const
          ).map((q) => (
            <Pressable
              key={q.key}
              onPress={q.onPress}
              accessibilityRole="button"
              accessibilityLabel={q.key === '112' ? '112 Acil Çağrı' : `${q.title}. ${q.sub}`}
              style={({ pressed }) => [styles.quick, { width: quickW }, 'red' in q && styles.quickRed, pressed && { opacity: 0.85 }]}
            >
              <Icon name={q.icon} size={26 * k} color={'red' in q ? '#fff' : colors.text} />
              <AppText
                variant="heading"
                color={'red' in q ? '#fff' : colors.text}
                numberOfLines={narrow ? 2 : 1}
                style={{ fontSize: narrow ? 10.5 : fit(q.title, quickW - 8, 12), marginTop: 8, textAlign: 'center' }}
              >
                {q.title}
              </AppText>
              <AppText
                variant="caption"
                color={'red' in q ? '#FFE3E5' : colors.textSecondary}
                numberOfLines={narrow ? 2 : 1}
                style={{ fontSize: narrow ? 8.5 : fit(q.sub, quickW - 6, 10, false), marginTop: 2, textAlign: 'center' }}
              >
                {q.sub}
              </AppText>
            </Pressable>
          ))}
        </View>

        {/* D. Şu an deprem var mı? */}
        <Pressable
          onPress={() =>
            alert.kind === 'recent-significant'
              ? router.push({ pathname: '/deprem/[id]', params: { id: alert.event.id } })
              : router.push('/depremler')
          }
          accessibilityRole="button"
          accessibilityLabel={`Şu an deprem var mı? ${status.text}${status.sub ? ` ${status.sub}` : ''}`}
          style={({ pressed }) => [
            styles.card,
            styles.quake,
            status.tone === 'alert' && { borderColor: TONE_COLOR.alert },
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={[styles.quakeBar, { backgroundColor: status.tone === 'ok' ? colors.danger : TONE_COLOR[status.tone] }]} />
          <View style={styles.quakeArt} pointerEvents="none">
            <GuideImage img="quake-card" style={{ width: '100%', height: '100%' }} />
            {status.tone === 'ok' ? (
              <View style={styles.shield}>
                <Ionicons name="shield-checkmark" size={44} color="#19C37D" />
              </View>
            ) : null}
          </View>
          <View style={{ gap: 4, paddingRight: 40 }}>
            <AppText variant="title" style={{ fontSize: 17, lineHeight: 22 }}>
              Şu an deprem var mı?
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={{ fontSize: 13 }}>
              Yakınınızdaki son depremler
            </AppText>
          </View>
          <View style={styles.quakeStatus}>
            <View style={[styles.dot, { backgroundColor: TONE_COLOR[status.tone], boxShadow: `0 0 8px ${TONE_COLOR[status.tone]}` }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="body" style={{ fontSize: 12, lineHeight: 16 }}>
                {status.text}
              </AppText>
              {status.sub ? (
                <AppText variant="caption" style={{ fontSize: 10.5 }}>
                  {status.sub}
                </AppText>
              ) : null}
            </View>
          </View>
          <View style={styles.cornerChev}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </View>
        </Pressable>

        {/* E. Yakınımdaki risk durumu */}
        <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
          <View style={styles.mapHead}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="title" numberOfLines={1} style={{ fontSize: fit('Yakınımdaki risk durumu', mapTextW, 15) }}>
                Yakınımdaki risk durumu
              </AppText>
              <AppText
                variant="caption"
                numberOfLines={narrow ? 2 : 1}
                style={{ fontSize: narrow ? 10 : fit('Harita üzerinden güncel durumu takip edin.', mapTextW, 11, false) }}
              >
                Harita üzerinden güncel durumu takip edin.
              </AppText>
            </View>
            <Pressable
              onPress={() => router.push('/harita')}
              accessibilityRole="button"
              accessibilityLabel="Haritayı Aç"
              style={({ pressed }) => [styles.mapBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="map" size={16} color={colors.text} />
              <AppText variant="label" color={colors.text} style={{ fontWeight: '700', fontSize: 12.5 }}>
                Haritayı Aç
              </AppText>
              <Ionicons name="chevron-forward" size={16} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.mapBox}>
            <QuakeMap
              mapStyle={settings.mapStyle}
              events={mapEvents}
              focus={alert.kind === 'recent-significant' ? alert.event : null}
              reports={feed.reports}
              assemblyPoints={[]}
              user={userCoords}
              userIsPrecise={location.status === 'granted'}
              layers={DEFAULT_LAYERS}
              onSelect={() => {}}
              interactive={false}
            />
            <Pressable
              onPress={() => router.push('/harita')}
              accessibilityRole="button"
              accessibilityLabel="Haritayı aç"
              style={StyleSheet.absoluteFill}
            />
            {!userCoords ? (
              <Pressable onPress={() => router.push('/konum')} accessibilityRole="button" style={styles.locChip}>
                <Ionicons name="location-outline" size={15} color={colors.warning} />
                <AppText variant="label" color={colors.text} style={{ fontSize: 12 }}>
                  {location.status === 'denied' ? 'Konum izni yok · Konum seç' : 'Konum belirlenmedi · Konum seç'}
                </AppText>
              </Pressable>
            ) : null}
            <View style={styles.legend} pointerEvents="none">
              <MapLegend />
            </View>
          </View>
        </View>

        {/* F. Ailem + Acil durum çantam */}
        <View style={{ flexDirection: narrow ? 'column' : 'row', gap }}>
          <Pressable
            onPress={() => router.push('/ailem')}
            accessibilityRole="button"
            accessibilityLabel="Ailem. Sevdiklerinizin durumunu takip edin."
            style={({ pressed }) => [styles.card, styles.pair, pressed && { opacity: 0.88 }]}
          >
            <LinearGradient
              colors={[alpha('#7A5CF0', 0.22), alpha('#7A5CF0', 0.04)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient colors={['#7A5CF0', '#5134C4']} style={styles.pairIcon}>
              <Ionicons name="people" size={24} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="heading" numberOfLines={1} style={{ fontSize: 14 }}>
                Ailem
              </AppText>
              <AppText variant="caption" style={{ fontSize: 9.5, lineHeight: 12.5 }}>
                Sevdiklerinizin durumunu takip edin.
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/canta')}
            accessibilityRole="button"
            accessibilityLabel={`Acil durum çantam. ${kitDone}/${KIT_ITEMS.length} tamamlandı`}
            style={({ pressed }) => [styles.card, styles.pair, pressed && { opacity: 0.88 }]}
          >
            <LinearGradient
              colors={[alpha('#2F8BFF', 0.2), alpha('#2F8BFF', 0.04)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient colors={['#2F8BFF', '#1557D6']} style={styles.pairIcon}>
              <Icon name="mci:bag-personal" size={24} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1, gap: 6 }}>
              <AppText variant="heading" numberOfLines={1} style={{ fontSize: fit('Acil durum çantam', pairTextW, 14) }}>
                Acil durum çantam
              </AppText>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round(kitPct * 100)}%` }]} />
              </View>
              <AppText variant="caption" style={{ fontSize: 10.5 }}>
                {kitDone}/{KIT_ITEMS.length} tamamlandı
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* G. Son gelişmeler */}
        <View style={[styles.card, { paddingHorizontal: 0, gap: spacing.sm }]}>
          <View style={styles.newsHead}>
            <AppText variant="title" style={{ flex: 1, fontSize: 18 }}>
              Son gelişmeler
            </AppText>
            <Pressable onPress={() => router.push('/depremler')} accessibilityRole="link" hitSlop={8}>
              <AppText variant="label" color={colors.primary} style={{ fontSize: 13.5 }}>
                Tümünü gör
              </AppText>
            </Pressable>
          </View>
          {news.length ? (
            <View style={styles.newsRow}>
              {news.slice(0, 3).map((e) => (
                <NewsCard key={e.id} e={e} width={newsW} compact={narrow} />
              ))}
            </View>
          ) : quakes.loading ? (
            <View style={styles.newsRow} accessibilityLabel="Son gelişmeler yükleniyor">
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.news, { width: newsW }]}>
                  <View style={styles.newsTop}>
                    <Skeleton width={26} height={26} radius={13} />
                    <Skeleton width="55%" height={10} />
                  </View>
                  <Skeleton width="95%" height={11} />
                  <Skeleton width="80%" height={11} />
                  <Skeleton width="60%" height={11} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name={quakes.error ? 'cloud-offline-outline' : 'time-outline'} size={22} color={colors.textSecondary} />
              <AppText variant="caption" style={{ flex: 1, fontSize: 13 }}>
                {quakes.error
                  ? 'Kayıtlar alınamadı. Lütfen internet bağlantınızı kontrol edin.'
                  : 'Seçili büyüklük eşiğinin üzerinde son 7 günde kayıt yok.'}
              </AppText>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: alpha(colors.safe, 0.75),
    backgroundColor: alpha(colors.safe, 0.08),
    flexShrink: 1,
  },
  bell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  sos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 76,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FF5B66',
    boxShadow: '0 8px 26px rgba(232,50,63,0.35)',
  },
  sosIcon: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: '#FF4F5B',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
  },
  quick: {
    minHeight: 76,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickRed: { backgroundColor: '#E5303D', borderColor: '#FF5B66', boxShadow: '0 6px 18px rgba(229,48,61,0.35)' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  quake: { minHeight: 106, overflow: 'hidden', justifyContent: 'space-between', gap: 6, paddingLeft: spacing.lg, paddingVertical: 10 },
  quakeBar: { position: 'absolute', left: 0, top: 16, width: 3, height: 28, borderRadius: 2 },
  quakeArt: { position: 'absolute', right: 0, bottom: 0, width: '52%', height: '100%' },
  shield: { position: 'absolute', right: '22%', bottom: 6 },
  quakeStatus: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, maxWidth: '62%' },
  dot: { width: 14, height: 14, borderRadius: 7, marginTop: 3 },
  cornerChev: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: alpha(colors.textSecondary, 0.16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  mapBox: { height: 108, backgroundColor: colors.mapPlaceholder },
  legend: { position: 'absolute', left: spacing.sm, bottom: spacing.sm },
  locChip: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: alpha(colors.bg, 0.85),
  },
  pair: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 60,
    paddingHorizontal: 7,
    paddingVertical: 7,
    overflow: 'hidden',
  },
  pairIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: alpha(colors.textSecondary, 0.2), overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  newsHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  newsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.sm },
  news: {
    minHeight: 104,
    gap: 6,
    padding: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  newsTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  newsIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
  },
}));
