import { Ionicons } from '@expo/vector-icons';
import { FloorField } from '@/features/rubble/FloorField';
import { floorLabel, loadFloor } from '@/features/rubble/floor';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { Avatar, GroupTitle, IconTile, Page, accent } from '@/components/ds';
import { ASK_STATUS_MESSAGE, callPhone, formatPhone, sendSms } from '@/features/family/local';
import { useLocalFamily } from '@/features/family/useLocalFamily';
import { formatTrAddress, type TrAddress } from '@/features/location/address';
import { readJson, writeJson } from '@/services/storage';
import { relativeTimeTr } from '@/utils/time';
import { useApp } from '@/providers/AppProvider';
import { colors, hitSlop, radius, spacing, surface, themedStyles, iconColors } from '@/theme';

/**
 * Türkiye geneli kısa numaralar. 112 tüm acil durumlar (sağlık, itfaiye, polis, jandarma, AFAD) için
 * tek numaradır; diğerleri altyapı arıza hatlarıdır. Arama, telefonun kendi arama ekranında başlar.
 */
const NUMBERS = [
  { tel: '186', title: 'Elektrik arıza', sub: 'Kopan kablo, elektrik kesintisi', icon: 'flash', color: accent.yellow },
  { tel: '187', title: 'Doğalgaz acil', sub: 'Gaz kokusu, kaçak şüphesi', icon: 'flame', color: accent.orange },
  { tel: '185', title: 'Su arıza', sub: 'Patlak boru, su baskını', icon: 'water', color: accent.teal },
];

/** Acil arama: 112, arıza hatları, aile kişileri ve operatöre okunacak açık adres. */
export default function CallScreen() {
  const { location, requestLocation } = useApp();
  const fam = useLocalFamily();
  const [address, setAddress] = useState<TrAddress | null>(null);
  const [lastKnown, setLastKnown] = useState<(TrAddress & { at: string }) | null>(null);
  const [lookup, setLookup] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const coords = location.status === 'granted' ? location.coords : null;

  useEffect(() => {
    readJson<TrAddress & { at: string }>('last-address').then((a) => a?.full && setLastKnown(a));
    readJson<string>('address-note').then((n) => n && setNote(n));
  }, []);

  useEffect(() => {
    if (!coords) return;
    setLookup('loading');
    Location.reverseGeocodeAsync(coords)
      .then(([a]) => {
        const f = formatTrAddress(a);
        if (!f.full) return setLookup('failed');
        setAddress(f);
        setLookup('idle');
        writeJson('last-address', { ...f, at: new Date().toISOString() });
      })
      .catch(() => setLookup('failed'));
  }, [coords?.latitude, coords?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = address ?? lastKnown;
  const [floor, setFloorText] = useState<string | null>(null);
  useEffect(() => {
    loadFloor().then((f) => setFloorText(floorLabel(f?.floor)));
  }, []);
  const readText = [shown?.full, note.trim(), floor].filter(Boolean).join(' — ');

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
              112’ye okuyacağınız adres
            </AppText>
            <AppText variant="caption">Aramada adresinizi sorduklarında buradan okuyun.</AppText>
          </View>
        </View>
        {shown ? (
          <>
            <View style={{ gap: 2 }}>
              <AppText variant="title" style={{ fontSize: 19, lineHeight: 25 }}>
                {shown.line1 ?? shown.line2}
              </AppText>
              {shown.line1 && shown.line2 ? (
                <AppText variant="heading" color={colors.textSecondary} style={{ fontSize: 15 }}>
                  {shown.line2}
                </AppText>
              ) : null}
            </View>
            {!address && lastKnown ? (
              <AppText variant="caption" color={colors.warning}>
                Son bilinen adres ({relativeTimeTr(lastKnown.at)}). Şu anki konumunuz farklı olabilir.
              </AppText>
            ) : null}
          </>
        ) : coords ? (
          <AppText variant="label">
            {lookup === 'loading' ? 'Adres bulunuyor…' : 'Adres bulunamadı (internet gerekebilir). Operatöre bulunduğunuz yeri tarif edin.'}
          </AppText>
        ) : (
          <Button label="Konumumu göster" icon="locate-outline" variant="secondary" size="sm" onPress={() => requestLocation()} />
        )}

        <TextInput
          value={note}
          onChangeText={(t) => {
            setNote(t);
            writeJson('address-note', t);
          }}
          placeholder="Bina / kat / daire tarifi (ör. Gül Apt. 3. kat, daire 7)"
          placeholderTextColor={colors.textMuted}
          style={styles.note}
          accessibilityLabel="Bina, kat ve daire tarifi"
          maxLength={120}
        />
        <FloorField />

        {readText ? (
          <Button
            label={copied ? 'Kopyalandı' : 'Adresi kopyala'}
            icon={copied ? 'checkmark' : 'copy-outline'}
            variant="secondary"
            size="sm"
            onPress={async () => {
              await Clipboard.setStringAsync(readText);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          />
        ) : null}
        <AppText variant="caption">
          {location.status === 'granted' && location.accuracyM ? `GPS doğruluğu ±${Math.round(location.accuracyM)} m · ` : ''}
          Adres telefonun haritasından tahmin edilir; kapı numarası yanlış olabilir. Tarif alanı yalnızca bu cihazda saklanır.
        </AppText>
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
  note: { ...surface.input() },
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
