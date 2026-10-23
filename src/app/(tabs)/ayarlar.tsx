import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { useTrust } from '@/features/trust/TrustProvider';
import { Avatar, BellButton, ListRow, QuickCard, RowGroup, ScreenHeader, SectionCard, ToggleRow, accent } from '@/components/ds';
import { formatPhone, loadContacts } from '@/features/family/local';
import { MAP_STYLE_OPTIONS } from '@/features/map/mapStyle';
import { authenticate, biometricAvailability } from '@/features/settings/BiometricGate';
import { NotificationToggles } from '@/features/settings/NotificationToggles';
import { useAreaLabel } from '@/hooks/useAreaLabel';
import { useProfile } from '@/hooks/useProfile';
import { useApp } from '@/providers/AppProvider';
import { useInbox } from '@/providers/InboxProvider';
import { colors, radius, spacing, themedStyles } from '@/theme';
import { Alert } from 'react-native';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { settings, updateSettings, session, userCoords } = useApp();
  const { trust } = useTrust();
  const { unread } = useInbox();
  const { profile } = useProfile();
  const area = useAreaLabel();
  const [contactCount, setContactCount] = useState(0);
  // İki sütunlu satır grupları yalnızca geniş ekranlarda; dar telefonda alt alta.
  // İki sütun yalnızca tablet genişliğinde; telefonda satırlar tam genişlikte okunaklı kalır.
  const wide = useWindowDimensions().width >= 700;

  useEffect(() => {
    loadContacts().then((c) => setContactCount(c.length));
  }, [profile]);

  const toggleBiometric = async (v: boolean) => {
    if (!v) {
      if (await authenticate('Uygulama kilidini kapatmak için doğrulayın')) updateSettings({ biometricLock: false });
      return;
    }
    const a = await biometricAvailability();
    if (!a.ok) return Alert.alert('Biyometrik giriş kullanılamıyor', a.reason);
    if (await authenticate('Uygulama kilidini açmak için doğrulayın')) updateSettings({ biometricLock: true });
  };

  const version = Constants.expoConfig?.version ?? '—';
  const mapLabel = MAP_STYLE_OPTIONS.find((m) => m.id === settings.mapStyle)?.label ?? 'Koyu';
  const displayName = profile.name || (session?.user.email ? session.user.email.split('@')[0]! : '');

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
        title="Ayarlar"
        subtitle="Uygulamanızı ihtiyaçlarınıza göre özelleştirin."
        right={<BellButton count={unread} onPress={() => router.push('/bildirimler')} />}
      />

      {/* Profil kartı */}
      <View style={styles.profile}>
        <Pressable onPress={() => router.push('/profil')} accessibilityRole="button" accessibilityLabel="Profil fotoğrafını düzenle">
          <Avatar name={displayName || '?'} uri={profile.photoUri} size={64} />
          <View style={styles.editBadge}>
            <Ionicons name="pencil" size={14} color={colors.text} />
          </View>
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="title" numberOfLines={2} style={{ fontSize: 18 }}>
            {displayName || 'Profilinizi oluşturun'}
          </AppText>
          {profile.phone ? (
            <AppText variant="label" style={{ fontSize: 13 }}>
              {formatPhone(profile.phone)}
            </AppText>
          ) : null}
          {profile.showLocation && area.label ? (
            <AppText variant="label" style={{ fontSize: 13 }}>
              {area.label}
            </AppText>
          ) : null}
          {!displayName ? <AppText variant="caption">Ad ve fotoğraf yalnızca bu cihazda saklanır.</AppText> : null}
        </View>
        <Pressable
          onPress={() => router.push('/profil')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.85 }]}
        >
          <AppText variant="label" color={colors.text} style={{ fontSize: 11.5 }}>
            Profil Düzenle
          </AppText>
          <Ionicons name="chevron-forward" size={16} color={colors.text} />
        </Pressable>
      </View>

      {/* Hızlı erişim */}
      <View style={styles.quickRow}>
        <QuickCard
          icon="mci:shield-account"
          color={accent.orange}
          label="Hesap"
          value={session ? 'Giriş yapıldı' : 'Giriş yok'}
          onPress={() => router.push('/hesap')}
        />
        <QuickCard icon="people" color={accent.blue} label="Ailem" value={`${contactCount} kişi`} onPress={() => router.push('/ailem')} />
        <QuickCard
          icon="location"
          color={accent.green}
          label="Konum Paylaşımı"
          value={settings.locationSharing ? 'Açık' : 'Kapalı'}
          valueColor={settings.locationSharing ? colors.safe : colors.textSecondary}
          onPress={() => router.push('/gizlilik')}
        />
      </View>

      <SectionCard
        icon="notifications"
        color={accent.red}
        title="Bildirim Ayarları"
        subtitle="Deprem, acil durum ve aile bildirimlerini yönetin."
        onPress={() => router.push('/bildirim-ayarlari')}
      >
        <NotificationToggles />
      </SectionCard>

      <SectionCard
        icon="location"
        color={accent.green}
        title="Konum ve Gizlilik"
        subtitle="Konum paylaşımı ve verilerinizin gizliliğini yönetin."
        onPress={() => router.push('/gizlilik')}
      >
        <RowGroup>
          <ListRow
            first
            icon="navigate-outline"
            title="Konum paylaşımı"
            subtitle="Aile üyelerinizle konumunuzu paylaşın"
            value={settings.locationSharing ? 'Sadece ailem' : 'Kapalı'}
            onPress={() => router.push('/gizlilik')}
          />
          <ListRow
            icon="lock-closed-outline"
            title="Gizlilik ayarları"
            subtitle="Verilerinizin kimlerle paylaşılacağını yönetin"
            onPress={() => router.push('/gizlilik')}
          />
          <ListRow
            icon="eye-off-outline"
            title="Konumumu gizle"
            subtitle="Belirli kişilerden konumunuzu gizleyin"
            value={settings.hideLocationFrom.length ? `${settings.hideLocationFrom.length} kişi` : undefined}
            onPress={() => router.push('/gizlilik/gizle')}
          />
        </RowGroup>
      </SectionCard>

      <SectionCard
        icon="shield-checkmark"
        color={accent.teal}
        title="Güvenlik"
        subtitle="Hesabınızın güvenliğini sağlayın."
        onPress={() => router.push('/guvenlik')}
      >
        <View style={wide ? styles.twoCol : styles.oneCol}>
          <RowGroup style={wide ? { flex: 1 } : undefined}>
            <ListRow
              first
              icon="key-outline"
              title="Giriş ve şifre"
              subtitle="Apple veya e-posta ile şifresiz giriş"
              onPress={() => router.push('/guvenlik')}
            />
            <ListRow
              icon="phone-portrait-outline"
              title="Aktif cihazlar"
              subtitle="Oturumları yönet"
              onPress={() => router.push('/guvenlik')}
            />
          </RowGroup>
          <RowGroup style={wide ? { flex: 1 } : undefined}>
            <ToggleRow
              first
              icon="finger-print"
              title="Biyometrik giriş"
              subtitle="Face ID / parmak izi"
              value={settings.biometricLock}
              onChange={toggleBiometric}
            />
            <ListRow
              icon="id-card-outline"
              title="Kimlik doğrulama"
              subtitle="Bildirim ve oylama için"
              value={trust?.verified ? (trust.role === 'user' ? 'Doğrulandı' : 'Kurumsal') : 'Doğrulanmadı'}
              valueColor={trust?.verified ? colors.safe : colors.caution}
              onPress={() => router.push('/kimlik')}
            />
            <ListRow
              icon="shield-half-outline"
              title="Bilgi güvenliği"
              subtitle="Sahte ihbara karşı kurallar"
              onPress={() => router.push('/guven')}
            />
          </RowGroup>
        </View>
      </SectionCard>

      <SectionCard
        icon="settings"
        color={accent.purple}
        title="Uygulama Tercihleri"
        subtitle="Görünüm, harita ve dil ayarlarını düzenleyin."
        onPress={() => router.push('/tercihler')}
      >
        <View style={wide ? styles.twoCol : styles.oneCol}>
          <RowGroup style={wide ? { flex: 1 } : undefined}>
            <ListRow
              first
              icon="moon-outline"
              title="Tema"
              value={settings.theme === 'system' ? 'Cihazla aynı' : settings.theme === 'light' ? 'Açık' : 'Koyu'}
              onPress={() => router.push('/tercihler')}
            />
            <ListRow icon="map-outline" title="Harita" value={mapLabel} onPress={() => router.push('/tercihler')} />
            <ListRow icon="globe-outline" title="Dil" value="Türkçe" onPress={() => router.push('/tercihler')} />
          </RowGroup>
        </View>
      </SectionCard>

      <SectionCard
        icon="information"
        color={accent.orange}
        title="Destek ve Hakkında"
        subtitle="Yardım alın, geri bildirim gönderin."
        onPress={() => router.push('/yardim')}
      >
        <RowGroup>
          <ListRow first icon="help-circle-outline" title="Yardım Merkezi" onPress={() => router.push('/yardim')} />
          <ListRow icon="chatbox-outline" title="Geri bildirim gönder" onPress={() => router.push('/geri-bildirim')} />
          <ListRow icon="document-text-outline" title="Hakkında" value={`GÜVENDE v${version}`} onPress={() => router.push('/hakkinda')} />
        </RowGroup>
      </SectionCard>
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    minHeight: 38,
  },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  oneCol: { gap: spacing.sm },
}));
