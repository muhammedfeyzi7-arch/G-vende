import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Share } from 'react-native';
import { useApp } from '@/providers/AppProvider';
import { coarsen, type LatLng } from '@/utils/geo';
import { addressFor } from '@/features/location/currentAddress';
import { ASK_STATUS_MESSAGE, buildStatusMessage, sendSms, type StatusKind } from './local';
import { useLocalFamily } from './useLocalFamily';

/**
 * Aile/acil kişi eylemleri. Tüm SMS'ler cihazın kendi mesaj uygulamasında hazırlanır ve
 * kullanıcı "Gönder"e basmadan gitmez. Konum, yalnızca konum paylaşımı açıksa ve GPS
 * konumu varsa eklenir; "Konumumu gizle" listesindeki kişilere konumsuz mesaj gider.
 */
export function useFamilyActions() {
  const { settings, location, requestLocation, online } = useApp();
  const fam = useLocalFamily();

  const ensureContacts = useCallback(() => {
    if (fam.contacts.length) return true;
    Alert.alert('Acil durum kişisi yok', 'Önce Ailem sekmesinden kişi ekleyin. Kişiler yalnızca bu cihazda saklanır.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kişi ekle', onPress: () => router.push('/ailem') },
    ]);
    return false;
  }, [fam.contacts.length]);

  const currentGps = useCallback(async (): Promise<LatLng | null> => {
    if (location.status === 'granted') return location.coords;
    if (location.status === 'denied' && !location.canAskAgain) return null;
    const next = await requestLocation();
    return next.status === 'granted' ? next.coords : null;
  }, [location, requestLocation]);

  const sendStatus = useCallback(
    async (kind: StatusKind) => {
      if (!ensureContacts()) return;
      Haptics.notificationAsync(
        kind === 'safe' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
      const gps = settings.locationSharing ? await currentGps() : null;
      const loc = gps ? coarsen(gps, 0.001) : null;
      const withLoc = fam.contacts.filter((c) => !settings.hideLocationFrom.includes(c.id));
      const withoutLoc = fam.contacts.filter((c) => settings.hideLocationFrom.includes(c.id));
      const groups = loc && withoutLoc.length ? [[withLoc, loc] as const, [withoutLoc, null] as const] : [[fam.contacts, loc] as const];
      // Açık adres yalnızca konum paylaşılan kişilere eklenir (4 sn'de bulunamazsa yalnızca harita bağlantısı).
      const address = loc ? await addressFor(gps!, 4000, online) : null;
      let anySent = false;
      for (const [list, l] of groups) {
        if (!list.length) continue;
        const r = await sendSms(
          list.map((c) => c.phone),
          buildStatusMessage(kind, { location: l, meetingPoint: fam.meetingPoint, address: l ? address : null }),
        );
        if (!r.ok) return Alert.alert('Gönderilemedi', r.reason);
        if (r.status !== 'cancelled') anySent = true;
      }
      if (anySent) fam.setMyStatus({ kind: kind === 'safe' ? 'safe' : 'help', at: new Date().toISOString() });
    },
    [ensureContacts, settings.locationSharing, settings.hideLocationFrom, currentGps, fam, online],
  );

  const confirmHelp = useCallback(
    () =>
      Alert.alert(
        'Yardım mesajı',
        'Acil durum kişilerinize yardıma ihtiyacınız olduğunu bildiren SMS hazırlanacak. Hayati tehlike varsa önce 112’yi arayın.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'SMS hazırla', onPress: () => sendStatus('need_help') },
        ],
      ),
    [sendStatus],
  );

  const askEveryone = useCallback(async () => {
    if (!ensureContacts()) return;
    const r = await sendSms(
      fam.contacts.map((c) => c.phone),
      ASK_STATUS_MESSAGE,
    );
    if (!r.ok) return Alert.alert('Gönderilemedi', r.reason);
    if (r.status !== 'cancelled')
      fam.setContactStatus(
        fam.contacts.map((c) => c.id),
        'waiting',
      );
  }, [ensureContacts, fam]);

  const shareLocation = useCallback(async () => {
    const gps = await currentGps();
    if (!gps) {
      return Alert.alert('Konum alınamadı', 'Konumunuzu paylaşmak için konum iznini açın.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Konum ayarları', onPress: () => router.push('/konum') },
      ]);
    }
    const p = coarsen(gps, 0.0001);
    const text = `GÜVENDE: Şu anki konumum https://maps.google.com/?q=${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;
    const targets = fam.contacts.filter((c) => !settings.hideLocationFrom.includes(c.id));
    Alert.alert('Konumunu paylaş', 'Konumunuz yalnızca bu bir defalığına, seçtiğiniz kişilerle paylaşılır.', [
      { text: 'Vazgeç', style: 'cancel' },
      ...(targets.length
        ? [
            {
              text: `Acil kişilerime SMS (${targets.length})`,
              onPress: async () => {
                const r = await sendSms(
                  targets.map((c) => c.phone),
                  text,
                );
                if (!r.ok) Alert.alert('Gönderilemedi', r.reason);
              },
            },
          ]
        : []),
      { text: 'Başka uygulamayla paylaş', onPress: () => Share.share({ message: text }) },
    ]);
  }, [currentGps, fam.contacts, settings.hideLocationFrom]);

  return { ...fam, sendStatus, confirmHelp, askEveryone, shareLocation };
}
