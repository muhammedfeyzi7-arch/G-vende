import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { Avatar, GroupTitle, IconTile, Page, accent } from '@/components/ds';
import { ASK_STATUS_MESSAGE, callPhone, formatPhone, sendSms } from '@/features/family/local';
import { useLocalFamily } from '@/features/family/useLocalFamily';
import { useApp } from '@/providers/AppProvider';
import { colors, hitSlop, radius, spacing, themedStyles, iconColors } from '@/theme';

/**
 * Türkiye geneli kısa numaralar. 112 tüm acil durumlar (sağlık, itfaiye, polis, jandarma, AFAD) için
 * tek numaradır; diğerleri altyapı arıza hatlarıdır. Arama, telefonun kendi arama ekranında başlar.
 */
const NUMBERS = [
  { tel: '186', title: 'Elektrik arıza', sub: 'Kopan kablo, elektrik kesintisi', icon: 'flash', color: accent.yellow },
  { tel: '187', title: 'Doğalgaz acil', sub: 'Gaz kokusu, kaçak şüphesi', icon: 'flame', color: accent.orange },
  { tel: '185', title: 'Su arıza', sub: 'Patlak boru, su baskını', icon: 'water', color: accent.teal },
];

/** Acil arama: 112, arıza hatları, aile kişileri ve operatöre okunacak konum. */
export default function CallScreen() {
  const { location, requestLocation } = useApp();
  const fam = useLocalFamily();
  const [address, setAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const coords = location.status === 'granted' ? location.coords : null;

  useEffect(() => {
    if (!coords) return;
    Location.reverseGeocodeAsync(coords)
      .then(([a]) => {
        if (!a) return;
        const parts = [
          a.street && `${a.street}${a.streetNumber ? ` No:${a.streetNumber}` : ''}`,
          a.district ?? a.subregion,
          a.city ?? a.region,
        ];
        setAddress(parts.filter(Boolean).join(', ') || null);
      })
      .catch(() => {});
  }, [coords?.latitude, coords?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  const coordText = coords ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` : null;

  return (
    <Page>
      <Pressable
        onPress={() => Linking.openURL('tel:112')}
        accessibilityRole="button"
        accessibilityLabel="112 Acil Çağrı Merkezi’ni ara"
        style={({ pressed }) => [styles.hero, pressed && { opacity: 0.9 }]}
      >
        <LinearGradient
          colors={[colors.alertFrom, colors.alertTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroIcon}>
          <Ionicons name="call" size={34} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color="#FDE3E6">
            Acil Çağrı Merkezi
          </AppText>
          <AppText variant="display" color="#fff" style={{ fontSize: 40, lineHeight: 44 }}>
            112
          </AppText>
          <AppText variant="caption" color="#FDE3E6">
            Sağlık · İtfaiye · Polis · Jandarma · AFAD
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </Pressable>

      <View style={styles.locCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <IconTile icon="location" color={accent.blue} size={36} solid />
          <View style={{ flex: 1 }}>
            <AppText variant="heading" style={{ fontSize: 14 }}>
              Operatöre okuyacağınız konum
            </AppText>
            <AppText variant="caption">Aramada adresinizi sorduklarında buradan okuyun.</AppText>
          </View>
        </View>
        {coords ? (
          <>
            {address ? (
              <AppText variant="heading" style={{ fontSize: 15 }}>
                {address}
              </AppText>
            ) : null}
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(coordText!);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Koordinat ${coordText}. Kopyala`}
              hitSlop={hitSlop}
              style={styles.coordRow}
            >
              <AppText variant="title" style={{ fontSize: 18, fontVariant: ['tabular-nums'] }}>
                {coordText}
              </AppText>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.primary} />
            </Pressable>
            <AppText variant="caption">
              {location.status === 'granted' && location.accuracyM ? `GPS doğruluğu ±${Math.round(location.accuracyM)} m · ` : ''}
              Adres yaklaşık olabilir.
            </AppText>
          </>
        ) : (
          <Button label="Konumumu göster" icon="locate-outline" variant="secondary" size="sm" onPress={() => requestLocation()} />
        )}
      </View>

      <GroupTitle>Arıza hatları</GroupTitle>
      {NUMBERS.map((n) => (
        <Pressable
          key={n.tel}
          onPress={() => Linking.openURL(`tel:${n.tel}`)}
          accessibilityRole="button"
          accessibilityLabel={`${n.title}, ${n.tel} ara`}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
        >
          <IconTile icon={n.icon} color={n.color} size={40} />
          <View style={{ flex: 1 }}>
            <AppText variant="heading" style={{ fontSize: 14 }}>
              {n.title}
            </AppText>
            <AppText variant="caption">{n.sub}</AppText>
          </View>
          <View style={styles.telPill}>
            <Ionicons name="call" size={14} color={colors.primary} />
            <AppText variant="heading" color={colors.primary} style={{ fontSize: 15 }}>
              {n.tel}
            </AppText>
          </View>
        </Pressable>
      ))}

      <GroupTitle>Ailem</GroupTitle>
      {fam.contacts.length ? (
        fam.contacts.map((c) => (
          <View key={c.id} style={styles.row}>
            <Avatar name={c.relation || c.name} uri={c.photoUri} size={40} />
            <View style={{ flex: 1 }}>
              <AppText variant="heading" style={{ fontSize: 14 }}>
                {c.relation || c.name}
              </AppText>
              <AppText variant="caption">{formatPhone(c.phone)}</AppText>
            </View>
            <Pressable
              onPress={() => sendSms([c.phone], ASK_STATUS_MESSAGE)}
              accessibilityRole="button"
              accessibilityLabel={`${c.name} kişisine durum sor`}
              hitSlop={hitSlop}
              style={styles.round}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={() => callPhone(c.phone)}
              accessibilityRole="button"
              accessibilityLabel={`${c.name} ara`}
              hitSlop={hitSlop}
              style={[styles.round, { backgroundColor: iconColors.green }]}
            >
              <Ionicons name="call" size={18} color="#fff" />
            </Pressable>
          </View>
        ))
      ) : (
        <Button label="Aile kişisi ekle" icon="person-add-outline" variant="secondary" onPress={() => router.push('/aile/ekle')} />
      )}

      <AppText variant="caption">
        Şebeke yoğunken sesli arama düşebilir; kısa SMS çoğu zaman daha kolay ulaşır. Hayati tehlikede önce 112’yi arayın.
      </AppText>
    </Page>
  );
}

const styles = themedStyles(() => ({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.alertBorder,
    boxShadow: '0 8px 24px rgba(255,53,72,0.28)',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: iconColors.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  locCard: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    boxShadow: colors.shadowSoft,
  },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm + 2,
  },
  telPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
}));
