import type { QuakeSourceId } from '@/types/earthquake';

export type MapStyleId = 'dark' | 'satellite' | 'light';
export type ThemePref = 'system' | 'dark' | 'light';

export interface Settings {
  /** Resmî kurum kaynaklı deprem kayıtları için bildirim (M eşiğinin üzerinde) */
  officialNotifications: boolean;
  /** Yakındaki kullanıcı bildirimleri (topluluk) */
  communityNotifications: boolean;
  /**
   * Konum paylaşımı (yalnızca ailem): açıkken durum mesajlarına ve aile grubu bildirimlerine
   * konum eklenir. Kapalıyken hiçbir yere konum gönderilmez; arka planda konum toplanmaz.
   */
  locationSharing: boolean;
  /** Konum gönderilmeyecek yerel kişi kimlikleri */
  hideLocationFrom: string[];
  mapStyle: MapStyleId;
  /** Uygulama teması: cihazla aynı, koyu veya açık */
  theme: ThemePref;
  /** Uygulama açılırken Face ID / parmak izi iste */
  biometricLock: boolean;
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
  officialNotifications: true,
  communityNotifications: false,
  locationSharing: false,
  hideLocationFrom: [],
  mapStyle: 'satellite',
  theme: 'system',
  biometricLock: false,
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
