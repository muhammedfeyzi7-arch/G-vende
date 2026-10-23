import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Dokunsal geri bildirim: web'de ve desteklenmeyen cihazlarda sessizce yok sayılır. */
const safe = (fn: () => Promise<unknown>) => {
  if (Platform.OS === 'web') return;
  try {
    fn()?.catch?.(() => {});
  } catch {
    // Titreşim desteklenmiyor
  }
};
export const haptic = {
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle?.Light)),
  select: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warn: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
