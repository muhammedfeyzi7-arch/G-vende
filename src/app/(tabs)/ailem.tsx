import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '@/components/Toast';
import { AppText } from '@/components/ui';
import { Avatar } from '@/components/ds';
import { ASK_STATUS_MESSAGE, callPhone, formatPhone, sendSms } from '@/features/family/local';
import { OnlineGroupSection } from '@/features/family/OnlineGroupSection';
import { buildPeople, safeCount, type PersonSummary } from '@/features/family/people';
import { useFamily } from '@/features/family/useFamily';
import { useFamilyActions } from '@/features/family/useFamilyActions';
import { GuideImage } from '@/features/guide/Art';
import { DEFAULT_LAYERS, QuakeMap, type FamilyPin, type QuakeMapHandle } from '@/features/map/QuakeMap';
import { useProfile } from '@/hooks/useProfile';
import { useApp } from '@/providers/AppProvider';
import { alpha, colors, radius, spacing, themedStyles } from '@/theme';
import type { AssemblyPoint } from '@/types/assembly';
import { formatTimeTr, relativeTimeTr } from '@/utils/time';

const LOCATION_REQUEST_MESSAGE = 'GÜVENDE: Neredesin? Uygun olduğunda konumunu benimle paylaşır mısın?';
const STATUS_ICON: Record<string, string> = {
  safe: 'shield-checkmark',
  help: 'alert-circle',
  waiting: 'time-outline',
  home: 'home',
  unknown: 'help-circle-outline',
};

function SectionHead({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionBar} />
      <AppText variant="heading" accessibilityRole="header" style={{ flex: 1, fontSize: 18 }}>
        {title}
      </AppText>
      <Pressable onPress={onAction} accessibilityRole="link" accessibilityLabel={`${title}: ${action}`} hitSlop={8} style={styles.headLink}>
        <AppText variant="label" color={colors.primary} style={{ fontSize: 13.5 }}>
          {action}
        </AppText>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </Pressable>
    </View>
  );
}

/**
 * Ailem sekmesi: üyeler ve durumları, aile haritası, hızlı eylemler (SMS/arama telefonun kendi
 * uygulamasında açılır), buluşma noktası, acil durum kişileri ve aile planı. Uygulama kişilerin
 * durumunu kendiliğinden bilemez; yanıt vermeyen kişi tehlikede sayılmaz.
 */
