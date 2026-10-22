/**
 * Çevrimdışı güvenlik talimatları. Metinler uygulama paketine gömülüdür (internet gerektirmez).
 *
 * Kaynak: AFAD'ın kamuya açık afet bilinci içerikleri (afad.gov.tr) — "Deprem Anında",
 * "Deprem Sonrası" ve "Afet ve Acil Durum Çantası" önerilerinden özetlenmiştir.
 * YAYIN ÖNCESİ: Metinler AFAD'ın güncel resmî metinleriyle karşılaştırılıp onaylanmalıdır.
 */
export const CONTENT_SOURCE = {
  name: 'AFAD — Afet Bilinci içerikleri (özet)',
  url: 'https://www.afad.gov.tr/afet-bilinci',
  reviewedAt: null as string | null, // Resmî metinle karşılaştırma tarihi girilmeli
};

export type GuideSection = { id: string; title: string; summary: string; icon: string; color: string; steps: string[] };

export const GUIDES: GuideSection[] = [
  {
    id: 'during',
    title: 'Deprem anında: Çök – Kapan – Tutun',
    summary: 'Sarsıntı sırasında içerideyseniz',
    icon: 'shield-half-outline',
    color: '#FF3548',
    steps: [
      'Sakin olun; panikle merdivene, asansöre veya balkona koşmayın.',
      'Sağlam bir masa ya da mobilyanın yanına ÇÖKÜN.',
      'Başınızı ve boynunuzu kollarınızla koruyarak KAPANIN.',
      'Sarsıntı bitene kadar bulunduğunuz yere TUTUNUN.',
      'Pencere, cam, devrilebilecek dolap ve asılı eşyalardan uzak durun.',
      'Yataktaysanız yüzüstü dönüp başınızı yastıkla koruyun.',
      'Asansör kullanmayın; asansördeyseniz tüm katların düğmesine basıp ilk durakta inin.',
    ],
  },
  {
    id: 'outside',
    title: 'Dışarıdaysanız',
    summary: 'Açık alanda sarsıntıya yakalanırsanız',
    icon: 'walk-outline',
    color: '#14D99A',
    steps: [
      'Binalardan, elektrik direklerinden, ağaçlardan ve duvar diplerinden uzaklaşın.',
      'Açık bir alanda çömelerek başınızı koruyun.',
      'Kıyıdaysanız ve sarsıntı uzun sürdüyse yüksek yerlere çıkın (tsunami riski).',
    ],
  },
  {
    id: 'vehicle',
    title: 'Araçtaysanız',
    summary: 'Sürüş sırasında sarsıntı',
    icon: 'car-outline',
    color: '#1683FF',
    steps: [
      'Aracı yolu kapatmadan sağa çekin; köprü, viadük, tünel ve binalardan uzak durun.',
      'Sarsıntı bitene kadar araçta kalın.',
      'Ambulans ve itfaiye için yolu açık bırakın.',
    ],
  },
  {
    id: 'after',
    title: 'Deprem sonrası',
    summary: 'Sarsıntı bittikten sonra yapılacaklar',
    icon: 'home-outline',
    color: '#FF8A24',
    steps: [
      'Önce kendinizi, sonra çevrenizdekileri kontrol edin; yaralılar için 112’yi arayın.',
      'Gaz kokusu varsa kibrit, çakmak ve elektrik düğmesi kullanmayın; vanayı kapatın.',
      'Hasarlı binalara girmeyin; artçı sarsıntılara hazırlıklı olun.',
      'Belirlenmiş toplanma alanına gidin; yolda hasarlı yapılardan uzak durun.',
      'Telefonu yalnızca acil durumlarda kullanın; hatları meşgul etmeyin, kısa mesaj tercih edin.',
      'Resmî açıklamaları AFAD ve yerel yönetimlerden takip edin; doğrulanmamış bilgiyi yaymayın.',
    ],
  },
  {
    id: 'trapped',
    title: 'Enkaz altındaysanız',
    summary: 'Sesinizi duyurun, enerjinizi koruyun',
    icon: 'mci:whistle',
    color: '#FFC21A',
    steps: [
      'Hareketlerinizi kısıtlayın, toz kalkmaması için ağzınızı kumaşla kapatın.',
      'Boru veya duvara vurarak sesinizi duyurun; enerjinizi korumak için sürekli bağırmayın.',
      'Kibrit veya çakmak yakmayın.',
      'Telefonunuz çalışıyorsa 112’yi arayın veya konumunuzu SMS ile gönderin; uygulamadaki düdük ve SOS ışığını kullanın.',
    ],
  },
  {
    id: 'fire',
    title: 'Yangın',
    summary: 'Deprem sonrası yangın ve gaz kaçağı',
    icon: 'flame-outline',
    color: '#FF3548',
    steps: [
      'Yangını fark ederseniz hemen 112’yi arayın.',
      'Küçük ve başlangıç aşamasındaki yangına yalnızca güvenle çıkış yolunuz varsa yangın tüpüyle müdahale edin.',
      'Duman varsa eğilerek, ağzınızı ve burnunuzu ıslak bezle kapatarak ilerleyin.',
      'Kapıyı açmadan önce elinizin tersiyle sıcaklığını kontrol edin; sıcaksa açmayın.',
      'Gaz kokusu alıyorsanız elektrik düğmelerine dokunmayın, vanayı kapatıp ortamı terk edin.',
      'Asansör kullanmayın; binayı merdivenle terk edin.',
    ],
  },
  {
    id: 'injury',
    title: 'Yaralanma (temel ilk yardım)',
    summary: 'Uzman ekip gelene kadar',
    icon: 'medkit-outline',
    color: '#14D99A',
    steps: [
      'Önce kendi güvenliğinizi sağlayın, sonra 112’yi arayın.',
      'Bilinci açık mı kontrol edin; yaralıyı gereksiz yere hareket ettirmeyin (omurga yaralanması olabilir).',
      'Kanamada temiz bir bezle yaraya doğrudan ve sürekli baskı uygulayın.',
      'Yaralıyı sıcak tutun, yiyecek-içecek vermeyin.',
      'Ağır cisim altında uzun süre kalmış kişiyi kendiniz çıkarmaya çalışmayın; ekipleri bekleyin.',
      'Bilgi ve eğitiminiz yoksa ileri müdahalede bulunmayın; Kızılay ilk yardım eğitimlerini değerlendirin.',
    ],
  },
  {
    id: 'evacuation',
    title: 'Tahliye',
    summary: 'Binadan güvenli çıkış',
    icon: 'exit-outline',
    color: '#8B5CF6',
    steps: [
      'Sarsıntı tamamen bitmeden dışarı çıkmaya çalışmayın.',
      'Ayakkabı giyin; kırık cam ve molozlara dikkat edin.',
      'Elektrik ve gazı kapatın, kapıyı kapatarak çıkın.',
      'Merdivenleri kullanın, asansöre binmeyin; balkon ve pencereden atlamayın.',
      'Binadan uzaklaşıp önceden belirlediğiniz toplanma alanına gidin.',
      'Hasarlı binalara eşya almak için geri dönmeyin.',
    ],
  },
];

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
