import type { UserReport } from '@/types/report';

/**
 * YALNIZCA GELİŞTİRME: Backend yokken tasarımı görmek için örnek kayıtlar.
 * `env.demoReports` yalnızca __DEV__ derlemelerinde true olabilir ve ekranda
 * "ÖRNEK VERİ" etiketiyle gösterilir. Gerçek kullanıcı bildirimi değildir.
 */
export function buildSampleReports(now = Date.now()): UserReport[] {
  const at = (min: number) => new Date(now - min * 60_000).toISOString();
  const base = { earthquakeEventId: null, verification: 'unverified' as const, media: [], isSample: true };
  return [
    { ...base, id: 's1', category: 'shake', feltIntensity: 4, description: 'Sarsıntı hissettim.', latitude: 40.84, longitude: 31.16, areaLabel: 'Düzce · Merkez', helpfulCount: 0, createdAt: at(1) },
    { ...base, id: 's2', category: 'damage', feltIntensity: null, description: 'Örnek hasar bildirimi metni.', latitude: 40.78, longitude: 30.99, areaLabel: 'Düzce · Gölyaka', helpfulCount: 0, createdAt: at(2) },
    { ...base, id: 's3', category: 'road', feltIntensity: null, description: 'Yolda geçiş engeli var.', latitude: 40.85, longitude: 31.05, areaLabel: 'Düzce · Aydınpınar', helpfulCount: 0, createdAt: at(3) },
    { ...base, id: 's4', category: 'safe', feltIntensity: null, description: 'Güvendeyiz.', latitude: 40.88, longitude: 29.23, areaLabel: 'İstanbul · Pendik', helpfulCount: 0, createdAt: at(4) },
    { ...base, id: 's5', category: 'help', feltIntensity: null, description: 'Yardıma ihtiyaç var.', latitude: 40.83, longitude: 31.17, areaLabel: 'Düzce · Merkez', helpfulCount: 0, createdAt: at(5) },
    { ...base, id: 's6', category: 'shake', feltIntensity: 2, description: null, latitude: 40.69, longitude: 30.4, areaLabel: 'Sakarya · Adapazarı', helpfulCount: 0, createdAt: at(6) },
    { ...base, id: 's7', category: 'shake', feltIntensity: 3, description: null, latitude: 40.77, longitude: 29.92, areaLabel: 'Kocaeli · İzmit', helpfulCount: 0, createdAt: at(7) },
    { ...base, id: 's8', category: 'shake', feltIntensity: 1, description: null, latitude: 40.14, longitude: 29.98, areaLabel: 'Bilecik · Merkez', helpfulCount: 0, createdAt: at(9) },
  ];
}
