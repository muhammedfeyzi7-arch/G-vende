import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { EmergencyHome } from '@/features/emergency/EmergencyHome';

/** Acil Durum sekmesi: 112 ve hızlı yardım önce; araçlar ve kısa rehber ardından (internetsiz). */
export default function EmergencyTab() {
  return <EmergencyHome bottomPad={useBottomTabBarHeight()} />;
}
