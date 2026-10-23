import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { Avatar, Icon, IconTile, ScreenHeader, accent } from '@/components/ds';
import { createInvite, inviteLink } from '@/features/family/api';
import { formatPhone } from '@/features/family/local';
import { OnlineGroupSection } from '@/features/family/OnlineGroupSection';
import { buildPeople, safeCount, STATUS_LABEL, type PersonSummary } from '@/features/family/people';
import { useFamily } from '@/features/family/useFamily';
import { useFamilyActions } from '@/features/family/useFamilyActions';
import { DEFAULT_LAYERS, QuakeMap, type FamilyPin, type QuakeMapHandle } from '@/features/map/QuakeMap';
import { useProfile } from '@/hooks/useProfile';
import { useApp } from '@/providers/AppProvider';
import { isBackendConfigured } from '@/services/env';
import { friendlyError } from '@/services/supabase';
import { colors, radius, spacing } from '@/theme';
import type { AssemblyPoint } from '@/types/assembly';
import { formatTimeTr, relativeTimeTr } from '@/utils/time';

function StatTile({ icon, color, value, label }: { icon: string; color: string; value: number; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <IconTile icon={icon} color={color} size={28} solid={color !== accent.gray} />
        <AppText variant="title" style={{ fontSize: 16, lineHeight: 19.5 }}>
          {value}
        </AppText>
      </View>
      <AppText variant="caption" numberOfLines={1} style={{ fontSize: 9.5 }}>
        {label}
      </AppText>
    </View>
  );
}

function StatusPill({ p }: { p: PersonSummary }) {
  return (
    <View style={[styles.pill, { borderColor: p.color + '88', backgroundColor: p.color + '22' }]}>
      <AppText variant="caption" color={p.color} style={{ fontSize: 10.5, fontWeight: '700' }}>
        {p.label}
      </AppText>
    </View>
  );
}

