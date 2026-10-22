import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts/legacy';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { Avatar, ListRow, RowGroup } from '@/components/ds';
import { openDirections } from '@/features/assembly-points/api';
import { useProfile } from '@/hooks/useProfile';
import { useApp } from '@/providers/AppProvider';
import { colors, radius, spacing } from '@/theme';
import { relativeTimeTr } from '@/utils/time';
import { formatPhone, MAX_LOCAL_CONTACTS } from './local';
import { buildPeople } from './people';
import { useFamilyActions } from './useFamilyActions';

/** Sunucu olmadan çalışan aile bölümü: durum bildirimi (SMS), kişiler ve buluşma noktası. */
export function LocalFamilyCard() {
  const { userCoords, location, settings } = useApp();
  const fam = useFamilyActions();
  const { profile } = useProfile();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [editMp, setEditMp] = useState(false);
  const [mpName, setMpName] = useState('');

  const people = useMemo(
    () => buildPeople({ name: profile.name, status: fam.myStatus }, fam.contacts, [], null),
    [profile.name, fam.myStatus, fam.contacts],
  );

  const pickFromContacts = async () => {
    try {
      const c = await Contacts.presentContactPickerAsync();
      if (!c) return;
      const num = c.phoneNumbers?.find((p) => p.isPrimary)?.number ?? c.phoneNumbers?.[0]?.number;
      if (!num) return Alert.alert('Numara yok', 'Seçilen kişinin telefon numarası bulunmuyor.');
      const err = fam.addContact(c.name, num, null);
      if (err) Alert.alert('Eklenemedi', err);
    } catch {
      setAdding(true);
    }
  };

  const save = () => {
    const err = fam.addContact(name, phone, relation);
    if (err) return Alert.alert('Eklenemedi', err);
    setName('');
    setPhone('');
    setRelation('');
    setAdding(false);
  };

  const hasContacts = fam.contacts.length > 0;
  return (
    <View style={{ gap: spacing.md }}>
      {/* Durum bildir */}
      <View style={styles.statusRow}>
        <Pressable
          onPress={() => fam.sendStatus('safe')}
          accessibilityRole="button"
          accessibilityLabel="Güvendeyim mesajı gönder"
          style={({ pressed }) => [styles.statusBtn, styles.safeBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="shield-checkmark" size={30} color="#04261B" />
          <AppText variant="heading" color="#04261B">
            Güvendeyim
          </AppText>
        </Pressable>
        <Pressable
          onPress={fam.confirmHelp}
          accessibilityRole="button"
          accessibilityLabel="Yardım lazım mesajı gönder"
          style={({ pressed }) => [styles.statusBtn, styles.helpBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="alert-circle" size={30} color="#fff" />
          <AppText variant="heading" color="#fff">
            Yardım lazım
          </AppText>
        </Pressable>
      </View>
      <RowGroup>
        <ListRow
          first
          icon="chatbubbles-outline"
          title="Herkese durum sor"
          subtitle="Kişilere “İyi misin?” SMS’i hazırlanır"
          onPress={fam.askEveryone}
          disabled={!hasContacts}
        />
        <ListRow
          icon="navigate-outline"
          title="Konum paylaşımı"
          subtitle={settings.locationSharing ? 'Durum mesajlarına konumunuz eklenir' : 'Kapalı — mesajlara konum eklenmez'}
          value={settings.locationSharing ? 'Açık' : 'Kapalı'}
          valueColor={settings.locationSharing ? colors.safe : undefined}
          onPress={() => router.push('/gizlilik')}
        />
      </RowGroup>

      {/* Kişiler */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppText variant="heading" style={{ flex: 1 }}>
            Aile üyeleri ({fam.contacts.length}/{MAX_LOCAL_CONTACTS})
          </AppText>
        </View>
        <AppText variant="caption">
          Kişiler yalnızca bu cihazda saklanır. Durumlar, siz sorduğunuzda veya işaretlediğinizde güncellenir.
        </AppText>
        {people.map((p) => (
          <Pressable
            key={p.key}
            onPress={() =>
              p.contactId ? router.push({ pathname: '/aile/kisi/[id]', params: { id: p.contactId } }) : fam.sendStatus('safe')
            }
            accessibilityRole="button"
            accessibilityLabel={`${p.name}: ${p.label}`}
            style={styles.person}
          >
            <Avatar
              name={p.source === 'me' ? profile.name || 'Ben' : p.name}
              uri={p.source === 'me' ? profile.photoUri : null}
              size={48}
              status={p.status}
              ring={p.color}
            />
            <View style={{ flex: 1 }}>
              <AppText variant="body" style={{ fontWeight: '600' }}>
                {p.source === 'me' ? 'Ben' : (fam.contacts.find((c) => c.id === p.contactId)?.name ?? p.name)}
              </AppText>
              <AppText variant="caption" color={p.color}>
                {p.label}
                {p.at ? ` · ${relativeTimeTr(p.at)}` : ''}
              </AppText>
              {p.contactId ? (
                <AppText variant="caption">{formatPhone(fam.contacts.find((c) => c.id === p.contactId)?.phone ?? '')}</AppText>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        ))}
        {adding ? (
          <View style={{ gap: spacing.sm }}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="İsim"
              placeholderTextColor={colors.textMuted}
              maxLength={40}
              style={styles.input}
              accessibilityLabel="İsim"
            />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Telefon (0532 123 45 67)"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={20}
              style={styles.input}
              accessibilityLabel="Telefon"
            />
            <TextInput
              value={relation}
              onChangeText={setRelation}
              placeholder="Yakınlık (ör. Annem)"
              placeholderTextColor={colors.textMuted}
              maxLength={30}
              style={styles.input}
              accessibilityLabel="Yakınlık"
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button style={{ flex: 1 }} variant="ghost" label="Vazgeç" onPress={() => setAdding(false)} />
              <Button style={{ flex: 1 }} label="Kaydet" onPress={save} />
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button style={{ flex: 1 }} variant="secondary" icon="person-add-outline" label="Elle ekle" onPress={() => setAdding(true)} />
            <Button style={{ flex: 1 }} variant="secondary" icon="book-outline" label="Rehberden" onPress={pickFromContacts} />
          </View>
        )}
      </View>

      {/* Buluşma noktası */}
      <View style={styles.card}>
        <AppText variant="heading">Ortak buluşma noktası</AppText>
        {editMp ? (
          <>
            <TextInput
              value={mpName}
              onChangeText={setMpName}
              placeholder="ör. Mahalle parkı, okul bahçesi"
              placeholderTextColor={colors.textMuted}
              maxLength={80}
              style={styles.input}
              accessibilityLabel="Buluşma noktası adı"
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                style={{ flex: 1 }}
                variant="secondary"
                label="Buradayım, konumla kaydet"
                disabled={!mpName.trim() || location.status !== 'granted'}
                onPress={() => {
                  fam.updateMeetingPoint({
                    name: mpName.trim(),
                    note: null,
                    latitude: userCoords!.latitude,
                    longitude: userCoords!.longitude,
                    updatedAt: new Date().toISOString(),
                  });
                  setEditMp(false);
                }}
              />
              <Button
                style={{ flex: 1 }}
                label="Yalnızca adını kaydet"
                disabled={!mpName.trim()}
                onPress={() => {
                  fam.updateMeetingPoint({
                    name: mpName.trim(),
                    note: null,
                    latitude: null,
                    longitude: null,
                    updatedAt: new Date().toISOString(),
                  });
                  setEditMp(false);
                }}
              />
            </View>
          </>
        ) : fam.meetingPoint ? (
          <View style={styles.person}>
            <Ionicons name="flag" size={22} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <AppText variant="body">{fam.meetingPoint.name}</AppText>
              <AppText variant="caption">
                {fam.meetingPoint.latitude != null ? 'Konumu kayıtlı' : 'Konumsuz'} · {relativeTimeTr(fam.meetingPoint.updatedAt)}{' '}
                güncellendi
              </AppText>
            </View>
            {fam.meetingPoint.latitude != null ? (
              <Pressable
                onPress={() =>
                  openDirections({
                    latitude: fam.meetingPoint!.latitude!,
                    longitude: fam.meetingPoint!.longitude!,
                    name: fam.meetingPoint!.name,
                  })
                }
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Buluşma noktasına yol tarifi"
              >
                <Ionicons name="walk" size={18} color={colors.primary} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                setMpName(fam.meetingPoint!.name);
                setEditMp(true);
              }}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Buluşma noktasını düzenle"
            >
              <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : (
          <Button variant="secondary" icon="flag-outline" label="Buluşma noktası belirle" onPress={() => setEditMp(true)} />
        )}
        <AppText variant="caption">Buluşma noktası durum mesajlarına eklenir. Ailenizle önceden konuşun.</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', gap: spacing.sm },
  statusBtn: { flex: 1, minHeight: 92, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: 4 },
  safeBtn: { backgroundColor: colors.safe, boxShadow: '0 6px 18px rgba(20,217,154,0.3)' },
  helpBtn: { backgroundColor: colors.danger, boxShadow: '0 6px 18px rgba(255,53,72,0.3)' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    gap: spacing.sm,
  },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
});
