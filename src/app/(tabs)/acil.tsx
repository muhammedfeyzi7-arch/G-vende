import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { GuideHome } from '@/features/guide/GuideHome';

/** Acil Durum sekmesi: Acil Durum Rehberi (internetsiz). 112 ve diğer araçlar ekranın altında. */
export default function EmergencyTab() {
  return <GuideHome bottomPad={useBottomTabBarHeight()} />;
}
