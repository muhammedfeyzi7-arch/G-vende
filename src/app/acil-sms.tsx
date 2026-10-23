import { useToast } from '@/components/Toast';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { Avatar, GroupTitle, IconTile, Page, RowGroup, ToggleRow, accent } from '@/components/ds';
import { sendSms, type LocalContact } from '@/features/family/local';
import { useFamilyActions } from '@/features/family/useFamilyActions';
import { useNearbyAssembly } from '@/features/assembly-points/useNearbyAssembly';
import { useApp } from '@/providers/AppProvider';
import { colors, hitSlop, radius, spacing, themedStyles } from '@/theme';
import { coarsen } from '@/utils/geo';

type Effect = 'safe' | 'help' | 'ask' | null;
type Template = { id: string; icon: string; color: string; title: string; body: string; effect: Effect; custom?: boolean };

const LOC = '{konum}';
const POINT = '{toplanma}';

/** Yerleşik şablonlar; {konum} ve {toplanma} gönderim anında doldurulur. */
const BUILT_IN = (): Template[] => [
  { id: 'safe', icon: 'shield-checkmark', color: accent.green, title: 'Güvendeyim', body: `Ben güvendeyim. ${LOC}`, effect: 'safe' },
  {
    id: 'help',
    icon: 'alert-circle',
    color: accent.red,
    title: 'Yardıma ihtiyacım var',
    body: `Yardıma ihtiyacım var! ${LOC} Hayati tehlike varsa 112 aranmalı.`,
    effect: 'help',
  },
  {
    id: 'trapped',
    icon: 'warning',
    color: accent.orange,
    title: 'Enkaz altındayım',
    body: `ENKAZ ALTINDAYIM! Lütfen 112’ye bildirin. ${LOC}`,
    effect: 'help',
  },
  {
    id: 'assembly',
    icon: 'flag',
    color: accent.blue,
    title: 'Toplanma alanındayım',
    body: `Toplanma alanındayım: ${POINT}. ${LOC}`,
    effect: 'safe',
  },
  {
    id: 'home',
    icon: 'home',
    color: accent.teal,
    title: 'Evdeyim, iyiyim',
    body: `Evdeyim, iyiyim. Bina hasarsız görünüyor. ${LOC}`,
    effect: 'safe',
  },
  {
    id: 'ask',
    icon: 'help-circle',
    color: accent.purple,
    title: 'İyi misin?',
    body: 'Deprem sonrası durumunu merak ediyorum. İyi misin? Lütfen kısaca yanıt ver.',
    effect: 'ask',
  },
];

export function fillMessage(body: string, loc: string | null, point: string | null) {
  return `${body
    .replace(LOC, loc ? `Konumum: ${loc}` : '')
    .replace(POINT, point ?? 'belirlenmedi')
    .replace(/\s+/g, ' ')
    .trim()} (GÜVENDE)`;
}

