import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { useApp } from '@/providers/AppProvider';
import { colors, spacing, themedStyles } from '@/theme';

/** Arka planda bu süreden uzun kalırsa tekrar kilit istenir. */
const RELOCK_MS = 5 * 60_000;

export async function biometricAvailability(): Promise<{ ok: boolean; reason?: string }> {
  if (!(await LocalAuthentication.hasHardwareAsync())) return { ok: false, reason: 'Bu cihazda biyometrik doğrulama donanımı yok.' };
  if (!(await LocalAuthentication.isEnrolledAsync()))
    return { ok: false, reason: 'Cihazınızda kayıtlı Face ID / parmak izi yok. Önce cihaz ayarlarından ekleyin.' };
  return { ok: true };
}

export async function authenticate(reason: string): Promise<boolean> {
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: 'Vazgeç', disableDeviceFallback: false });
  return r.success;
}

/**
 * Biyometrik uygulama kilidi. Kilit ekranında bile 112 araması her zaman kullanılabilir.
 * Kilit yalnızca kullanıcı açtıysa ve cihaz destekliyorsa devreye girer.
 */
export function BiometricGate({ children }: { children: ReactNode }) {
  const { settings, settingsLoaded } = useApp();
  const [locked, setLocked] = useState(false);
  const bgAt = useRef<number | null>(null);
  const initial = useRef(true);

  const unlock = useCallback(async () => {
    if (await authenticate('GÜVENDE kilidini açın')) setLocked(false);
  }, []);

  useEffect(() => {
    if (!settingsLoaded || !initial.current) return;
    initial.current = false;
    if (settings.biometricLock) {
      setLocked(true);
      unlock();
    }
  }, [settingsLoaded, settings.biometricLock, unlock]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (!settings.biometricLock) return;
      if (s === 'background') bgAt.current = Date.now();
      if (s === 'active' && bgAt.current && Date.now() - bgAt.current > RELOCK_MS) {
        bgAt.current = null;
        setLocked(true);
        unlock();
      }
    });
    return () => sub.remove();
  }, [settings.biometricLock, unlock]);

  if (!locked) return <>{children}</>;
  return (
    <View style={styles.lock}>
      <Ionicons name="lock-closed" size={48} color={colors.primary} />
      <AppText variant="title">GÜVENDE kilitli</AppText>
      <AppText variant="label" style={{ textAlign: 'center' }}>
        Devam etmek için Face ID / parmak izi ile doğrulayın.
      </AppText>
      <Button label="Kilidi aç" icon="finger-print" onPress={unlock} style={{ alignSelf: 'stretch' }} />
      <Button label="112’yi ara" icon="call" variant="danger" onPress={() => Linking.openURL('tel:112')} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

const styles = themedStyles(() => ({
  lock: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
}));
