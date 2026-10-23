import { useMemo } from 'react';
import { useTrust } from '@/features/trust/TrustProvider';
import { isInstitution } from '@/features/trust/rules';
import { useApp } from '@/providers/AppProvider';
import type { LatLng } from '@/utils/geo';
import { findGateQuake, type GateQuake } from './quakeGate';

/**
 * Olay bildirimi bu konumda açık mı? `point` verilmezse yaklaşık konum kullanılır (giriş noktalarını
 * göstermek/gizlemek için). Süzülmemiş deprem listesi kullanılır; liste ayarındaki alt sınırdan etkilenmez.
 */
export function useReportGate(point?: LatLng | null): { located: boolean; known: boolean; quake: GateQuake | null } {
  const { quakes, userCoords } = useApp();
  const at = point ?? userCoords ?? null;
  const events = quakes.snapshot?.events;
  // known=false: güncel deprem verisi yok (kaynaklara ulaşılamadı veya senkron gecikti); bu durumda
  // "deprem yok" denemez, yalnızca "kontrol edilemedi". Önbellekte uygun deprem varsa kapı yine açılır.
  const fresh = !!quakes.snapshot && !quakes.snapshot.stale;
  return useMemo(() => ({ located: !!at, known: fresh, quake: findGateQuake(at, events ?? []) }), [at, events, fresh]);
}

/**
 * "Olay Bildir" girişleri gösterilsin mi? Konum biliniyor ve çevrede resmî deprem kaydı yoksa gizlenir;
 * konum bilinmiyorsa gösterilir (form, GPS ile kesin kontrolü yapar). Kurumsal hesaplar her zaman görür.
 */
export function useCanReport(): boolean {
  const { trust } = useTrust();
  const { located, known, quake } = useReportGate();
  return isInstitution(trust) || !located || !known || !!quake;
}
