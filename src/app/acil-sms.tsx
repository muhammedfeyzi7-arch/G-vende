import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { GroupTitle, IconTile, Page, RowGroup, ToggleRow, accent } from '@/components/ds';
import { sendSms } from '@/features/family/local';
import { useFamilyActions } from '@/features/family/useFamilyActions';
import { useNearbyAssembly } from '@/features/assembly-points/useNearbyAssembly';
import { useApp } from '@/providers/AppProvider';
import { colors, radius, spacing, themedStyles } from '@/theme';
import { coarsen } from '@/utils/geo';

type Template = {
  id: string;
  icon: string;
  color: string;
  title: string;
  text: (loc: string | null, extra: { point: string | null }) => string;
};

const link = (l: string | null) => (l ? ` Konumum: ${l}` : '');
const TEMPLATES: Template[] = [
  { id: 'safe', icon: 'shield-checkmark', color: accent.green, title: 'Güvendeyim', text: (l) => `Ben güvendeyim.${link(l)} (GÜVENDE)` },
  {
    id: 'help',
    icon: 'alert-circle',
    color: accent.red,
    title: 'Yardıma ihtiyacım var',
    text: (l) => `Yardıma ihtiyacım var!${link(l)} Hayati tehlike varsa 112 aranmalı. (GÜVENDE)`,
  },
  {
    id: 'trapped',
    icon: 'warning',
    color: accent.orange,
    title: 'Enkaz altındayım',
    text: (l) => `ENKAZ ALTINDAYIM! Lütfen 112’ye bildirin.${link(l)} (GÜVENDE)`,
  },
  {
    id: 'assembly',
    icon: 'flag',
    color: accent.blue,
    title: 'Toplanma alanındayım',
    text: (l, { point }) => `Toplanma alanındayım${point ? `: ${point}` : ''}.${link(l)} (GÜVENDE)`,
  },
  {
    id: 'ask',
    icon: 'help-circle',
    color: accent.purple,
    title: 'İyi misin?',
    text: () => 'Deprem sonrası durumunu merak ediyorum. İyi misin? Lütfen kısaca yanıt ver. (GÜVENDE)',
  },
];

/** Hazır acil durum mesajları: cihazın SMS uygulamasında hazırlanır, siz gönderirsiniz. */
export default function EmergencySms() {
  const { location, requestLocation, settings } = useApp();
  const fam = useFamilyActions();
  const nearby = useNearbyAssembly(null);
  const [withLocation, setWithLocation] = useState(true);

  const send = async (t: Template) => {
    if (!fam.contacts.length) {
      return Alert.alert('Acil durum kişisi yok', 'Önce Ailem sekmesinden kişi ekleyin.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Kişi ekle', onPress: () => router.push('/ailem') },
      ]);
    }
    const useLoc = withLocation && t.id !== 'ask';
    let gps = location.status === 'granted' ? location.coords : null;
    if (useLoc && !gps) {
      const next = await requestLocation();
      gps = next.status === 'granted' ? next.coords : null;
    }
    const p = gps && useLoc ? coarsen(gps, 0.0001) : null;
    const loc = p ? `https://maps.google.com/?q=${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}` : null;
    const targets = loc ? fam.contacts.filter((c) => !settings.hideLocationFrom.includes(c.id)) : fam.contacts;
    const hidden = loc ? fam.contacts.filter((c) => settings.hideLocationFrom.includes(c.id)) : [];
    const extra = { point: nearby.myPoint?.name ?? null };
    for (const [list, l] of [
      [targets, loc],
      [hidden, null],
    ] as const) {
      if (!list.length) continue;
      const r = await sendSms(
        list.map((c) => c.phone),
        t.text(l, extra),
      );
      if (!r.ok) return Alert.alert('Gönderilemedi', r.reason);
      if (r.status !== 'cancelled') {
        if (t.id === 'safe') fam.setMyStatus({ kind: 'safe', at: new Date().toISOString() });
        if (t.id === 'help' || t.id === 'trapped') fam.setMyStatus({ kind: 'help', at: new Date().toISOString() });
        if (t.id === 'ask')
          fam.setContactStatus(
            list.map((c) => c.id),
            'waiting',
          );
      }
    }
  };

  return (
    <Page>
      <AppText variant="label">
        Mesaj, telefonunuzun SMS uygulamasında {fam.contacts.length} acil durum kişinize hazırlanır; siz “Gönder”e basmadan gitmez. SMS,
        mobil internet çalışmadığında da çoğu zaman ulaşır.
      </AppText>
      <RowGroup>
        <ToggleRow
          first
          icon="location-outline"
          title="Konumumu ekle"
          subtitle="Mesaja o anki konumunuzun harita bağlantısı eklenir"
          value={withLocation}
          onChange={setWithLocation}
        />
      </RowGroup>
      <GroupTitle>Hazır mesajlar</GroupTitle>
      {TEMPLATES.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => send(t)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.tpl, pressed && { opacity: 0.85 }]}
        >
          <IconTile icon={t.icon} color={t.color} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading" style={{ fontSize: 14 }}>
              {t.title}
            </AppText>
            <AppText variant="caption" numberOfLines={2}>
              {t.text(withLocation && t.id !== 'ask' ? '[konum]' : null, { point: nearby.myPoint?.name ?? null })}
            </AppText>
          </View>
        </Pressable>
      ))}
      <AppText variant="caption">
        Kişi listesi Ailem sekmesinden yönetilir. “Konumumu gizle” listesindekilere konumsuz mesaj hazırlanır.
      </AppText>
    </Page>
  );
}

const styles = themedStyles(() => ({
  tpl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    padding: spacing.md,
  },
}));