/** Ailem: aile üyelerinin durumu, izinli konumları, davet ve buluşma noktası. */
export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { userCoords, location, settings, session } = useApp();
  const family = useFamily();
  const fam = useFamilyActions();
  const { profile } = useProfile();
  const [view, setView] = useState<'map' | 'list'>('map');
  const mapRef = useRef<QuakeMapHandle>(null);

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

  // Harita: "Sen" + çevrimiçi gruptaki izinli konumlar + buluşma noktası. Yerel kişilerin konumu bilinmez.
  const pins: FamilyPin[] = useMemo(() => {
    const out: FamilyPin[] = [];
    if (userCoords) {
      const me = people[0]!;
      out.push({
        id: 'me',
        name: 'Sen',
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        at: new Date().toISOString(),
        stale: false,
        status: 'unknown',
        label: 'Sen',
      });
    }
    for (const p of people) {
      if (p.source === 'group' && p.location) {
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
      }
    }
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

  const bannerTone = counts.help ? colors.danger : counts.total && counts.safe === counts.total ? colors.safe : colors.warning;
  const bannerText = !counts.total
    ? 'Henüz aile üyesi eklemediniz'
    : counts.help
      ? `${counts.help} kişi yardım istiyor`
      : `Ailende ${counts.total} kişiden ${counts.safe}’${counts.safe === 1 ? 'i' : 'si'} güvende`;

  const onBanner = () =>
    Alert.alert('Ailene haber ver', 'SMS, telefonunuzun mesaj uygulamasında hazırlanır.', [
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

  const invite = async () => {
    if (!isBackendConfigured()) {
      return Alert.alert(
        'Davet bağlantısı',
        'Davet bağlantısı çevrimiçi aile grubu gerektirir; bu kurulumda sunucu yapılandırılmadı. Aile üyelerini telefon numarasıyla ekleyip SMS ile haberleşebilirsiniz.',
        [
          { text: 'Tamam', style: 'cancel' },
          { text: 'Üye ekle', onPress: () => router.push('/aile/ekle') },
        ],
      );
    }
    if (!session) return router.push('/giris');
    const owned = groups.find((g) => g.members.some((m) => m.userId === myUserId && m.role === 'owner'));
    if (!owned)
      return Alert.alert(
        'Önce grup oluşturun',
        'Davet bağlantısı için sayfanın altındaki “Çevrimiçi aile grubu” bölümünden bir grup oluşturun.',
      );
    try {
      const inv = await createInvite(owned.id);
      await Share.share({
        message: `GÜVENDE aile grubuna katıl (“${owned.name}”). Bağlantı 48 saat geçerlidir ve bir kez kullanılabilir: ${inviteLink(inv.token)}`,
      });
    } catch (e) {
      Alert.alert('Davet oluşturulamadı', friendlyError(e));
    }
  };

  const memberRow = (p: PersonSummary, i: number) => {
    const contact = p.contactId ? fam.contacts.find((c) => c.id === p.contactId) : null;
    const name = p.source === 'me' ? 'Sen' : (contact?.relation ?? p.name);
    const sub =
      p.source === 'me'
        ? profile.name || 'Durumunu bildirmek için dokun'
        : contact
          ? `${contact.relation ? `${contact.name} · ` : ''}${formatPhone(contact.phone)}`
          : 'Çevrimiçi aile grubu';
    const shown = p.source === 'me' && p.status === 'safe' ? { ...p, label: 'Güvendesin' } : p;
    return (
      <Pressable
        key={p.key}
        onPress={() => onPerson(p)}
        accessibilityRole="button"
        accessibilityLabel={`${name}: ${shown.label}${p.at ? `, ${relativeTimeTr(p.at)}` : ''}`}
        style={[styles.member, i > 0 && styles.divider]}
      >
        <Avatar
          name={p.source === 'me' ? profile.name || 'Sen' : p.name}
          uri={p.source === 'me' ? profile.photoUri : p.photoUri}
          size={46}
          status={p.status}
          ring={p.color}
        />
        <View style={{ flex: 1 }}>
          <AppText variant="heading" numberOfLines={1} style={{ fontSize: 14 }}>
            {name}
          </AppText>
          <AppText variant="label" numberOfLines={1} style={{ fontSize: 11.5 }}>
            {sub}
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <StatusPill p={shown} />
          <AppText variant="caption">{p.at ? relativeTimeTr(p.at) : ' '}</AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </Pressable>
    );
  };

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
        title="Ailem"
        subtitle="Sevdiklerinizin durumunu takip edin."
        right={
          <Pressable
            onPress={() => router.push('/aile/ekle')}
            accessibilityRole="button"
            accessibilityLabel="Üye ekle"
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="person-add" size={20} color={colors.primary} />
            <AppText variant="heading" color={colors.text} style={{ fontSize: 13 }}>
              Üye Ekle
            </AppText>
          </Pressable>
        }
      />

      <Pressable
        onPress={onBanner}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.banner,
          { borderColor: bannerTone + '99', backgroundColor: bannerTone + '1A' },
          pressed && { opacity: 0.9 },
        ]}
      >
        <Icon name={counts.help ? 'alert-circle' : 'shield-checkmark'} size={34} color={bannerTone} />
        <View style={{ flex: 1 }}>
          <AppText variant="heading" color={bannerTone} style={{ fontSize: 15 }}>
            {bannerText}
          </AppText>
          <AppText variant="caption">
            {counts.lastAt ? `Son güncelleme: ${formatTimeTr(counts.lastAt)}` : 'Durum sormak veya bildirmek için dokunun'}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>

      {/* Harita / Liste */}
      <View style={styles.mapCard}>
        {view === 'map' ? (
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
            initialCenter={userCoords ?? undefined}
            initialZoom={userCoords ? 11.5 : 5}
          />
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 56, paddingHorizontal: spacing.sm }}>
            {people.map(memberRow)}
          </ScrollView>
        )}
        <View style={styles.segment} accessibilityRole="tablist">
          {(['map', 'list'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              accessibilityRole="tab"
              accessibilityLabel={v === 'map' ? 'Aile haritası' : 'Aile listesi'}
              accessibilityState={{ selected: view === v }}
              style={[styles.segBtn, view === v && styles.segOn]}
            >
              <Ionicons name={v === 'map' ? 'map-outline' : 'list-outline'} size={16} color={view === v ? '#fff' : colors.textSecondary} />
              <AppText variant="label" color={view === v ? '#fff' : colors.textSecondary}>
                {v === 'map' ? 'Harita' : 'Liste'}
              </AppText>
            </Pressable>
          ))}
        </View>
        {view === 'map' ? (
          <>
            <View style={styles.mapCtrls}>
              <Pressable
                onPress={() => (userCoords ? mapRef.current?.flyTo(userCoords, 13) : router.push('/konum'))}
                accessibilityRole="button"
                accessibilityLabel="Konumuma git"
                style={styles.ctrl}
              >
                <Ionicons name="navigate-outline" size={22} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => router.push('/gizlilik')}
                accessibilityRole="button"
                accessibilityLabel="Konum paylaşımı ayarları"
                style={styles.ctrl}
              >
                <Ionicons name="layers" size={22} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => router.push('/harita')}
                accessibilityRole="button"
                accessibilityLabel="Büyük harita"
                style={styles.ctrl}
              >
                <Ionicons name="scan-outline" size={22} color={colors.text} />
              </Pressable>
            </View>
            {!sharedLocations ? (
              <View style={styles.mapNote} pointerEvents="none">
                <AppText variant="caption" color={colors.text} style={{ textAlign: 'center' }}>
                  Aile üyelerinin konumu yalnızca çevrimiçi grupta ve kendi izinleriyle görünür.
                </AppText>
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      <View style={styles.stats}>
        <StatTile icon="shield-checkmark" color={accent.green} value={counts.safe} label="Güvende" />
        <StatTile
          icon="warning"
          color={accent.red}
          value={counts.waiting + counts.help}
          label={counts.help ? 'Yardım/Cevap' : 'Cevap yok'}
        />
        <StatTile icon="home" color={accent.gray} value={counts.home} label="Evde" />
        <StatTile icon="person-add" color={accent.gray} value={counts.total} label="Toplam" />
      </View>

      <View style={styles.sectionHead}>
        <AppText variant="title" style={{ fontSize: 19.5, flex: 1 }}>
          Aile Üyeleri
        </AppText>
        <Pressable onPress={fam.askEveryone} accessibilityRole="button" style={{ padding: 4 }}>
          <AppText variant="label" color={colors.primary}>
            Herkese durum sor ›
          </AppText>
        </Pressable>
      </View>
      <View style={styles.list}>
        {people.map(memberRow)}
        {fam.loaded && fam.contacts.length === 0 ? (
          <Pressable onPress={() => router.push('/aile/ekle')} style={[styles.member, styles.divider]} accessibilityRole="button">
            <IconTile icon="person-add-outline" color={accent.blue} size={52} />
            <AppText variant="label" style={{ flex: 1 }}>
              Aile üyesi ekleyin; durumlarını SMS ile sorup burada takip edin.
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <AppText variant="caption" style={{ marginHorizontal: 4 }}>
        Uygulama kişilerin durumunu kendiliğinden bilemez: “Cevap yok” durum sorduğunuzda, diğerleri siz işaretlediğinizde kaydedilir. Yanıt
        vermeyen kişi tehlikede sayılmaz.
      </AppText>

      <View style={styles.actions}>
        <Pressable onPress={invite} accessibilityRole="button" style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}>
          <IconTile icon="qr-code-outline" color={accent.gray} size={40} />
          <View style={{ flex: 1 }}>
            <AppText variant="heading" style={{ fontSize: 13 }}>
              Davet Linki Oluştur
            </AppText>
            <AppText variant="caption" numberOfLines={2}>
              Aileni kolayca davet et
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/aile/bulusma')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}
        >
          <IconTile icon="people" color={accent.gray} size={40} />
          <View style={{ flex: 1 }}>
            <AppText variant="heading" style={{ fontSize: 13 }}>
              Toplanma Noktası
            </AppText>
            <AppText variant="caption" numberOfLines={2}>
              {fam.meetingPoint ? fam.meetingPoint.name : 'Herkes için buluşma yeri belirle'}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <OnlineGroupSection state={family.state} reload={family.reload} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 46,
  },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  mapCard: {
    height: 220,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#0A1824',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  segment: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    backgroundColor: 'rgba(7,21,34,0.92)',
    borderRadius: radius.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  segBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, minHeight: 36, borderRadius: radius.pill },
  segOn: { backgroundColor: colors.primary },
  mapCtrls: { position: 'absolute', right: spacing.sm, top: spacing.sm, gap: spacing.xs + 2 },
  ctrl: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(8,20,33,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(60,90,120,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapNote: {
    position: 'absolute',
    left: spacing.md,
    right: 64,
    bottom: spacing.md,
    backgroundColor: colors.overlay,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  stats: { flexDirection: 'row', gap: spacing.xs + 2 },
  stat: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    minHeight: 60,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.sm,
  },
  member: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingVertical: 6 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  pill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    padding: spacing.md,
  },
});