export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { width } = useWindowDimensions();
  const { userCoords, location, settings } = useApp();
  const family = useFamily();
  const fam = useFamilyActions();
  const toast = useToast();
  const { profile } = useProfile();
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<QuakeMapHandle>(null);
  const pageW = Math.min(width, 640);
  const gap = spacing.sm;
  const cellW = (pageW - spacing.md * 2 - gap * 3) / 4;

  const groups =
    family.state.status === 'ready'
      ? family.state.groups
      : family.state.status === 'error' && family.state.cached
        ? family.state.cached.groups
        : [];
  const myUserId = family.state.status === 'ready' ? family.state.me : null;
  const people = useMemo(
    () => buildPeople({ name: profile.name, status: fam.myStatus }, fam.contacts, groups, myUserId),
    [profile.name, fam.myStatus, fam.contacts, groups, myUserId],
  );
  const counts = safeCount(people);

  // Harita: "Ben" + çevrimiçi gruptaki izinli konumlar + buluşma noktası. Yerel kişilerin konumu bilinmez.
  const pins: FamilyPin[] = useMemo(() => {
    const out: FamilyPin[] = [];
    if (userCoords)
      out.push({
        id: 'me',
        name: 'Ben',
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        at: new Date().toISOString(),
        stale: false,
        status: 'unknown',
        label: 'Ben',
      });
    for (const p of people)
      if (p.source === 'group' && p.location)
        out.push({
          id: p.key,
          name: p.name,
          latitude: p.location.latitude,
          longitude: p.location.longitude,
          at: p.at!,
          stale: p.location.stale,
          status: p.status === 'safe' ? 'safe' : p.status === 'help' ? 'help' : 'unknown',
          label: p.label,
        });
    return out;
  }, [people, userCoords]);
  const meeting: AssemblyPoint[] =
    fam.meetingPoint?.latitude != null
      ? [
          {
            id: 'meeting',
            name: `Buluşma: ${fam.meetingPoint.name}`,
            address: null,
            province: null,
            district: null,
            neighborhood: null,
            latitude: fam.meetingPoint.latitude,
            longitude: fam.meetingPoint.longitude!,
            capacity: null,
            sourceName: 'Aile buluşma noktası',
            sourceUrl: '',
            sourcePublishedAt: null,
            importedAt: fam.meetingPoint.updatedAt,
            isUserSaved: true,
          },
        ]
      : [];
  const sharedLocations = pins.filter((p) => p.id !== 'me').length;
  const hasMap = pins.length > 0 || meeting.length > 0;

  const bannerTone = counts.help ? colors.danger : counts.total > 0 && counts.safe === counts.total ? colors.safe : '#F7B548';
  const bannerTitle =
    counts.total === 0
      ? 'Aile üyelerinizin durumunu takip edin'
      : counts.help
        ? `${counts.help} kişi yardım istiyor`
        : `Ailende ${counts.total} kişiden ${counts.safe}’${counts.safe === 1 ? 'i' : 'si'} güvende`;
  const bannerSub =
    counts.total === 0
      ? 'Konum, güvenlik durumu ve acil durum bildirimleri tek ekranda.'
      : counts.lastAt
        ? `Son güncelleme: ${formatTimeTr(counts.lastAt)} · durum sormak için dokunun`
        : 'Durum sormak veya bildirmek için dokunun';

  const onBanner = () =>
    Alert.alert('Ailene haber ver', 'SMS, telefonunuzun mesaj uygulamasında hazırlanır; gönder’e siz basarsınız.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Herkese durum sor', onPress: fam.askEveryone },
      { text: 'Güvendeyim gönder', onPress: () => fam.sendStatus('safe') },
    ]);

  const onPerson = (p: PersonSummary) => {
    if (p.contactId) return router.push({ pathname: '/aile/kisi/[id]', params: { id: p.contactId } });
    if (p.source === 'me')
      return Alert.alert('Durumunu bildir', 'Acil durum kişilerine SMS hazırlanır.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Yardım lazım', style: 'destructive', onPress: fam.confirmHelp },
        { text: 'Güvendeyim', onPress: () => fam.sendStatus('safe') },
      ]);
  };

  // Uzun basma: kişi sayfasına girmeden en sık işlemler
  const quickActions = (p: PersonSummary) => {
    const c = p.contactId ? fam.contacts.find((x) => x.id === p.contactId) : null;
    if (!c) return onPerson(p);
    const mark = (kind: 'safe' | 'home' | 'help', label: string) => {
      fam.setContactStatus([c.id], kind);
      toast.show({ text: `${c.relation || c.name}: ${label} olarak işaretlendi` });
    };
    Alert.alert(c.relation || c.name, formatPhone(c.phone), [
      { text: 'Ara', onPress: () => callPhone(c.phone) },
      {
        text: 'Durum sor (SMS)',
        onPress: async () => {
          const r = await sendSms([c.phone], ASK_STATUS_MESSAGE);
          if (r.ok && r.status !== 'cancelled') fam.setContactStatus([c.id], 'waiting');
        },
      },
      { text: 'Güvende işaretle', onPress: () => mark('safe', 'Güvende') },
      { text: 'Evde işaretle', onPress: () => mark('home', 'Evde') },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  const askLocation = async () => {
    if (!fam.contacts.length)
      return Alert.alert('Acil durum kişisi yok', 'Önce aile üyesi ekleyin.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Üye ekle', onPress: () => router.push('/aile/ekle') },
      ]);
    const r = await sendSms(
      fam.contacts.map((c) => c.phone),
      LOCATION_REQUEST_MESSAGE,
    );
    if (!r.ok) Alert.alert('Gönderilemedi', r.reason);
  };

  const nameOf = (p: PersonSummary) => {
    if (p.source === 'me') return 'Ben';
    const c = p.contactId ? fam.contacts.find((x) => x.id === p.contactId) : null;
    return c?.relation || p.name;
  };

  const ACTIONS = [
    {
      key: 'sor',
      title: 'Durum Sor',
      sub: 'Herkese mesaj gönder',
      icon: 'chatbubble-ellipses',
      color: '#12A37F',
      onPress: fam.askEveryone,
    },
    { key: 'acil', title: 'Acil Bildirim', sub: 'Herkese uyarı gönder', icon: 'warning', color: '#E5484D', onPress: fam.confirmHelp },
    { key: 'konum', title: 'Konum İste', sub: 'SMS ile konum sor', icon: 'location', color: '#2F7CF6', onPress: askLocation },
    { key: 'ara', title: 'Arama Yap', sub: 'Aile üyelerini ara', icon: 'call', color: '#7C5CF6', onPress: () => router.push('/arama') },
  ];

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.textSecondary}
          onRefresh={async () => {
            setRefreshing(true);
            await family.reload();
            setRefreshing(false);
          }}
        />
      }
      contentContainerStyle={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.md,
        paddingBottom: tabBarHeight + spacing.xl,
        gap: spacing.sm + 4,
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
      }}
    >
      {/* Başlık */}
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <AppText variant="display" accessibilityRole="header" style={{ fontSize: 30, lineHeight: 36 }}>
            Ailem
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={{ fontSize: 13.5 }}>
            Sevdiklerinizin güvenliği her zaman sizinle.
          </AppText>
        </View>
        <Pressable
          onPress={() => router.push('/aile/ekle')}
          accessibilityRole="button"
          accessibilityLabel="Üye ekle"
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="person-add" size={18} color={colors.text} />
          <AppText variant="heading" color={colors.text} style={{ fontSize: 14 }}>
            Üye Ekle
          </AppText>
        </Pressable>
      </View>

      {/* Üyeler */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap }} style={{ marginHorizontal: -2 }}>
        {people.map((p, i) => {
          const c = p.contactId ? fam.contacts.find((x) => x.id === p.contactId) : null;
          const sub = p.source === 'me' ? 'Ben' : p.at ? relativeTimeTr(p.at) : c ? formatPhone(c.phone) : '—';
          return (
            <Pressable
              key={p.key}
              onPress={() => onPerson(p)}
              onLongPress={() => quickActions(p)}
              accessibilityRole="button"
              accessibilityLabel={`${nameOf(p)}: ${p.label}${p.at ? `, ${relativeTimeTr(p.at)}` : ''}`}
              accessibilityHint={c ? 'Uzun basınca arama ve durum seçenekleri' : undefined}
              style={({ pressed }) => [
                styles.member,
                { width: Math.max(cellW, 84) },
                i === 0 && { borderColor: colors.safe, borderWidth: 1.5 },
                pressed && { opacity: 0.88 },
              ]}
            >
              <Avatar
                name={p.source === 'me' ? profile.name || 'Ben' : p.name}
                uri={p.source === 'me' ? profile.photoUri : p.photoUri}
                size={50}
                status={p.status}
                ring={p.color}
              />
              <AppText variant="heading" numberOfLines={1} style={{ fontSize: 13.5 }}>
                {nameOf(p)}
              </AppText>
              <AppText variant="caption" numberOfLines={1} style={{ fontSize: 10.5 }}>
                {p.source === 'me' ? profile.name || 'Durum bildir' : sub}
              </AppText>
              <View style={styles.statusRow}>
                <Ionicons name={STATUS_ICON[p.status ?? 'unknown'] as never} size={12} color={p.color} />
                <AppText variant="caption" color={p.color} numberOfLines={1} style={{ fontSize: 10.5, fontWeight: '600', flexShrink: 1 }}>
                  {p.label}
                </AppText>
              </View>
            </Pressable>
          );
        })}
        {fam.loaded && fam.contacts.length === 0 ? (
          <Pressable
            onPress={() => router.push('/aile/ekle')}
            accessibilityRole="button"
            accessibilityLabel="Aile üyesi ekle"
            style={({ pressed }) => [styles.member, styles.addMember, { width: Math.max(cellW, 84) }, pressed && { opacity: 0.88 }]}
          >
            <View style={styles.addCircle}>
              <Ionicons name="add" size={26} color={colors.primary} />
            </View>
            <AppText variant="heading" style={{ fontSize: 13 }}>
              Üye ekle
            </AppText>
            <AppText variant="caption" style={{ fontSize: 10, textAlign: 'center' }}>
              Telefon numarasıyla
            </AppText>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Durum bandı */}
      <Pressable
        onPress={onBanner}
        accessibilityRole="button"
        accessibilityLabel={`${bannerTitle}. ${bannerSub}`}
        style={({ pressed }) => [
          styles.banner,
          { borderColor: alpha(bannerTone, 0.8), backgroundColor: alpha(bannerTone, 0.1) },
          pressed && { opacity: 0.9 },
        ]}
      >
        <Ionicons name={counts.help ? 'alert-circle' : 'shield-checkmark'} size={38} color={bannerTone} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading" style={{ fontSize: 15 }}>
            {bannerTitle}
          </AppText>
          <AppText variant="caption" style={{ fontSize: 11.5 }}>
            {bannerSub}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>

      {/* Aile haritası */}
      <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
        <View style={styles.mapHead}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading" style={{ fontSize: 17 }}>
              Aile Haritası
            </AppText>
            <AppText variant="caption" style={{ fontSize: 11.5 }}>
              Aile üyelerinizin son konumlarını görün.
            </AppText>
          </View>
          <Pressable
            onPress={() => router.push('/harita')}
            accessibilityRole="button"
            accessibilityLabel="Haritayı Aç"
            style={({ pressed }) => [styles.mapBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="map" size={15} color={colors.text} />
            <AppText variant="label" color={colors.text} style={{ fontWeight: '700', fontSize: 12 }}>
              Haritayı Aç
            </AppText>
            <Ionicons name="chevron-forward" size={14} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.mapBox}>
          {hasMap ? (
            <>
              <QuakeMap
                ref={mapRef}
                mapStyle={settings.mapStyle}
                events={[]}
                focus={null}
                reports={[]}
                assemblyPoints={meeting}
                family={pins}
                user={null}
                userIsPrecise={location.status === 'granted'}
                layers={{ ...DEFAULT_LAYERS, rings: false }}
                onSelect={() => router.push('/aile/bulusma')}
                initialCenter={userCoords ?? meeting[0] ?? undefined}
                initialZoom={12}
              />
              <Pressable
                onPress={() => (userCoords ? mapRef.current?.flyTo(userCoords, 13) : router.push('/konum'))}
                accessibilityRole="button"
                accessibilityLabel="Konumuma git"
                style={styles.locate}
              >
                <Ionicons name="locate" size={22} color={colors.text} />
              </Pressable>
              {!sharedLocations ? (
                <View style={styles.mapNote} pointerEvents="none">
                  <AppText variant="caption" color={colors.text} style={{ fontSize: 10.5 }}>
                    Aile üyelerinin konumu yalnızca çevrimiçi grupta ve kendi izinleriyle görünür.
                  </AppText>
                </View>
              ) : null}
            </>
          ) : (
            <Pressable onPress={() => router.push('/konum')} accessibilityRole="button" style={styles.mapEmpty}>
              <Ionicons name="map-outline" size={26} color={colors.textSecondary} />
              <AppText variant="caption" style={{ textAlign: 'center', fontSize: 12 }}>
                Konumunuz belirlendiğinde, buluşma noktası eklediğinizde veya çevrimiçi aile grubundaki kişiler konum paylaştığında harita
                burada görünür.
              </AppText>
            </Pressable>
          )}
        </View>
      </View>

      {/* Hızlı eylemler */}
      <View style={{ flexDirection: 'row', gap }}>
        {ACTIONS.map((a) => (
          <Pressable
            key={a.key}
            onPress={a.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${a.title}. ${a.sub}`}
            style={({ pressed }) => [styles.action, { width: cellW }, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: a.color }]}>
              <Ionicons name={a.icon as never} size={20} color="#fff" />
            </View>
            <AppText variant="heading" numberOfLines={1} style={{ fontSize: cellW < 80 ? 11.5 : 13 }}>
              {a.title}
            </AppText>
            <AppText variant="caption" style={{ fontSize: cellW < 80 ? 9.5 : 10.5, lineHeight: cellW < 80 ? 12 : 13.5 }}>
              {a.sub}
            </AppText>
          </Pressable>
        ))}
      </View>

      {/* Buluşma noktası */}
      <View style={styles.meet}>
        <GuideImage img="family-plan" style={styles.meetArt} />
        <View style={{ flex: 1, gap: 3 }}>
          <AppText variant="heading" style={{ fontSize: 14.5 }}>
            Buluşma Noktamız
          </AppText>
          <AppText variant="caption" numberOfLines={2} style={{ fontSize: 11.5, lineHeight: 15 }}>
            {fam.meetingPoint ? fam.meetingPoint.name : 'Acil durumda buluşacağınız güvenli alanı belirleyin.'}
          </AppText>
        </View>
        <Pressable
          onPress={() => router.push('/aile/bulusma')}
          accessibilityRole="button"
          accessibilityLabel={fam.meetingPoint ? 'Buluşma noktasını değiştir' : 'Buluşma noktasını belirle'}
          style={({ pressed }) => [styles.meetBtn, pressed && { opacity: 0.85 }]}
        >
          <AppText variant="label" color="#fff" style={{ fontWeight: '700' }}>
            {fam.meetingPoint ? 'Değiştir' : 'Belirle'}
          </AppText>
          <Ionicons name="chevron-forward" size={15} color="#fff" />
        </Pressable>
      </View>

      {/* Acil durum kişileri */}
      <SectionHead
        title="Acil Durum Kişileri"
        action={fam.contacts.length ? 'Düzenle' : 'Ekle'}
        onAction={() => router.push('/aile/ekle')}
      />
      <View style={styles.card}>
        {fam.contacts.length ? (
          fam.contacts.map((c, i) => (
            <View key={c.id} style={[styles.contact, i > 0 && styles.divider]}>
              <Pressable
                onPress={() => router.push({ pathname: '/aile/kisi/[id]', params: { id: c.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${c.relation || c.name}, ${formatPhone(c.phone)}. Düzenle`}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
              >
                <Avatar name={c.name} uri={c.photoUri} size={44} />
                <View style={{ flex: 1 }}>
                  <AppText variant="heading" numberOfLines={1} style={{ fontSize: 14 }}>
                    {c.relation || c.name}
                  </AppText>
                  <AppText variant="caption" numberOfLines={1} style={{ fontSize: 12 }}>
                    {formatPhone(c.phone)}
                  </AppText>
                </View>
              </Pressable>
              <Pressable
                onPress={() => callPhone(c.phone)}
                accessibilityRole="button"
                accessibilityLabel={`${c.relation || c.name}: ara`}
                style={[styles.round, { backgroundColor: '#12A37F' }]}
              >
                <Ionicons name="call" size={18} color="#fff" />
              </Pressable>
              <Pressable
                onPress={async () => {
                  const r = await sendSms([c.phone], ASK_STATUS_MESSAGE);
                  if (r.ok && r.status !== 'cancelled') fam.setContactStatus([c.id], 'waiting');
                }}
                accessibilityRole="button"
                accessibilityLabel={`${c.relation || c.name}: SMS ile durum sor`}
                style={[styles.round, { backgroundColor: '#2F7CF6' }]}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => fam.shareLocation([c.id])}
                accessibilityRole="button"
                accessibilityLabel={`${c.relation || c.name}: konumumu gönder`}
                style={[styles.round, { backgroundColor: '#E5484D' }]}
              >
                <Ionicons name="location" size={18} color="#fff" />
              </Pressable>
            </View>
          ))
        ) : (
          <Pressable onPress={() => router.push('/aile/ekle')} accessibilityRole="button" style={styles.contact}>
            <Ionicons name="person-add-outline" size={24} color={colors.primary} />
            <AppText variant="caption" style={{ flex: 1, fontSize: 12.5 }}>
              Acil durumda aranacak ve SMS gönderilecek kişileri ekleyin (en fazla 10). Bilgiler yalnızca bu cihazda saklanır.
            </AppText>
          </Pressable>
        )}
      </View>

      {/* Aile acil durum planı */}
      <SectionHead
        title="Aile Acil Durum Planı"
        action="Görüntüle"
        onAction={() => router.push({ pathname: '/rehber/hazirlik', params: { grup: 'plan' } })}
      />
      <Pressable
        onPress={() => router.push({ pathname: '/rehber/hazirlik', params: { grup: 'plan' } })}
        accessibilityRole="button"
        accessibilityLabel="Aile planınızı oluşturun"
        style={({ pressed }) => [styles.card, styles.plan, pressed && { opacity: 0.88 }]}
      >
        <GuideImage img="checklist" style={styles.planArt} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading" style={{ fontSize: 14.5 }}>
            Aile planınızı oluşturun
          </AppText>
          <AppText variant="caption" style={{ fontSize: 11.5 }}>
            Buluşma noktası, iletişim yolu ve önemli belgeler (AFAD önerileri).
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </Pressable>

      <OnlineGroupSection state={family.state} reload={family.reload} />
      <AppText variant="caption" style={{ marginHorizontal: 4, fontSize: 11 }}>
        Uygulama kişilerin durumunu kendiliğinden bilemez: “Yanıtsız” durum sorduğunuzda, diğerleri siz işaretlediğinizde kaydedilir. Yanıt
        vermeyen kişi tehlikede sayılmaz.
      </AppText>
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: alpha(colors.primary, 0.14),
  },
  member: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: 6,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addMember: { justifyContent: 'center', borderStyle: 'dashed' },
  addCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(colors.primary, 0.14),
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: '100%' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1.5, borderRadius: 18, padding: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  mapHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 38,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  mapBox: { height: 150, backgroundColor: colors.mapPlaceholder },
  mapEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.md },
  locate: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(colors.surface, 0.94),
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  mapNote: {
    position: 'absolute',
    left: spacing.sm,
    right: 60,
    bottom: spacing.sm,
    padding: 6,
    borderRadius: 8,
    backgroundColor: alpha(colors.bg, 0.8),
  },
  action: {
    minHeight: 104,
    borderRadius: 16,
    padding: spacing.sm,
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  meet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  meetArt: { width: 84, height: 60, borderRadius: 12 },
  meetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  sectionBar: { width: 5, height: 24, borderRadius: 3, backgroundColor: colors.danger },
  headLink: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs + 2, paddingHorizontal: 4 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planArt: { width: 52, height: 52, borderRadius: 12 },
}));
