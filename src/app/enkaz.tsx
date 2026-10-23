import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Brightness from 'expo-brightness';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { useFamilyActions } from '@/features/family/useFamilyActions';
import { call112 } from '@/features/home/tabs';
import { floorLabel, loadFloor } from '@/features/rubble/floor';
import { SAVER_CYCLE_MS, torchStepsFor, type RubbleMode } from '@/features/rubble/plan';
import { radius, spacing } from '@/theme';

const SIREN = require('../../assets/sounds/siren-3k.wav');
const DIM = 0.02;
const CONTROLS_MS = 15_000;

/**
 * Enkaz Altı Modu: ekran siyah ve en düşük parlaklıkta (pil), ekran kilitlenmez (kilitlenirse siren
 * durur), siren ~3 kHz'te (insan kulağının en hassas olduğu aralık) aralıklı çalar, kamera flaşı SOS verir.
 * İnternet gerekmez. Yanlışlıkla kapanmasın diye çıkış basılı tutmayla olur.
 */
export default function RubbleMode() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const fam = useFamilyActions();
  const [perm, requestPerm] = useCameraPermissions();
  const player = useAudioPlayer(SIREN);
  const [mode, setMode] = useState<RubbleMode>('saver');
  const [torch, setTorch] = useState(false);
  const [controls, setControls] = useState(true);
  const [floor, setFloor] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ekranı karart, çıkınca eski parlaklığa dön.
  useEffect(() => {
    let prev: number | null = null;
    Brightness.getBrightnessAsync()
      .then((b) => {
        prev = b;
        return Brightness.setBrightnessAsync(DIM);
      })
      .catch(() => {});
    loadFloor().then((f) => setFloor(floorLabel(f?.floor)));
    if (perm && !perm.granted && perm.canAskAgain) requestPerm().catch(() => {});
    return () => {
      if (prev != null) Brightness.setBrightnessAsync(prev).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perm?.granted]);

  // Siren: sessiz modda da çalar; uygulama arka plana geçse bile sürer.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
    return () => player.pause();
  }, [player]);

  // Zamanlayıcı: döngü başında siren + SOS flaşı; pil korumada sonra 30 sn'ye tamamlanana kadar bekleme.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const { steps, repeatAfterMs } = torchStepsFor(mode);
    player.volume = 1;
    if (mode === 'continuous') {
      player.loop = true;
      player.seekTo(0);
      player.play();
    } else player.loop = false;

    const runCycle = () => {
      if (cancelled) return;
      if (mode === 'saver') {
        player.seekTo(0);
        player.play();
      }
      let i = 0;
      const step = () => {
        if (cancelled) return;
        if (i >= steps.length) {
          setTorch(false);
          timer = setTimeout(runCycle, repeatAfterMs);
          return;
        }
        const [lit, ms] = steps[i++]!;
        setTorch(lit);
        timer = setTimeout(step, ms);
      };
      step();
    };
    runCycle();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      setTorch(false);
      player.pause();
    };
  }, [mode, player]);

  const showControls = useCallback(() => {
    setControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), CONTROLS_MS);
  }, []);
  useEffect(() => {
    showControls();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [showControls]);

  const torchOk = !!perm?.granted;

  return (
    <Pressable style={styles.screen} onPress={showControls} accessibilityLabel="Kontrolleri göstermek için dokunun">
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <StatusBar hidden />
      {/* Görüntü kaydedilmez: kamera yalnızca flaşı yakmak için görünmez biçimde açılır. */}
      {torchOk ? <CameraView style={styles.hiddenCamera} enableTorch={torch} facing="back" /> : null}

      {controls ? (
        <View style={[styles.panel, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="display" color="#FF6B6B" style={{ fontSize: 26 }}>
              Enkaz Altı Modu açık
            </AppText>
            <AppText variant="body" color="#C9D3DD">
              Siren {mode === 'saver' ? `her ${SAVER_CYCLE_MS / 1000} saniyede bir` : 'sürekli'} çalıyor
              {torchOk ? ', flaş SOS veriyor.' : '. Flaş için kamera izni verilmedi.'} Ekran pil için karartıldı.
            </AppText>
            <AppText variant="label" color="#8FA3B8">
              Ses tuşlarıyla sesi en yükseğe alın. Mümkünse telefonu boşluğa doğru tutun; nefesinizi ve gücünüzü koruyun, sesi
              duyduğunuzda vurarak da işaret verin.
            </AppText>
            {floor ? (
              <AppText variant="label" color="#C9D3DD">
                Kayıtlı katınız: {floor}
              </AppText>
            ) : null}
          </View>

          <View style={{ flex: 1 }} />
          <View style={styles.segment}>
            {(['saver', 'continuous'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setMode(m);
                  showControls();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === m }}
                style={[styles.segBtn, mode === m && styles.segActive]}
              >
                <AppText variant="label" color="#fff" style={{ fontWeight: '700' }}>
                  {m === 'saver' ? 'Pil koruma (önerilen)' : 'Sürekli'}
                </AppText>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={() => fam.sendStatus('trapped')} accessibilityRole="button" style={[styles.big, { backgroundColor: '#D7263D' }]}>
            <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
            <AppText variant="heading" color="#fff">
              “Enkaz altındayım” SMS’i
            </AppText>
          </Pressable>
          <AppText variant="caption" color="#8FA3B8" style={{ textAlign: 'center' }}>
            İnternet gerekmez; konumunuz, adresiniz ve katınızla telefonunuzun SMS uygulaması açılır. Gönder’e siz basarsınız.
          </AppText>
          <Pressable onPress={call112} accessibilityRole="button" style={[styles.big, { backgroundColor: '#1B2A3A' }]}>
            <Ionicons name="call" size={22} color="#fff" />
            <AppText variant="heading" color="#fff">
              112’yi ara
            </AppText>
          </Pressable>

          <Pressable
            onLongPress={() => router.back()}
            delayLongPress={1200}
            accessibilityRole="button"
            accessibilityLabel="Enkaz Altı Modunu kapat"
            accessibilityHint="Kapatmak için basılı tutun"
            style={styles.exit}
          >
            <AppText variant="label" color="#8FA3B8">
              Kapatmak için basılı tutun
            </AppText>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.hint, { paddingBottom: insets.bottom + spacing.lg }]}>
          <AppText variant="caption" color="#3A4A5A">
            Enkaz Altı Modu açık · kontroller için dokunun
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  hiddenCamera: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  panel: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  segment: { flexDirection: 'row', backgroundColor: '#111A24', borderRadius: radius.pill, padding: 4 },
  segBtn: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  segActive: { backgroundColor: '#1683FF' },
  big: { minHeight: 60, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  exit: { minHeight: 52, borderRadius: radius.pill, borderWidth: 1, borderColor: '#23313F', alignItems: 'center', justifyContent: 'center' },
  hint: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
});
