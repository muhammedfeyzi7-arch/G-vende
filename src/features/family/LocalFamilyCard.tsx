import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts/legacy';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { AppText, Button, Card } from '@/components/ui';
import { openDirections } from '@/features/assembly-points/api';
import { useApp } from '@/providers/AppProvider';
import { colors, radius, spacing } from '@/theme';
import { coarsen } from '@/utils/geo';
import { relativeTimeTr } from '@/utils/time';
import { buildStatusMessage, callPhone, formatPhone, sendStatusSms, type StatusKind } from './local';
import { useLocalFamily } from './useLocalFamily';

/** Sunucu olmadan da çalışan acil kişi listesi ve SMS ile durum bildirimi. */
export function LocalFamilyCard() {
  const { userCoords, location, requestLocation } = useApp();

  const fam = useLocalFamily();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [withLocation, setWithLocation] = useState(true);
  const [editMp, setEditMp] = useState(false);
  const [mpName, setMpName] = useState('');

  const send = async (kind: StatusKind) => {
    Haptics.notificationAsync(kind === 'safe' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(
      () => {},
    );
    let gps = location.status === 'granted' ? location.coords : null;
    if (withLocation && !gps && !(location.status === 'denied' && !location.canAskAgain)) {
      const next = await requestLocation();
      gps = next.status === 'granted' ? next.coords : null;
    }
    const msg = buildStatusMessage(kind, {
      // GPS varsa ~100 m hassasiyetle; elle seçilen il konumu SMS'e eklenmez (yanıltıcı olur).
      location: withLocation && gps ? coarsen(gps, 0.001) : null,
      meetingPoint: fam.meetingPoint,
    });
    const r = await sendStatusSms(fam.contacts, msg);
    if (!r.ok) Alert.alert('Gönderilemedi', r.reason);
    else if (r.status === 'cancelled') Alert.alert('Gönderilmedi', 'Mesaj iptal edildi.');
  };

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
    <Card style={{ gap: spacing.md }}>
      <View>
        <AppText variant="heading">Acil durum kişilerim</AppText>
        <AppText variant="caption">İnternet olmasa da SMS ile haber verin. Kişiler yalnızca bu cihazda saklanır.</AppText>
      </View>

      <View style={styles.statusRow}>
        <Pressable
          onPress={() => send('safe')}
          disabled={!hasContacts}
          accessibilityRole="button"
          accessibilityLabel="Güvendeyim mesajı gönder"
          style={({ pressed }) => [styles.statusBtn, styles.safeBtn, !hasContacts && styles.disabled, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="shield-checkmark" size={28} color="#04261B" />
          <AppText variant="heading" color="#04261B">
            Güvendeyim
          </AppText>
        </Pressable>
        <Pressable
          onPress={() =>
            Alert.alert(
              'Yardım mesajı',
              'Kişilerinize yardıma ihtiyacınız olduğunu bildiren bir SMS hazırlanacak. Hayati tehlike varsa önce 112’yi arayın.',
              [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'SMS hazırla', onPress: () => send('need_help') },
              ],
            )
          }
          disabled={!hasContacts}
          accessibilityRole="button"
          accessibilityLabel="Yardım lazım mesajı gönder"
          style={({ pressed }) => [styles.statusBtn, styles.helpBtn, !hasContacts && styles.disabled, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="alert-circle" size={28} color="#fff" />
          <AppText variant="heading" color="#fff">
            Yardım lazım
          </AppText>
        </Pressable>
      </View>
      <View style={styles.switchRow}>
        <AppText variant="label" style={{ flex: 1 }}>
          Mesaja konumumu ekle (GPS, ~100 m)
        </AppText>
        <Switch
          value={withLocation}
          onValueChange={setWithLocation}
          trackColor={{ true: colors.primary, false: colors.borderStrong }}
          accessibilityLabel="Mesaja konumumu ekle"
        />
      </View>
      {!hasContacts && fam.loaded ? <AppText variant="caption">Durum mesajı göndermek için önce kişi ekleyin.</AppText> : null}

      {fam.contacts.map((c) => (
        <View key={c.id} style={styles.contact}>
          <View style={styles.avatar}>
            <AppText variant="heading" color={colors.primary}>
              {c.name.slice(0, 1).toLocaleUpperCase('tr-TR')}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="body">{c.name}</AppText>
            <AppText variant="caption">
              {formatPhone(c.phone)}
              {c.relation ? ` · ${c.relation}` : ''}
            </AppText>
          </View>
          <Pressable
            onPress={() => callPhone(c.phone)}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={`${c.name} kişisini ara`}
          >
            <Ionicons name="call" size={18} color={colors.safe} />
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert('Kişiyi kaldır', `${c.name} listeden kaldırılsın mı?`, [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Kaldır', style: 'destructive', onPress: () => fam.removeContact(c.id) },
              ])
            }
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={`${c.name} kişisini kaldır`}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
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
            placeholder="Yakınlık (isteğe bağlı, ör. Annem)"
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

      <View style={styles.divider} />
      <View style={{ gap: spacing.sm }}>
        <AppText variant="label" color={colors.text}>
          Ailemizin buluşma noktası
        </AppText>
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
          <View style={styles.contact}>
            <Ionicons name="flag" size={20} color={colors.warning} />
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
    </Card>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', gap: spacing.sm },
  statusBtn: { flex: 1, minHeight: 84, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: 4 },
  safeBtn: { backgroundColor: colors.safe, boxShadow: '0 6px 18px rgba(20,217,154,0.3)' },
  helpBtn: { backgroundColor: colors.danger, boxShadow: '0 6px 18px rgba(255,53,72,0.3)' },
  disabled: { opacity: 0.4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  contact: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
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
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
