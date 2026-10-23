import Constants, { ExecutionEnvironment } from 'expo-constants';
import { forwardRef, type ComponentType, type RefAttributes } from 'react';
import type { QuakeMapHandle, QuakeMapProps } from './mapTypes';
import { SvgQuakeMap } from './SvgQuakeMap';

export * from './mapTypes';

type MapComponent = ComponentType<QuakeMapProps & RefAttributes<QuakeMapHandle>>;

/**
 * Expo Go yerel harita modülünü (MapLibre) içermez. Expo Go'da uygulamaya gömülü Türkiye altlığıyla
 * çizilen basit SVG harita kullanılır; geliştirme ve mağaza derlemelerinde tam MapLibre haritası.
 * Native modül yalnızca gerektiğinde yüklenir; böylece Expo Go'da uygulama çökmez.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let Native: MapComponent | null = null;
function pick(): MapComponent {
  if (isExpoGo) return SvgQuakeMap as MapComponent;
  try {
    Native ??= require('./QuakeMapNative').QuakeMapNative as MapComponent;
    return Native;
  } catch {
    return SvgQuakeMap as MapComponent;
  }
}

export const QuakeMap = forwardRef<QuakeMapHandle, QuakeMapProps>(function QuakeMap(props, ref) {
  const Impl = pick();
  return <Impl {...props} ref={ref} />;
});
