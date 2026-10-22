import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Card } from '@/components/ui';
import { SOURCES } from '@/features/earthquakes/repository';
import { SourceHealthCard } from '@/features/home/tabs';
import { useApp } from '@/providers/AppProvider';
import { env, isBackendConfigured } from '@/services/env';
import { registerForPush, syncPreferences } from '@/services/notifications';
import { clearAll } from '@/services/storage';
import { friendlyError, getSupabase } from '@/services/supabase';
import { colors, spacing } from '@/theme';
import type { QuakeSourceId } from '@/types/earthquake';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { settings, updateSettings, location, session, quakes, userCoords } = useApp();
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  // Tercihler değiştiğinde sunucuya eşitle (girişliyse)
  useEffect(() => {
    syncPreferences(settings, userCoords).catch(() => {});
  }, [
    settings.quakeNotifications,
    settings.familyNotifications,
    settings.minNotifyMagnitude,
    settings.notifyIntervalMinutes,
    userCoords,
    session,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const enablePush = async () => {
    const r = await registerForPush();
    setPushStatus(r.ok ? 'Bildirimler bu cihaz için etkin.' : r.reason);
  };

  const toggleSource = (id: QuakeSourceId) => {
    const next = settings.enabledSources.includes(id) ? settings.enabledSources.filter((s) => s !== id) : [...settings.enabledSources, id];
    if (next.length === 0) return Alert.alert('En az bir kaynak açık olmalı');
    updateSettings({ enabledSources: next });
  };

  const exportData = async () => {
    const sb = getSupabase();
    if (!sb || !session) return Alert.alert('Giriş gerekli');
    const { data, error } = await sb.rpc('export_my_data');
    if (error) return Alert.alert('Dışa aktarılamadı', friendlyError(error));
    await Share.share({ message: JSON.stringify(data, null, 2), title: 'GÜVENDE verilerim' });
  };

  const deleteAccount = () =>
    Alert.alert(
      'Hesabı sil',
      'Hesabınız, bildirimleriniz, aile üyelikleriniz ve durum kayıtlarınız kalıcı olarak silinir. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kalıcı olarak sil',
          style: 'destructive',
          onPress: async () => {
            const sb = getSupabase();
            if (!sb) return;
            const { error } = await sb.functions.invoke('delete-account', { method: 'POST' });
            if (error) return Alert.alert('Silinemedi', friendlyError(error));
            await sb.auth.signOut();
            await clearAll();
            Alert.alert('Hesabınız silindi');
          },
        },
      ],
    );

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        padding: spacing.lg,
        gap: spacing.lg,
        paddingBottom: tabBarHeight + spacing.xl,
      }}
    >
      <AppText variant="title" style={{ fontSize: 24 }}>
        Ayarlar
      </AppText>

      <Section title="Hesap">
        {!isBackendConfigured() ? (
          <Row icon="server-outline" label="Sunucu yapılandırılmadı" sub="EXPO_PUBLIC_SUPABASE_URL ve ANON_KEY tanımlanmalı" />
        ) : session ? (
          <>
            <Row icon="person-circle-outline" label={session.user.email ?? 'Giriş yapıldı'} />
            <Row icon="download-outline" label="Verilerimi indir" onPress={exportData} />
            <Row icon="log-out-outline" label="Çıkış yap" onPress={() => getSupabase()?.auth.signOut()} />
            <Row icon="trash-outline" label="Hesabımı sil" danger onPress={deleteAccount} />
          </>
        ) : (
          <Row icon="log-in-outline" label="Giriş yap" onPress={() => router.push('/giris')} />
        )}
      </Section>

      <Section title="Bildirimler">
        <AppText variant="caption">
          Bildirimler, deprem kaynaklarda yayımlandıktan sonra gönderilir ve birkaç dakika gecikebilir. GÜVENDE erken uyarı sistemi
          değildir.
        </AppText>
        <Toggle
          label="Yeni deprem kayıtları"
          value={settings.quakeNotifications}
          onChange={(v) => updateSettings({ quakeNotifications: v })}
        />
        <Toggle
          label="Aile üyelerinin durumu"
          value={settings.familyNotifications}
          onChange={(v) => updateSettings({ familyNotifications: v })}
        />
        <Stepper
          label="Bildirim için en küçük büyüklük"
          value={settings.minNotifyMagnitude}
          step={0.5}
          min={3}
          max={6}
          format={(v) => v.toFixed(1).replace('.', ',')}
          onChange={(v) => updateSettings({ minNotifyMagnitude: v })}
        />
        <Stepper
          label="Aynı bölge için en sık bildirim"
          value={settings.notifyIntervalMinutes}
          step={5}
          min={0}
          max={60}
          format={(v) => (v === 0 ? 'Her olay' : `${v} dk`)}
          onChange={(v) => updateSettings({ notifyIntervalMinutes: v })}
        />
        <Row icon="notifications-outline" label="Bu cihazda bildirimleri etkinleştir" sub={pushStatus ?? undefined} onPress={enablePush} />
      </Section>

      <Section title="Konum ve gizlilik">
        <Row
          icon="location-outline"
          label="Konum"
          sub={
            location.status === 'granted'
              ? 'İzin verildi (yalnızca uygulama açıkken)'
              : location.status === 'manual'
                ? location.label
                : location.status === 'denied'
                  ? 'İzin verilmedi'
                  : 'Belirlenmedi'
          }
          onPress={() => router.push('/konum')}
        />
        <Toggle
          label="Bildirimlere yaklaşık konumu varsayılan olarak ekle"
          value={settings.attachLocationByDefault}
          onChange={(v) => updateSettings({ attachLocationByDefault: v })}
        />
        <Toggle
          label="Aile bilgilerini çevrimdışı erişim için cihazda sakla"
          value={settings.cacheFamilyOffline}
          onChange={(v) => updateSettings({ cacheFamilyOffline: v })}
        />
        <Row
          icon="settings-outline"
          label="Sistem izinleri"
          sub="Konum, kamera, fotoğraf ve bildirim izinleri"
          onPress={() => Linking.openSettings()}
        />
        <AppText variant="caption">
          Kullanıcı bildirimlerinde konum ~1 km’ye yuvarlanır; hesap bilginiz gösterilmez. Arka planda konum toplanmaz. Aile grubunda konum
          yalnızca siz açarsanız ve durum bildirdiğiniz anda paylaşılır.
        </AppText>
      </Section>

      <Section title="Deprem verisi">
        <Stepper
          label="Listede en küçük büyüklük"
          value={settings.minListMagnitude}
          step={0.5}
          min={1.5}
          max={5}
          format={(v) => v.toFixed(1).replace('.', ',')}
          onChange={(v) => updateSettings({ minListMagnitude: v })}
        />
        {env.quakeSources.map((id) => (
          <Toggle
            key={id}
            label={`${SOURCES[id].label} — ${SOURCES[id].attribution}`}
            value={settings.enabledSources.includes(id)}
            onChange={() => toggleSource(id)}
          />
        ))}
        <SourceHealthCard snapshot={quakes.snapshot} />
      </Section>

      <Section title="Yerel veriler">
        <Row
          icon="trash-bin-outline"
          label="Bu cihazdaki tüm GÜVENDE verilerini sil"
          sub="Ayarlar, acil kişiler, buluşma noktası, kayıtlı alanlar, önbellek ve bekleyen gönderiler"
          danger
          onPress={() =>
            Alert.alert(
              'Yerel verileri sil',
              'Bu cihazdaki tüm GÜVENDE verileri silinecek. Hesabınız ve sunucudaki kayıtlarınız etkilenmez.',
              [
                { text: 'Vazgeç', style: 'cancel' },
                {
                  text: 'Sil',
                  style: 'destructive',
                  onPress: async () => {
                    await clearAll();
                    Alert.alert('Silindi', 'Değişikliklerin tümüyle uygulanması için uygulamayı yeniden başlatın.');
                  },
                },
              ],
            )
          }
        />
      </Section>

      <Section title="Görünüm ve dil">
        <Row
          icon="moon-outline"
          label="Tema"
          sub="Koyu"
          onPress={() =>
            Alert.alert(
              'Tema',
              'Şu an yalnızca koyu tema var: gece ve elektrik kesintisinde göz yormaz, pil tüketimini azaltır. Açık tema sonraki sürümde.',
            )
          }
        />
        <Row
          icon="language-outline"
          label="Dil"
          sub="Türkçe"
          onPress={() => Alert.alert('Dil', 'Şu an yalnızca Türkçe. İngilizce sonraki sürümde.')}
        />
      </Section>

      <Section title="Hakkında">
        <Row
          icon="information-circle-outline"
          label={`GÜVENDE ${Constants.expoConfig?.version ?? ''}`}
          sub="Deprem bilgisi ve afet hazırlığı uygulaması"
        />
        <AppText variant="caption">
          Deprem verileri AFAD, Kandilli Rasathanesi (KRDAE) ve USGS kaynaklarından alınır; kaynakların yayımladığı değerler değiştirilmeden
          gösterilir. Harita verisi © OpenStreetMap katkıcıları. Uygulama resmî kurumların yerini tutmaz; acil durumlarda 112’yi arayın.
        </AppText>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {title}
      </AppText>
      <Card style={{ gap: spacing.sm }}>{children}</Card>
    </View>
  );
}

