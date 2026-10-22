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

export type GuideSection = {
  id: string;
  title: string;
  icon: 'shield-half-outline' | 'walk-outline' | 'home-outline' | 'car-outline' | 'water-outline';
  steps: string[];
};

export const GUIDES: GuideSection[] = [
  {
    id: 'during',
    title: 'Deprem anında: Çök – Kapan – Tutun',
    icon: 'shield-half-outline',
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
    icon: 'walk-outline',
    steps: [
      'Binalardan, elektrik direklerinden, ağaçlardan ve duvar diplerinden uzaklaşın.',
      'Açık bir alanda çömelerek başınızı koruyun.',
      'Kıyıdaysanız ve sarsıntı uzun sürdüyse yüksek yerlere çıkın (tsunami riski).',
    ],
  },
  {
    id: 'vehicle',
    title: 'Araçtaysanız',
    icon: 'car-outline',
    steps: [
      'Aracı yolu kapatmadan sağa çekin; köprü, viadük, tünel ve binalardan uzak durun.',
      'Sarsıntı bitene kadar araçta kalın.',
      'Ambulans ve itfaiye için yolu açık bırakın.',
    ],
  },
  {
    id: 'after',
    title: 'Deprem sonrası',
    icon: 'home-outline',
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
    icon: 'water-outline',
    steps: [
      'Hareketlerinizi kısıtlayın, toz kalkmaması için ağzınızı kumaşla kapatın.',
      'Boru veya duvara vurarak sesinizi duyurun; enerjinizi korumak için sürekli bağırmayın.',
      'Kibrit veya çakmak yakmayın.',
    ],
  },
];

export type KitItem = { id: string; label: string };
export const KIT_ITEMS: KitItem[] = [
  { id: 'water', label: 'Su (kişi başı en az 3 günlük)' },
  { id: 'food', label: 'Bozulmayan, pişirme gerektirmeyen yiyecek' },
  { id: 'firstaid', label: 'İlk yardım çantası' },
  { id: 'meds', label: 'Düzenli kullanılan ilaçlar ve reçete kopyası' },
  { id: 'flashlight', label: 'El feneri ve yedek pil' },
  { id: 'radio', label: 'Pilli radyo' },
  { id: 'whistle', label: 'Düdük' },
  { id: 'powerbank', label: 'Şarjlı powerbank ve kablo' },
  { id: 'docs', label: 'Kimlik ve önemli belgelerin kopyaları (su geçirmez poşette)' },
  { id: 'cash', label: 'Bir miktar nakit para' },
  { id: 'clothes', label: 'Mevsime uygun yedek kıyafet, battaniye' },
  { id: 'hygiene', label: 'Hijyen malzemeleri, ıslak mendil' },
  { id: 'mask', label: 'Toz maskesi ve iş eldiveni' },
  { id: 'keys', label: 'Yedek anahtarlar' },
  { id: 'contacts', label: 'Yazılı acil durum iletişim listesi' },
];
