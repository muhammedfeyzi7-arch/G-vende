/**
 * Acil durum çantası kontrol listesi. Rehber metinleri src/features/guide/content.ts içindedir
 * (kaynaklı ve doğrulama tarihli).
 *
 * Not: AFAD ilk 72 saat için bir afet ve acil durum çantası önerir (afad.gov.tr, 2018). Aşağıdaki
 * madde listesi genel hazırlık listesidir; AFAD'ın madde madde listesiyle karşılaştırılması bekleniyor
 * (docs/rehber-inceleme.md).
 */
export type KitItem = { id: string; label: string; group: KitGroup };
export type KitGroup = 'Su ve gıda' | 'Sağlık' | 'Aydınlatma ve iletişim' | 'Belgeler ve para' | 'Giysi ve hijyen';
export const KIT_GROUPS: KitGroup[] = ['Su ve gıda', 'Sağlık', 'Aydınlatma ve iletişim', 'Belgeler ve para', 'Giysi ve hijyen'];
export const KIT_ITEMS: KitItem[] = [
  { id: 'water', label: 'Su (kişi başı en az 3 günlük)', group: 'Su ve gıda' },
  { id: 'food', label: 'Bozulmayan, pişirme gerektirmeyen yiyecek', group: 'Su ve gıda' },
  { id: 'firstaid', label: 'İlk yardım çantası', group: 'Sağlık' },
  { id: 'meds', label: 'Düzenli kullanılan ilaçlar ve reçete kopyası', group: 'Sağlık' },
  { id: 'flashlight', label: 'El feneri ve yedek pil', group: 'Aydınlatma ve iletişim' },
  { id: 'radio', label: 'Pilli radyo', group: 'Aydınlatma ve iletişim' },
  { id: 'whistle', label: 'Düdük', group: 'Aydınlatma ve iletişim' },
  { id: 'powerbank', label: 'Şarjlı powerbank ve kablo', group: 'Aydınlatma ve iletişim' },
  { id: 'docs', label: 'Kimlik ve önemli belgelerin kopyaları (su geçirmez poşette)', group: 'Belgeler ve para' },
  { id: 'cash', label: 'Bir miktar nakit para', group: 'Belgeler ve para' },
  { id: 'clothes', label: 'Mevsime uygun yedek kıyafet, battaniye', group: 'Giysi ve hijyen' },
  { id: 'hygiene', label: 'Hijyen malzemeleri, ıslak mendil', group: 'Giysi ve hijyen' },
  { id: 'mask', label: 'Toz maskesi ve iş eldiveni', group: 'Sağlık' },
  { id: 'keys', label: 'Yedek anahtarlar', group: 'Belgeler ve para' },
  { id: 'contacts', label: 'Yazılı acil durum iletişim listesi', group: 'Belgeler ve para' },
];

/** Kartlarda gösterilen kısa ad */
export const KIT_SHORT: Record<string, string> = {
  water: 'Su',
  food: 'Yiyecek',
  firstaid: 'İlk yardım seti',
  meds: 'İlaçlar',
  flashlight: 'Fener',
  radio: 'Pilli radyo',
  whistle: 'Düdük',
  powerbank: 'Powerbank',
  docs: 'Belge kopyaları',
  cash: 'Nakit',
  clothes: 'Yedek kıyafet',
  hygiene: 'Hijyen',
  mask: 'Maske, eldiven',
  keys: 'Yedek anahtar',
  contacts: 'İletişim listesi',
};
