import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuideHome } from '@/features/guide/GuideHome';

/** Rehber bağlantıları (ana sayfa kartı, bildirimler) Acil Durum sekmesiyle aynı ekranı açar. */
export default function GuideCenter() {
  return <GuideHome back bottomPad={useSafeAreaInsets().bottom} />;
}
