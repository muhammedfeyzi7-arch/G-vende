import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Brightness from 'expo-brightness';
import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { radius, spacing, themedStyles } from '@/theme';

// Mors SOS: ... --- ...  (birim = 250 ms)
const U = 250;
const SOS: [boolean, number][] = [
  ...[1, 1, 1].flatMap((): [boolean, number][] => [
    [true, U],
    [false, U],
  ]),
  [false, 2 * U],
  ...[1, 1, 1].flatMap((): [boolean, number][] => [
    [true, 3 * U],
    [false, U],
  ]),
  [false, 2 * U],
  ...[1, 1, 1].flatMap((): [boolean, number][] => [
    [true, U],
    [false, U],
  ]),
  [false, 6 * U],
];

/**
 * Fener: cihazın LED flaşı (kamera izniyle, expo-camera torch) ve tam parlaklıkta beyaz ekran;
 * sürekli veya SOS kodu ile yanıp söner. LED desteklenmiyor ya da izin yoksa açıkça söylenir,
 * ekran ışığı çalışmaya devam eder.
 */
export default function LightScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { led: ledParam } = useLocalSearchParams<{ led?: string }>();
  const [mode, setMode] = useState<'steady' | 'sos'>('steady');
  const [on, setOn] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [perm, requestPerm] = useCameraPermissions();
  const [led, setLed] = useState(false);
  const [ledError, setLedError] = useState<string | null>(null);
  const ledSupported = Platform.OS !== 'web';

  const toggleLed = async () => {
    if (led) return setLed(false);
    if (!ledSupported) return setLedError('Bu cihazda LED fener desteklenmiyor; ekran ışığı kullanılıyor.');
    const p = perm?.granted ? perm : await requestPerm();
    if (!p.granted) return setLedError('LED fener için kamera izni gerekiyor. İzin verilmedi; ekran ışığı kullanılıyor.');
    setLedError(null);
    setLed(true);
  };
  // "Fener" kısayoluyla açılınca LED otomatik denenir.
  useEffect(() => {
    if (ledParam === '1') void toggleLed();
  }, []);

  useEffect(() => {
    let prev: number | null = null;
    Brightness.getBrightnessAsync()
      .then((b) => {
        prev = b;
        return Brightness.setBrightnessAsync(1);
      })
      .catch(() => {});
    return () => {
      if (prev != null) Brightness.setBrightnessAsync(prev).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (mode === 'steady') {
      setOn(true);
      return;
    }
    let i = 0;
    const step = () => {
      const [lit, ms] = SOS[i % SOS.length]!;
      setOn(lit);
      i++;
      timer.current = setTimeout(step, ms);
    };
    step();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [mode]);

  return (
    <View style={[styles.screen, { backgroundColor: on ? '#FFFFFF' : '#000000' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar hidden />
      {led ? (
        <CameraView
          style={styles.hiddenCamera}
          facing="back"
          enableTorch={mode === 'steady' ? true : on}
          onMountError={() => {
            setLed(false);
            setLedError('LED fener açılamadı (cihaz desteklemiyor olabilir); ekran ışığı kullanılıyor.');
          }}
        />
      ) : null}
      <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.lg }]}>
        {ledError ? (
          <View style={styles.note} accessibilityRole="alert">
            <AppText variant="label" color="#fff">
              {ledError}
            </AppText>
          </View>
        ) : null}
        <Pressable
          onPress={toggleLed}
          accessibilityRole="switch"
          accessibilityState={{ checked: led }}
          accessibilityLabel="LED fener"
          style={[styles.ledBtn, led && { backgroundColor: '#F7B548' }]}
        >
          <AppText variant="heading" color={led ? '#1A1200' : '#fff'}>
            {led ? 'LED fener açık' : 'LED feneri aç'}
          </AppText>
        </Pressable>
        <View style={styles.segment}>
          {(['steady', 'sos'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === m }}
              style={[styles.segBtn, mode === m && styles.segActive]}
            >
              <AppText variant="heading" color={mode === m ? '#fff' : '#333'}>
                {m === 'steady' ? 'Sürekli' : 'SOS'}
              </AppText>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.close}>
          <AppText variant="heading" color="#fff">
            Kapat
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, justifyContent: 'flex-end' },
  controls: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: radius.pill, padding: 4 },
  segBtn: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  segActive: { backgroundColor: '#1683FF' },
  hiddenCamera: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  note: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: 'rgba(0,0,0,0.8)' },
  ledBtn: { minHeight: 52, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  close: { minHeight: 52, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
}));
