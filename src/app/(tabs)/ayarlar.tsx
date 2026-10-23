import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '@/components/Toast';
import { AppText } from '@/components/ui';
import { Avatar, BellButton, Icon } from '@/components/ds';
import { formatPhone, loadContacts } from '@/features/family/local';
import { MAP_STYLE_OPTIONS } from '@/features/map/mapStyle';
import { useTrust } from '@/features/trust/TrustProvider';
import { useProfile } from '@/hooks/useProfile';
import { useApp } from '@/providers/AppProvider';
import { useInbox } from '@/providers/InboxProvider';
import { clearAll, clearCaches } from '@/services/storage';
import { alpha, colors, radius, spacing, themedStyles } from '@/theme';

type RowProps = {
  icon: string;
  color: string;
  solid?: boolean;
  title: string;
  subtitle?: string;
  value?: string;
  valueColor?: string;
  inline?: boolean;
  danger?: boolean;
  onPress: () => void;
  first?: boolean;
};

function Row({ icon, color, solid, title, subtitle, value, valueColor, inline, danger, onPress, first }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, value].filter(Boolean).join('. ')}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && { opacity: 0.8 }]}
    >
      <View style={[styles.icon, { backgroundColor: solid ? color : alpha(colors.textSecondary, 0.14) }]}>
        <Icon name={icon} size={20} color={solid ? '#fff' : colors.text} />
      </View>
      {inline ? (
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <AppText variant="heading" style={{ fontSize: 14.5 }}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" numberOfLines={1} style={{ flex: 1, fontSize: 12 }}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : (
        <View style={{ flex: 1, gap: 1 }}>
          <AppText variant="heading" color={danger ? colors.danger : colors.text} style={{ fontSize: 14.5 }}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" style={{ fontSize: 12 }}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      )}
      {value ? (
        <AppText variant="label" color={valueColor ?? colors.textSecondary} style={{ fontSize: 13 }}>
          {value}
        </AppText>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

function Section({ title, bar, onPress, children }: { title: string; bar: string; onPress?: () => void; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'header'} style={styles.sectionHead}>
        <View style={[styles.bar, { backgroundColor: bar }]} />
        <AppText variant="heading" style={{ flex: 1, fontSize: 18 }}>
          {title}
        </AppText>
        {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /> : null}
      </Pressable>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

/** Ayarlar sekmesi: acil durum ayarları önce; tercihler, veri/gizlilik, hesap ve hakkında. */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const toast = useToast();
  const { settings, session } = useApp();
  const { trust } = useTrust();
  const { unread } = useInbox();
  const { profile } = useProfile();
  const [contactCount, setContactCount] = useState(0);

  useEffect(() => {
    loadContacts().then((c) => setContactCount(c.length));
  }, [profile]);

  const version = Constants.expoConfig?.version ?? '—';
  const mapLabel = MAP_STYLE_OPTIONS.find((m) => m.id === settings.mapStyle)?.label ?? 'Koyu';
  const displayName = profile.name || (session?.user.email ? session.user.email.split('@')[0]! : '');
  const notifOn = settings.quakeNotifications || settings.officialNotifications || settings.familyNotifications;
  const themeLabel = settings.theme === 'system' ? 'Sistem' : settings.theme === 'light' ? 'Açık' : 'Koyu';

  const textSize = () =>
    Alert.alert(
      'Yazı boyutu',
      'GÜVENDE telefonunuzun yazı boyutu ayarını izler. Değiştirmek için: iPhone’da Ayarlar › Ekran ve Parlaklık › Metin Boyutu; Android’de Ayarlar › Ekran › Yazı tipi boyutu.',
    );
  const language = () => Alert.alert('Dil', 'GÜVENDE şu an yalnızca Türkçe kullanılabilir.');
  const offline = () =>
    Alert.alert(
      'Çevrimdışı veriler',
      'Acil durum rehberi, Enkaz Altı Modu ve temel Türkiye haritası uygulamayla birlikte yüklüdür; ayrıca indirme gerekmez. Son açılan deprem kayıtları ve toplanma alanları da cihazda saklanır. Ayrıntılı sokak haritası internet gerektirir.',
    );
  const storage = () =>
    Alert.alert(
      'Önbelleği temizle',
      'Cihazda saklanan deprem listesi, toplanma alanı ve fay hattı önbellekleri silinir; internet varken yeniden indirilir. Kişileriniz, ayarlarınız, favorileriniz ve hazırlık listeniz korunur.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Temizle',
          onPress: async () => {
            const n = await clearCaches(['quake-cache', 'feed-cache', 'fault-lines', 'ap-tiles-index', 'ap-tiles-version'], ['ap-tile:']);
            toast.show({ text: `Önbellek temizlendi (${n} kayıt)` });
          },
        },
      ],
    );
  const wipe = () =>
    Alert.alert(
      'Tüm verileri temizle',
      'Bu cihazdaki GÜVENDE verileri kalıcı olarak silinir: acil durum kişileri, profil, buluşma noktası, hazırlık listesi, favoriler, ayarlar ve önbellekler. Bu işlem geri alınamaz. Sunucudaki hesabınız silinmez (Hesap ekranından yönetilir).',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Tümünü sil',
          style: 'destructive',
          onPress: async () => {
            await clearAll();
            Alert.alert('Veriler silindi', 'Değişikliklerin tamamen uygulanması için uygulamayı kapatıp yeniden açın.');
          },
        },
      ],
    );

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.md,
        paddingBottom: tabBarHeight + spacing.xl,
        gap: spacing.md,
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
      }}
    >
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <AppText variant="display" accessibilityRole="header" style={{ fontSize: 30, lineHeight: 36 }}>
            Ayarlar
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={{ fontSize: 13.5 }}>
            Uygulamanızı ihtiyaçlarınıza göre özelleştirin.
          </AppText>
        </View>
        <BellButton count={unread} onPress={() => router.push('/bildirimler')} />
      </View>

      {/* Profil */}
      <Pressable
        onPress={() => router.push('/profil')}
        accessibilityRole="button"
        accessibilityLabel={displayName ? `Profil: ${displayName}. Düzenle` : 'Profilinizi oluşturun'}
        style={({ pressed }) => [styles.profile, pressed && { opacity: 0.88 }]}
      >
        <View>
          {displayName || profile.photoUri ? (
            <Avatar name={displayName || '?'} uri={profile.photoUri} size={64} />
          ) : (
            <View style={styles.emptyAvatar}>
              <Ionicons name="person" size={32} color="#fff" />
            </View>
          )}
          <View style={styles.camBadge}>
            <Ionicons name="camera" size={13} color="#fff" />
          </View>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <AppText variant="heading" numberOfLines={1} style={{ fontSize: 17 }}>
            {displayName || 'Profilinizi oluşturun'}
          </AppText>
          <AppText variant="caption" style={{ fontSize: 12 }}>
            {displayName
              ? [profile.phone ? formatPhone(profile.phone) : null, 'Bilgileriniz bu cihazda saklanır.'].filter(Boolean).join(' · ')
              : 'Ad, fotoğraf ve temel bilgilerinizi ekleyin. Verileriniz bu cihazda saklanır.'}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>

      <Section title="Acil Durum Ayarları" bar={colors.danger} onPress={() => router.push('/acil-araclar')}>
        <Row
          first
          solid
          icon="call"
          color="#E5484D"
          title="Acil arama ayarları"
          subtitle="112, arıza hatları ve 112’ye okunacak adresiniz"
          onPress={() => router.push('/arama')}
        />
        <Row
          solid
          icon="notifications"
          color="#F08C2E"
          title="Acil durum bildirimleri"
          subtitle="Deprem, resmî duyuru ve aile bildirimleri"
          value={notifOn ? 'Açık' : 'Kapalı'}
          valueColor={notifOn ? colors.safe : colors.textSecondary}
          onPress={() => router.push('/bildirim-ayarlari')}
        />
        <Row
          solid
          icon="location"
          color="#2F7CF6"
          title="Konum paylaşımı"
          subtitle="Ailenizle konumunuzu paylaşın"
          value={settings.locationSharing ? 'Açık' : 'Kapalı'}
          valueColor={settings.locationSharing ? colors.safe : colors.textSecondary}
          onPress={() => router.push('/gizlilik')}
        />
        <Row
          solid
          icon="people"
          color="#7C5CF6"
          title="Acil durum kişileri"
          subtitle="Aranacak ve SMS gönderilecek kişiler"
          value={`${contactCount} kişi`}
          onPress={() => router.push('/ailem')}
        />
        <Row
          solid
          icon="mci:bag-personal"
          color="#12A37F"
          title="Acil durum çantası"
          subtitle="Kontrol listesi"
          onPress={() => router.push('/canta')}
        />
      </Section>

      <Section title="Uygulama Tercihleri" bar={colors.primary}>
        <Row
          first
          icon="color-palette"
          color={colors.text}
          title="Tema"
          subtitle="Koyu / Açık / Sistem"
          value={themeLabel}
          onPress={() => router.push('/tercihler')}
        />
        <Row icon="text" color={colors.text} title="Yazı boyutu" subtitle="Telefonunuzun ayarını izler" value="Sistem" onPress={textSize} />
        <Row icon="globe-outline" color={colors.text} title="Dil" subtitle="Uygulama dili" value="Türkçe" onPress={language} />
        <Row
          icon="map-outline"
          color={colors.text}
          title="Harita ayarları"
          subtitle="Harita görünümü"
          value={mapLabel}
          onPress={() => router.push('/tercihler')}
        />
        <Row
          icon="notifications-outline"
          color={colors.text}
          title="Bildirim tercihleri"
          subtitle="Hangi bildirimleri almak istediğinizi seçin"
          onPress={() => router.push('/bildirim-ayarlari')}
        />
      </Section>

      <Section title="Veri ve Gizlilik" bar={colors.safe}>
        <Row
          first
          solid
          icon="shield-checkmark"
          color="#12A37F"
          title="Gizlilik"
          subtitle="Konum izni, paylaşım ve verilerinizin kullanımı"
          onPress={() => router.push('/gizlilik')}
        />
        <Row
          icon="cloud-offline-outline"
          color={colors.text}
          title="Çevrimdışı veriler"
          subtitle="İnternetsiz çalışan bölümler"
          onPress={offline}
        />
        <Row icon="layers-outline" color={colors.text} title="Depolama yönetimi" subtitle="Önbelleği temizleyin" onPress={storage} />
        <Row
          icon="trash-outline"
          color={colors.text}
          title="Tüm verileri temizle"
          subtitle="Cihazdaki uygulama verilerini silin"
          danger
          onPress={wipe}
        />
      </Section>

      <Section title="Hesap ve Güvenlik" bar="#F08C2E">
        <Row
          first
          icon="person-circle-outline"
          color={colors.text}
          title="Hesap"
          subtitle={session ? 'Giriş yapıldı' : 'Giriş yapılmadı'}
          onPress={() => router.push('/hesap')}
        />
        <Row
          icon="finger-print"
          color={colors.text}
          title="Giriş ve güvenlik"
          subtitle="Biyometrik kilit, oturumlar"
          value={settings.biometricLock ? 'Kilit açık' : undefined}
          onPress={() => router.push('/guvenlik')}
        />
        <Row
          icon="id-card-outline"
          color={colors.text}
          title="Kimlik doğrulama"
          subtitle="Olay bildirimi ve oylama için"
          value={trust?.verified ? (trust.role === 'user' ? 'Doğrulandı' : 'Kurumsal') : 'Doğrulanmadı'}
          valueColor={trust?.verified ? colors.safe : colors.caution}
          onPress={() => router.push('/kimlik')}
        />
        <Row
          icon="shield-half-outline"
          color={colors.text}
          title="Bilgi güvenliği"
          subtitle="Sahte ihbara karşı kurallar"
          onPress={() => router.push('/guven')}
        />
      </Section>

      <Section title="Hakkında" bar="#7C5CF6">
        <Row
          first
          inline
          icon="information-circle"
          color={colors.text}
          title="Sürüm"
          subtitle={`GÜVENDE v${version}`}
          onPress={() => router.push('/hakkinda')}
        />
        <Row
          inline
          icon="book"
          color={colors.text}
          title="Kaynaklar"
          subtitle="AFAD ve resmî kaynaklar"
          onPress={() => router.push('/rehber/kaynaklar')}
        />
        <Row
          inline
          icon="help-circle"
          color={colors.text}
          title="Yardım"
          subtitle="Sık sorulan sorular"
          onPress={() => router.push('/yardim')}
        />
        <Row
          inline
          icon="chatbox-ellipses"
          color={colors.text}
          title="Geri bildirim"
          subtitle="Öneri ve hata bildirimi gönderin"
          onPress={() => router.push('/geri-bildirim')}
        />
      </Section>
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1F6FE5', alignItems: 'center', justifyContent: 'center' },
  camBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 28 },
  bar: { width: 5, height: 24, borderRadius: 3 },
  group: { borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, minHeight: 58, paddingVertical: spacing.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
}));