function Row({
  icon,
  label,
  sub,
  onPress,
  danger,
}: {
  icon: IconName;
  label: string;
  sub?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'} style={styles.row}>
      <Ionicons name={icon} size={22} color={danger ? colors.danger : colors.textSecondary} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" color={danger ? colors.danger : colors.text}>
          {label}
        </AppText>
        {sub ? <AppText variant="caption">{sub}</AppText> : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <AppText variant="body" style={{ flex: 1 }}>
        {label}
      </AppText>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        accessibilityLabel={label}
      />
    </View>
  );
}

function Stepper({
  label,
  value,
  step,
  min,
  max,
  format,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 10) / 10)));
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${label}: ${format(value)}`}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => set(value + (e.nativeEvent.actionName === 'increment' ? step : -step))}
    >
      <AppText variant="body" style={{ flex: 1 }}>
        {label}
      </AppText>
      <Pressable onPress={() => set(value - step)} style={styles.stepBtn} accessibilityLabel="Azalt">
        <Ionicons name="remove" size={18} color={colors.text} />
      </Pressable>
      <AppText variant="heading" style={{ minWidth: 64, textAlign: 'center' }}>
        {format(value)}
      </AppText>
      <Pressable onPress={() => set(value + step)} style={styles.stepBtn} accessibilityLabel="Artır">
        <Ionicons name="add" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
