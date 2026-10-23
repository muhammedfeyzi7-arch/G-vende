import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';
import { AppText, Button, Card } from '@/components/ui';
import { Page } from '@/components/ds';
import { openDirections } from '@/features/assembly-points/api';
import { loadMyPoint } from '@/features/assembly-points/mine';
import { useLocalFamily } from '@/features/family/useLocalFamily';
import { useApp } from '@/providers/AppProvider';
import { colors, radius, spacing, themedStyles, surface } from '@/theme';
import { relativeTimeTr } from '@/utils/time';

/** Ailenin ortak buluşma noktası (cihazda; durum mesajlarına eklenir). */
export default function MeetingPoint() {
  const { location, userCoords } = useApp();
  const fam = useLocalFamily();
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (fam.meetingPoint) {
      setName(fam.meetingPoint.name);
      setNote(fam.meetingPoint.note ?? '');
    }
  }, [fam.meetingPoint]);

  const save = (coords: { latitude: number; longitude: number } | null) => {
    fam.updateMeetingPoint({
      name: name.trim(),
      note: note.trim() || null,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      updatedAt: new Date().toISOString(),
    });
    router.back();
  };

  const useAssembly = async () => {
    const p = await loadMyPoint();
    if (!p)
      return Alert.alert('Kayıtlı toplanma alanı yok', 'Önce Toplanma Alanları ekranından alanınızı işaretleyin.', [
        { text: 'Tamam' },
        { text: 'İşaretle', onPress: () => router.push('/toplanma/sec') },
      ]);
    setName(p.name);
    fam.updateMeetingPoint({
      name: p.name,
      note: note.trim() || null,
      latitude: p.latitude,
      longitude: p.longitude,
      updatedAt: new Date().toISOString(),
    });
    router.back();
  };

  return (
    <Page keyboard>
      {fam.meetingPoint ? (
        <Card style={{ gap: 4 }}>
          <AppText variant="heading">{fam.meetingPoint.name}</AppText>
          <AppText variant="caption">
            {fam.meetingPoint.latitude != null ? 'Konumu kayıtlı' : 'Konumsuz'} · {relativeTimeTr(fam.meetingPoint.updatedAt)} güncellendi
          </AppText>
          {fam.meetingPoint.latitude != null ? (
            <Button
              size="sm"
              variant="secondary"
              icon="walk-outline"
              label="Yol tarifi"
              onPress={() =>
                openDirections({
                  latitude: fam.meetingPoint!.latitude!,
                  longitude: fam.meetingPoint!.longitude!,
                  name: fam.meetingPoint!.name,
                })
              }
            />
          ) : null}
        </Card>
      ) : null}
      <AppText variant="label">
        Deprem sonrası telefonlar çalışmazsa ailecek buluşacağınız yeri belirleyin. Bu yer durum mesajlarınıza eklenir.
      </AppText>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="ör. Mahalle parkı, okul bahçesi"
        placeholderTextColor={colors.textMuted}
        maxLength={80}
        style={styles.input}
        accessibilityLabel="Buluşma noktası adı"
      />
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Not (isteğe bağlı, ör. kuzey kapısı)"
        placeholderTextColor={colors.textMuted}
        maxLength={120}
        style={styles.input}
        accessibilityLabel="Not"
      />
      <Button
        label="Buradayım, konumla kaydet"
        icon="locate-outline"
        disabled={!name.trim() || location.status !== 'granted' || !userCoords}
        onPress={() => save(userCoords)}
      />
      <Button label="Yalnızca adını kaydet" variant="secondary" disabled={!name.trim()} onPress={() => save(null)} />
      <Button label="Toplanma alanımı kullan" variant="ghost" icon="flag-outline" onPress={useAssembly} />
      {fam.meetingPoint ? (
        <Button
          label="Buluşma noktasını kaldır"
          variant="ghost"
          icon="trash-outline"
          onPress={() => {
            fam.updateMeetingPoint(null);
            router.back();
          }}
        />
      ) : null}
    </Page>
  );
}

const styles = themedStyles(() => ({
  input: {
    ...surface.input(),
  },
}));