/** Hazır acil durum mesajları: alıcı seçilir, mesaj SMS uygulamasında veya başka uygulamayla paylaşılarak gönderilir. */
export default function EmergencyMessages() {
  const { location, requestLocation, settings, updateSettings } = useApp();
  const fam = useFamilyActions();
  const nearby = useNearbyAssembly(null);
  const [withLocation, setWithLocation] = useState(true);
  const toast = useToast();
  const [active, setActive] = useState<Template | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ id: string | null; title: string; text: string } | null>(null);

  const templates = useMemo(
    () => [
      ...BUILT_IN(),
      ...settings.customMessages.map<Template>((m) => ({
        id: m.id,
        icon: 'create',
        color: accent.gray,
        title: m.title,
        body: m.text,
        effect: null,
        custom: true,
      })),
    ],
    [settings.customMessages],
  );
  const point = nearby.myPoint?.name ?? null;
  const fill = (t: Template, loc: string | null) => fillMessage(t.body, loc, point);

  const open = (t: Template) => {
    setActive(t);
    setSelected(new Set(fam.contacts.map((c) => c.id)));
  };

  const locationLink = async (): Promise<string | null> => {
    if (!withLocation || active?.effect === 'ask') return null;
    let gps = location.status === 'granted' ? location.coords : null;
    if (!gps) {
      const next = await requestLocation();
      gps = next.status === 'granted' ? next.coords : null;
    }
    if (!gps) return null;
    const p = coarsen(gps, 0.0001);
    return `https://maps.google.com/?q=${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;
  };

  const applyEffect = (t: Template, list: LocalContact[]) => {
    const at = new Date().toISOString();
    if (t.effect === 'safe') fam.setMyStatus({ kind: 'safe', at });
    if (t.effect === 'help') fam.setMyStatus({ kind: 'help', at });
    if (t.effect === 'ask' && list.length)
      fam.setContactStatus(
        list.map((c) => c.id),
        'waiting',
      );
  };

  const sendViaSms = async () => {
    if (!active) return;
    const list = fam.contacts.filter((c) => selected.has(c.id));
    if (!list.length) return Alert.alert('Alıcı seçin', 'En az bir kişi seçin veya “Diğer uygulamalar” ile paylaşın.');
    const loc = await locationLink();
    // "Konumumu gizle" listesindekilere konumsuz mesaj
    const withLoc = loc ? list.filter((c) => !settings.hideLocationFrom.includes(c.id)) : list;
    const noLoc = loc ? list.filter((c) => settings.hideLocationFrom.includes(c.id)) : [];
    for (const [group, l] of [
      [withLoc, loc],
      [noLoc, null],
    ] as const) {
      if (!group.length) continue;
      const r = await sendSms(
        group.map((c) => c.phone),
        fill(active, l),
      );
      if (!r.ok) return Alert.alert('Gönderilemedi', r.reason);
      if (r.status !== 'cancelled') applyEffect(active, group);
      if (r.status === 'sent') toast.show({ text: `“${active.title}” ${group.length} kişiye gönderildi` });
    }
    setActive(null);
  };

  const shareOther = async () => {
    if (!active) return;
    const loc = await locationLink();
    try {
      const r = await Share.share({ message: fill(active, loc) });
      if (r.action === Share.sharedAction) {
        applyEffect(active, []);
        setActive(null);
      }
    } catch {
      Alert.alert('Paylaşılamadı');
    }
  };

  const saveCustom = () => {
    if (!editing) return;
    const title = editing.title.trim();
    const text = editing.text.trim();
    if (!title || !text) return Alert.alert('Başlık ve mesaj gerekli');
    const list = settings.customMessages;
    const next = editing.id
      ? list.map((m) => (m.id === editing.id ? { ...m, title, text } : m))
      : [...list, { id: `c${Date.now()}`, title, text }].slice(0, 10);
    updateSettings({ customMessages: next });
    setEditing(null);
    toast.show({ text: editing.id ? 'Mesaj güncellendi' : 'Hazır mesaj eklendi' });
  };

  const deleteCustom = (id: string) =>
    Alert.alert('Mesaj silinsin mi?', undefined, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => updateSettings({ customMessages: settings.customMessages.filter((m) => m.id !== id) }),
      },
    ]);

  return (
    <Page keyboard>
      <AppText variant="label">
        Bir mesaj seçin, alıcıları işaretleyin. Mesaj telefonunuzun SMS uygulamasında hazırlanır; siz “Gönder”e basmadan gitmez. SMS, mobil
        internet çalışmadığında da çoğu zaman ulaşır.
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

      {active ? (
        <View style={styles.composer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <IconTile icon={active.icon} color={active.color} size={36} solid />
            <AppText variant="heading" style={{ flex: 1, fontSize: 15 }}>
              {active.title}
            </AppText>
            <Pressable onPress={() => setActive(null)} accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={hitSlop}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.preview}>
            <AppText variant="body" style={{ fontSize: 13 }}>
              {fill(active, withLocation && active.effect !== 'ask' ? 'https://maps.google.com/?q=…' : null)}
            </AppText>
          </View>
          <AppText variant="label" style={{ fontWeight: '700' }}>
            Alıcılar ({selected.size}/{fam.contacts.length})
          </AppText>
          {fam.contacts.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 }}>
              {fam.contacts.map((c) => {
                const on = selected.has(c.id);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() =>
                      setSelected((s) => {
                        const n = new Set(s);
                        if (on) n.delete(c.id);
                        else n.add(c.id);
                        return n;
                      })
                    }
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={c.relation || c.name}
                    style={[styles.person, on && styles.personOn]}
                  >
                    <Avatar name={c.relation || c.name} uri={c.photoUri} size={26} />
                    <AppText variant="label" color={on ? colors.text : colors.textSecondary}>
                      {c.relation || c.name}
                    </AppText>
                    <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={on ? colors.primary : colors.textMuted} />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Button
              label="Aile kişisi ekle"
              icon="person-add-outline"
              variant="secondary"
              size="sm"
              onPress={() => router.push('/aile/ekle')}
            />
          )}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button style={{ flex: 1 }} label="SMS ile gönder" icon="chatbubble-ellipses" onPress={sendViaSms} />
            <Button style={{ flex: 1 }} label="Diğer uygulamalar" icon="share-social-outline" variant="secondary" onPress={shareOther} />
          </View>
        </View>
      ) : null}

      <GroupTitle>Hazır mesajlar</GroupTitle>
      {templates.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => open(t)}
          onLongPress={t.custom ? () => deleteCustom(t.id) : undefined}
          accessibilityRole="button"
          accessibilityLabel={`${t.title}. ${fill(t, null)}`}
          style={({ pressed }) => [styles.tpl, active?.id === t.id && styles.tplOn, pressed && { opacity: 0.85 }]}
        >
          <IconTile icon={t.icon} color={t.color} size={42} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading" style={{ fontSize: 14 }}>
              {t.title}
            </AppText>
            <AppText variant="caption" numberOfLines={2}>
              {fill(t, withLocation && t.effect !== 'ask' ? '[konum]' : null)}
            </AppText>
          </View>
          {t.custom ? (
            <Pressable
              onPress={() => setEditing({ id: t.id, title: t.title, text: t.body })}
              accessibilityRole="button"
              accessibilityLabel={`${t.title} mesajını düzenle`}
              hitSlop={hitSlop}
            >
              <Ionicons name="pencil" size={18} color={colors.textSecondary} />
            </Pressable>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          )}
        </Pressable>
      ))}

      {editing ? (
        <View style={styles.composer}>
          <AppText variant="heading" style={{ fontSize: 15 }}>
            {editing.id ? 'Mesajı düzenle' : 'Yeni hazır mesaj'}
          </AppText>
          <TextInput
            value={editing.title}
            onChangeText={(title) => setEditing((e) => e && { ...e, title })}
            placeholder="Başlık (ör. İşteyim, iyiyim)"
            placeholderTextColor={colors.textMuted}
            maxLength={40}
            style={styles.input}
            accessibilityLabel="Mesaj başlığı"
          />
          <TextInput
            value={editing.text}
            onChangeText={(text) => setEditing((e) => e && { ...e, text })}
            placeholder={`Mesaj. Konum eklemek için ${LOC} yazın.`}
            placeholderTextColor={colors.textMuted}
            maxLength={300}
            multiline
            style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
            accessibilityLabel="Mesaj metni"
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button style={{ flex: 1 }} label="Vazgeç" variant="secondary" onPress={() => setEditing(null)} />
            <Button style={{ flex: 1 }} label="Kaydet" icon="checkmark" onPress={saveCustom} />
          </View>
        </View>
      ) : settings.customMessages.length < 10 ? (
        <Button label="Kendi mesajını ekle" icon="add" variant="secondary" onPress={() => setEditing({ id: null, title: '', text: LOC })} />
      ) : null}

      <AppText variant="caption">
        Kişiler Ailem sekmesinden yönetilir. “Konumumu gizle” listesindekilere konumsuz mesaj hazırlanır. Kendi mesajlarınızı silmek için
        uzun basın.
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
    padding: spacing.sm + 4,
  },
  tplOn: { borderColor: colors.primary, borderWidth: 1 },
  composer: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primary + '66',
    padding: spacing.md,
    boxShadow: colors.shadow,
  },
  preview: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
    paddingRight: 10,
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  personOn: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  input: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
  },
}));
