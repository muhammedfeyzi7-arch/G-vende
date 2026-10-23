import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/services/haptics';
import { colors, radius, spacing, themedStyles } from '@/theme';
import { AppText } from './ui';

type Tone = 'success' | 'info' | 'warning' | 'error';
export interface ToastInput {
  text: string;
  tone?: Tone;
  /** İsteğe bağlı eylem (ör. "Geri al", "Gör") */
  action?: { label: string; onPress: () => void };
}

const Ctx = createContext<{ show: (t: ToastInput) => void }>({ show: () => {} });

const TONE = (): Record<Tone, { icon: string; color: string }> => ({
  success: { icon: 'checkmark-circle', color: colors.safe },
  info: { icon: 'information-circle', color: colors.primary },
  warning: { icon: 'warning', color: colors.warning },
  error: { icon: 'close-circle', color: colors.danger },
});

/**
 * Alt kısımda kısa süreli bilgi kutusu (toast). Başarı/bilgi mesajları için Alert yerine kullanılır;
 * kullanıcının akışını kesmez. Ekran okuyucuya ayrıca duyurulur.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<(ToastInput & { key: number }) | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setToast(null));
  }, [anim]);

  const show = useCallback(
    (t: ToastInput) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ ...t, key: Date.now() });
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }).start();
      if (t.tone === 'error' || t.tone === 'warning') haptic.warn();
      else if (t.tone !== 'info') haptic.success();
      AccessibilityInfo.announceForAccessibility?.(t.text);
      timer.current = setTimeout(hide, t.action ? 4500 : 2600);
    },
    [anim, hide],
  );
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const value = useMemo(() => ({ show }), [show]);
  const tone = toast ? TONE()[toast.tone ?? 'success'] : null;
  return (
    <Ctx.Provider value={value}>
      {children}
      {toast && tone ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            { bottom: insets.bottom + 92 },
            { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] },
          ]}
        >
          <View style={styles.toast} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Ionicons name={tone.icon as never} size={20} color={tone.color} />
            <AppText variant="label" color={colors.text} style={{ flex: 1, fontSize: 13 }}>
              {toast.text}
            </AppText>
            {toast.action ? (
              <Pressable
                onPress={() => {
                  toast.action!.onPress();
                  hide();
                }}
                accessibilityRole="button"
                hitSlop={8}
              >
                <AppText variant="label" color={colors.primary} style={{ fontWeight: '700' }}>
                  {toast.action.label}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

const styles = themedStyles(() => ({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 520,
    width: '100%',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
  },
}));
