import type { QuakeSourceId } from '@/types/earthquake';

export interface Settings {
  /** Konum izni yoksa kullanıcının elle seçtiği il */
  manualProvince: string | null;
  quakeNotifications: boolean;
  familyNotifications: boolean;
  minNotifyMagnitude: number;
  /** Aynı bölge için en kısa bildirim aralığı (dk) — tekrar eden bildirimleri azaltır */
  notifyIntervalMinutes: number;
  /** Listede/haritada gösterilecek en küçük büyüklük */
  minListMagnitude: number;
  enabledSources: QuakeSourceId[];
  /** Bildirim gönderirken yaklaşık konumu varsayılan olarak ekle */
  attachLocationByDefault: boolean;
  /** Acil durum bilgileri (yalnızca bu cihazda saklanır) */
  emergencyInfo: { bloodType: string; conditions: string; medications: string; contacts: string };
  /** Afet çantası kontrol listesinde işaretli maddeler */
  kitChecked: string[];
  /** Aile grubu bilgilerini (ad, son durum) çevrimdışı erişim için cihazda sakla — kullanıcı izniyle */
  cacheFamilyOffline: boolean;
  onboardingSeen: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  manualProvince: null,
  quakeNotifications: true,
  familyNotifications: true,
  minNotifyMagnitude: 4.0,
  notifyIntervalMinutes: 10,
  minListMagnitude: 2.0,
  enabledSources: ['afad', 'kandilli', 'usgs'],
  attachLocationByDefault: true,
  emergencyInfo: { bloodType: '', conditions: '', medications: '', contacts: '' },
  kitChecked: [],
  cacheFamilyOffline: false,
  onboardingSeen: false,
};
