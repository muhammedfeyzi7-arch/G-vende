import * as Brightness from 'expo-brightness';
import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { radius, spacing } from '@/theme';

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

/** Ekranı tam parlaklıkta beyaz yapar; sürekli veya SOS kodu ile yanıp söner. */
export default function LightScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'steady' | 'sos'>('steady');
  const [on, setOn] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.lg }]}>
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

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'flex-end' },
  controls: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: radius.pill, padding: 4 },
  segBtn: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  segActive: { backgroundColor: '#1683FF' },
  close: { minHeight: 52, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
});
