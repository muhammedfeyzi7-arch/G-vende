/**
 * Acil Durum Rehberi içeriği — uygulama paketine gömülüdür, internet gerektirmez.
 *
 * KURALLAR
 * - Metinler resmî kaynaklardaki bilgilere dayanan, GÜVENDE'nin kendi kısa ifadeleridir; kaynak metin
 *   birebir kopyalanmaz, kurum görseli/logosu kullanılmaz. Uygulama AFAD'ın resmî uygulaması değildir.
 * - Her madde en az bir kaynağa bağlıdır (`src`). Kaynakla doğrulanamayan veya kaynaklar arasında
 *   çelişki olan maddeler `status: 'review'` ile işaretlenir ve uygulamada GÖSTERİLMEZ
 *   (bkz. docs/rehber-inceleme.md).
 * - İçerik değişince CONTENT_VERSION artırılır ve CHECKED_AT güncellenir.
 */
export const CONTENT_VERSION = '2026.10.23-1';
/** Kaynakların en son karşılaştırıldığı gün (YYYY-AA-GG) */
export const CHECKED_AT = '2026-10-23';
/** Bu süreden eski doğrulama "güncel olmayabilir" uyarısı gösterir. */
export const STALE_AFTER_DAYS = 365;

export type SourceId = 'afad-onlemler' | 'afad-guvende-kal' | 'acm112' | 'guvende';
/** url null: çevrimiçi kaynak değil (uygulamanın kendi işleyişi) */
export type Source = { id: SourceId; org: string; title: string; url: string | null; publishedAt: string | null; checkedAt: string };

export const SOURCES: Record<SourceId, Source> = {
  'afad-onlemler': {
    id: 'afad-onlemler',
    org: 'AFAD',
    title: 'Deprem Öncesi, Anı ve Sonrası Alabileceğiniz Önlemleri Biliyor Musunuz?',
    url: 'https://www.afad.gov.tr/deprem-oncesi-ani-ve-sonrasi-alabileceginiz-onlemleri-biliyor-musunuz',
    publishedAt: '2018-03-05',
    checkedAt: CHECKED_AT,
  },
  'afad-guvende-kal': {
    id: 'afad-guvende-kal',
    org: 'AFAD',
    title: 'Deprem Öncesi, Anı ve Sonrası Önlemini Al, Güvende Kal',
    url: 'https://www.afad.gov.tr/deprem-oncesi-ani-ve-sonrasi-onlemini-al-guvende-kal',
    publishedAt: '2018-03-19',
    checkedAt: CHECKED_AT,
  },
  acm112: {
    id: 'acm112',
    org: 'T.C. İçişleri Bakanlığı — 112 Acil Çağrı Merkezi',
    title: '112 Acil Çağrı Merkezi',
    url: 'https://www.112.gov.tr/',
    publishedAt: null,
    checkedAt: CHECKED_AT,
  },
  guvende: {
    id: 'guvende',
    org: 'GÜVENDE',
    title: 'Uygulamanın çalışma biçimi (resmî kaynak değildir)',
    url: null,
    publishedAt: null,
    checkedAt: CHECKED_AT,
  },
};

/** Türkiye'de tek acil çağrı numarası (kaynak: 112.gov.tr). */
export const EMERGENCY_NUMBER = '112';

export type Item = {
  t: string;
  src: SourceId[];
  /** 'review': kaynakla doğrulanamadı / çelişkili — uygulamada gösterilmez */
  status?: 'review';
  /** İnceleme notu (yalnızca geliştiriciler ve inceleme listesi için) */
  note?: string;
};

export type Category = 'before' | 'during' | 'after' | 'trapped' | 'family';
export type ArtId =
  | 'prep-home'
  | 'prep-plan'
  | 'kit'
  | 'indoor'
  | 'outdoor'
  | 'vehicle'
  | 'transit'
  | 'wheelchair'
  | 'after'
  | 'gas'
  | 'trapped'
  | 'family';

export type Topic = {
  id: string;
  cat: Category;
  title: string;
  /** Kartta görünen kısa açıklama */
  short: string;
  art: ArtId;
  /** Ne yapmalıyım? */
  doList: Item[];
  /** Neden? (konu düzeyinde kısa gerekçe) */
  why: Item[];
  /** Neyi yapmamalıyım? */
  dontList: Item[];
  /** Uygulamadaki ilgili araç */
  link?: { label: string; href: '/canta' | '/enkaz' | '/ailem' | '/toplanma' | '/arama' | '/rehber/hazirlik' };
};

export const CATEGORIES: { id: Category; title: string; short: string; color: string; icon: string }[] = [
  { id: 'during', title: 'Deprem anında', short: 'Sarsıntı sırasında ne yapmalı?', color: '#E5484D', icon: 'pulse' },
  { id: 'after', title: 'Deprem sonrasında', short: 'Sarsıntı bitince ilk adımlar', color: '#F08C2E', icon: 'exit-outline' },
  { id: 'trapped', title: 'Enkaz altında', short: 'Yerinizi duyurun, enerjinizi koruyun', color: '#C2410C', icon: 'megaphone' },
  { id: 'family', title: 'Aile ve iletişim', short: 'Aileme nasıl ulaşırım?', color: '#2F7CF6', icon: 'people' },
  { id: 'before', title: 'Deprem öncesi hazırlık', short: 'Ev, plan ve çanta', color: '#12A37F', icon: 'shield-checkmark' },
];

const A = 'afad-onlemler' as const;
const B = 'afad-guvende-kal' as const;

export const TOPICS: Topic[] = [
  // ───────────── DEPREM ANINDA ─────────────
  {
    id: 'during-indoor',
    cat: 'during',
    title: 'İçerideyseniz: Çök – Kapan – Tutun',
    short: 'Ev, okul, iş yeri',
    art: 'indoor',
    doList: [
      { t: 'Sağlam bir masa veya dolgun bir mobilyanın yanında dizlerinizin üzerine ÇÖKÜN.', src: [A] },
      { t: 'Başınızı ve ensenizi kollarınızla ya da yastık, kitap gibi bir şeyle koruyarak KAPANIN.', src: [A] },
      { t: 'Düşmemek için sabit bir yere TUTUNUN ve sarsıntı geçene kadar bu pozisyonda kalın.', src: [A] },
      { t: 'Pencere, cam, sabitlenmemiş dolap ve raflardan, üzerinize düşebilecek lamba ve eşyalardan uzak durun.', src: [A, B] },
      { t: 'Mutfak veya atölyedeyseniz ocak, fırın gibi cihazları kapatıp dökülebilecek maddelerden uzaklaşın.', src: [A] },
      { t: 'Telefonu yalnızca acil durum veya yangın bildirmek için kullanın.', src: [A] },
      {
        t: '“Hayat üçgeni” oluşturun.',
        src: [A],
        status: 'review',
        note: 'AFAD sayfası Çök-Kapan-Tutun ile birlikte “hayat üçgeni” ifadesini de kullanıyor; uluslararası kuruluşlar bu yöntemi önermiyor. Çelişki uzman tarafından çözülmeden gösterilmez; yalnızca Çök-Kapan-Tutun anlatılır.',
      },
      {
        t: 'Yataktaysanız yüzüstü dönüp başınızı yastıkla koruyun.',
        src: [],
        status: 'review',
        note: 'Okunan AFAD kaynaklarında yok; önceki uygulama sürümünden kalma.',
      },
    ],
    why: [
      { t: 'Depremde yaralanmaların önemli bir kısmı devrilen eşyalar, kırılan camlar ve sarsıntıda düşmekten kaynaklanır; Çök-Kapan-Tutun baş ve boynu korur, düşmeyi önler.', src: [A, B] },
    ],
    dontList: [
      { t: 'Merdivenlere veya çıkışlara koşmayın; sarsıntı sırasında binayı terk etmeye çalışmayın.', src: [A, B] },
      { t: 'Asansör kullanmayın.', src: [A] },
      { t: 'Balkona çıkmayın; balkondan veya pencereden atlamayın.', src: [A] },
      { t: 'Kibrit, çakmak yakmayın; elektrik düğmelerine dokunmayın.', src: [A] },
      {
        t: 'Asansördeyseniz tüm katların düğmesine basıp ilk durakta inin.',
        src: [],
        status: 'review',
        note: 'Okunan AFAD kaynaklarında yok.',
      },
    ],
  },
  {
    id: 'during-outdoor',
    cat: 'during',
    title: 'Dışarıdaysanız',
    short: 'Sokak, park, açık alan',
    art: 'outdoor',
    doList: [
      { t: 'Binalardan, duvar diplerinden, ağaçlardan, elektrik hatlarından ve direklerden uzaklaşın.', src: [A, B] },
      { t: 'Açık alanda çömelin ve çevreden gelebilecek tehlikelere karşı hazırlıklı olun.', src: [A] },
      { t: 'Taş veya kaya düşebilecek yamaçların altındaysanız hızla güvenli bir yere geçin.', src: [A] },
      { t: 'Deniz kıyısındaysanız sahilden uzaklaşın ve mümkün olduğunca yüksek yerlere çıkın.', src: [A, B] },
    ],
    why: [{ t: 'Dışarıda en büyük tehlike yukarıdan düşen baca, cam, sıva ve devrilen direklerdir; kıyıda ise tsunami riski vardır.', src: [A, B] }],
    dontList: [
      { t: 'Bina cephelerinin, duvarların ve enerji hatlarının yakınında beklemeyin.', src: [A] },
      { t: 'Yer altındaki doğal gaz, elektrik ve kanalizasyon hatlarından gelebilecek tehlikeleri göz ardı etmeyin.', src: [A] },
    ],
  },
  {
    id: 'during-vehicle',
    cat: 'during',
    title: 'Araçtaysanız',
    short: 'Seyir halinde sarsıntı',
    art: 'vehicle',
    doList: [
      { t: 'Bulunduğunuz yer güvenliyse yolu kapatmadan sağa yanaşıp durun.', src: [A, B] },
      { t: 'Kontak anahtarını yerinde bırakın, pencereler kapalı olarak araçta bekleyin.', src: [A] },
      { t: 'Sarsıntı bitince açık alanlara gidin.', src: [A] },
      { t: 'Ağaç, direk, köprü üstü gibi güvensiz bir yerdeyseniz aracı durdurun, anahtarı üzerinde bırakıp trafikten uzak açık bir alana geçin.', src: [A] },
      {
        t: 'Tünel veya kapalı otoparkta araçtan inip aracın yanına yan yatarak başınızı koruyun.',
        src: [A],
        status: 'review',
        note: 'AFAD önerisi; başka ülkelerin rehberleri araçta kalmayı öneriyor. Uzman görüşü alınmadan gösterilmez.',
      },
    ],
    why: [{ t: 'Durmayan araç kontrolü kaybedebilir; yolu kapatmamak, kurtarma araçlarının geçebilmesi için gereklidir.', src: [A, B] }],
    dontList: [
      { t: 'Köprü, üst geçit, bina, ağaç ve direk yanında durmayın.', src: [B] },
      { t: 'Aracı yolu kapatacak şekilde bırakmayın.', src: [A, B] },
    ],
  },
  {
    id: 'during-transit',
    cat: 'during',
    title: 'Metro ve trendeyseniz',
    short: 'Toplu taşıma',
    art: 'transit',
    doList: [
      { t: 'Sarsıntı bitene kadar araç içinde sabit bir askıya veya korkuluğa sıkıca tutunun.', src: [A] },
      { t: 'Personelin talimatlarına uyun.', src: [A] },
    ],
    why: [{ t: 'Raylarda elektrik çarpması ve diğer hattan gelen araçlar ciddi tehlikedir.', src: [A] }],
    dontList: [{ t: 'Gerekmedikçe metrodan veya trenden inmeyin.', src: [A] }],
  },
  {
    id: 'during-wheelchair',
    cat: 'during',
    title: 'Tekerlekli sandalyedeyseniz',
    short: 'Hareket kısıtlılığı',
    art: 'wheelchair',
    doList: [
      { t: 'Tekerlekleri kilitleyin.', src: [A] },
      { t: 'Başınızı ve boynunuzu kollarınızla veya bir nesneyle koruyun.', src: [A] },
      { t: 'Cam, pencere ve devrilebilecek eşyalardan uzak durun.', src: [A, B] },
    ],
    why: [{ t: 'Kilitlenmemiş sandalye sarsıntıda kayabilir; baş ve boyun en korunması gereken bölgelerdir.', src: [A] }],
    dontList: [{ t: 'Sarsıntı sırasında asansöre veya merdivenlere yönelmeyin.', src: [A] }],
  },

  // ───────────── DEPREM SONRASINDA ─────────────
  {
    id: 'after-first',
    cat: 'after',
    title: 'Sarsıntı bitince ilk adımlar',
    short: 'Önce kendi güvenliğiniz',
    art: 'after',
    doList: [
      { t: 'Önce kendi güvenliğinizden emin olun, sonra çevrenizde yardıma ihtiyacı olan var mı bakın.', src: [A, B] },
      { t: 'Elektrik, gaz ve su vanalarını kapatın; soba ve ısıtıcıları söndürün.', src: [A, B] },
      { t: 'Etrafınızı kontrol edip güvenli olduğundan emin olduktan sonra binayı daha önce belirlediğiniz yoldan terk edin.', src: [A, B] },
      { t: 'Afet ve acil durum çantanızı alıp toplanma alanına gidin.', src: [A, B] },
      { t: 'Yaşlı, bebek, hamile ve engelli bireylere yardımcı olun.', src: [A, B] },
      { t: 'Yetkililerin uyarılarını radyo ve televizyondan takip edin.', src: [A] },
      { t: 'Deniz kenarındaysanız tsunami riskine karşı yüksek yerlere çıkın.', src: [B] },
    ],
    why: [
      { t: 'Büyük depremlerden sonra artçı sarsıntılar mutlaka olur ve hasarlı binalarda yeni yıkımlara yol açabilir.', src: [A] },
    ],
    dontList: [
      { t: 'Sarsıntılar tamamen bitene kadar hasarlı binalara girmeyin; eşya almak için geri dönmeyin.', src: [A] },
      { t: 'Cadde ve sokakları kapatmayın; acil yardım araçları için yolu boş bırakın.', src: [A] },
      { t: 'Hasarlı binaların ve enerji hatlarının yakınında beklemeyin.', src: [A] },
    ],
    link: { label: 'Toplanma alanları', href: '/toplanma' },
  },
  {
    id: 'after-gas',
    cat: 'after',
    title: 'Gaz kokusu ve yangın riski',
    short: 'Depremden sonra sık görülen tehlike',
    art: 'gas',
    doList: [
      { t: 'Gaz kokusu alırsanız gaz vanasını kapatın.', src: [A, B] },
      { t: 'Kapı ve pencereleri açın, binayı hemen terk edin.', src: [A, B] },
      { t: 'Yangın veya gaz kaçağını güvenli bir yerden 112’ye bildirin.', src: [A, 'acm112'] },
    ],
    why: [{ t: 'Depremlerden sonra çıkan yangınlar sık görülen ikincil afetlerdir; tek bir kıvılcım gaz birikmiş ortamda patlamaya yol açabilir.', src: [A] }],
    dontList: [
      { t: 'Kibrit, çakmak yakmayın.', src: [A] },
      { t: 'Elektrik düğmelerine dokunmayın.', src: [A] },
    ],
  },

  // ───────────── ENKAZ ALTINDA ─────────────
  {
    id: 'trapped',
    cat: 'trapped',
    title: 'Enkaz altında kaldıysanız',
    short: 'Paniklemeyin, yerinizi duyurun',
    art: 'trapped',
    doList: [
      { t: 'Paniklemeden durumunuzu ve vücudunuzu kontrol edin.', src: [A] },
      { t: 'Enerjinizi korumak için hareketlerinizi kontrol altında tutun.', src: [A] },
      { t: 'Ellerinizi veya ayaklarınızı kullanabiliyorsanız su, kalorifer veya gaz borularına ya da zemine vurarak varlığınızı duyurun.', src: [A] },
      { t: 'Kurtarma ekiplerinin seslerini dinlemeye çalışın; duyduğunuzda seslenin, ama sesinizi ve enerjinizi kontrollü kullanın.', src: [A] },
      { t: 'Telefonunuz çalışıyorsa 112’yi arayın; uygulamadaki Enkaz Altı Modu internetsiz siren ve flaşla yerinizi duyurmanıza yardım eder.', src: ['acm112', 'guvende'] },
      {
        t: 'Toz soluk almanızı zorlaştırıyorsa ağzınızı ve burnunuzu bir kumaşla örtün.',
        src: [],
        status: 'review',
        note: 'Okunan AFAD kaynaklarında yok; Sağlık Bakanlığı/Kızılay kaynağıyla doğrulanmalı.',
      },
    ],
    why: [{ t: 'Kurtarma ekipleri size ulaşmak için çalışır; enerjinizi ve sesinizi korumak, sizi duyabilecekleri ana kadar dayanmanızı kolaylaştırır.', src: [A] }],
    dontList: [
      { t: 'Hareket kabiliyetiniz kısıtlıysa çıkmak için hayatınızı riske atacak hareketlere kalkışmayın.', src: [A] },
      { t: 'Kibrit veya çakmak yakmayın (gaz kaçağı olabilir).', src: [A] },
      { t: 'Sürekli bağırarak enerjinizi tüketmeyin.', src: [A] },
    ],
    link: { label: 'Enkaz Altı Modu (siren + flaş)', href: '/enkaz' },
  },

  // ───────────── AİLE ─────────────
  {
    id: 'family',
    cat: 'family',
    title: 'Aileme nasıl ulaşırım?',
    short: 'Plan, buluşma yeri, durum paylaşımı',
    art: 'family',
    doList: [
      { t: 'Eve ulaşamayacağınız durumlar için ailenizle iletişim yolunu, alternatif buluşma yerlerini ve bölge dışında bir bağlantı kişisini önceden belirleyin.', src: [A] },
      { t: 'Afete hazırlık planını evdeki herkesle birlikte yapın, altı ayda bir gözden geçirin ve tatbikat yapın.', src: [A] },
      { t: 'Telefonu yalnızca acil durum ve yangın bildirmek için kullanın; hatları meşgul etmeyin.', src: [A] },
      { t: 'GÜVENDE’de “Güvendeyim” SMS’i telefonunuzun kendi SMS uygulamasıyla gider; internet gerekmez, gönder’e siz basarsınız.', src: ['guvende'] },
    ],
    why: [{ t: 'Şebekeler yoğunken herkesin herkesi araması iletişimi daha da zorlaştırır; önceden yapılan plan aileyi tek bir buluşma noktasında toplar.', src: [A] }],
    dontList: [
      { t: 'Bir aile üyesinin yanıt vermemesini tek başına “tehlikede” işareti olarak yorumlamayın: şarjı bitmiş, şebeke yoğun veya telefonu yanında olmayabilir. Buluşma planına uyun ve gerekirse 112’ye bildirin.', src: ['guvende'] },
    ],
    link: { label: 'Ailem', href: '/ailem' },
  },

  // ───────────── DEPREM ÖNCESİ ─────────────
  {
    id: 'prep-home',
    cat: 'before',
    title: 'Evinizi hazırlayın',
    short: 'Eşya sabitleme, çıkış yolları',
    art: 'prep-home',
    doList: [
      { t: 'Dolapları ve devrilebilecek eşyaları birbirine ve duvara sabitleyin.', src: [A] },
      { t: 'Kombi, şofben, buzdolabı, fırın ve soba gibi cihazları duvara veya yere sabitleyin.', src: [A, B] },
      { t: 'Avize ve klima gibi asılı cihazları ağırlığını taşıyacak şekilde, pencerelerden uzağa asın.', src: [A] },
      { t: 'Ağır eşya bulunan dolap kapaklarına kilit takın; raflara bant veya tel ekleyin.', src: [A] },
      { t: 'Yatağı pencere ve devrilebilecek ağır dolapların yanına koymayın; üstünde ağır eşyalı raf bulundurmayın.', src: [A] },
      { t: 'Çıkış yollarını eşyalardan temizleyin, işaretleyin ve aydınlatın.', src: [A] },
      { t: 'Yanıcı ve zehirli maddeleri kilitli, alt raflarda ve kırılmayacak biçimde saklayın.', src: [A, B] },
      { t: 'Uygun bir yangın söndürme cihazı bulundurun; yerini herkes bilsin, bakımı yapılsın.', src: [A] },
      { t: 'Konutunuza deprem sigortası yaptırın.', src: [A] },
      { t: 'Evdekilerle Çök-Kapan-Tutun tatbikatı yapın.', src: [B] },
    ],
    why: [{ t: 'Binanın yanı sıra eşyalar da yaralanmaya yol açar; sabitlenmiş eşya ve açık çıkış yolu sarsıntıda ve sonrasında hayat kurtarır.', src: [A] }],
    dontList: [
      { t: 'Taşıyıcı kolon ve duvarlara dokunan tadilat yapmayın.', src: [B] },
      { t: 'Elektrik ve gaz tesisatında kendi başınıza işlem yapmayın; hasarlı kablo ve bağlantıları uzmanına onartın.', src: [B] },
    ],
    link: { label: 'Hazırlık kontrol listesi', href: '/rehber/hazirlik' },
  },
  {
    id: 'prep-plan',
    cat: 'before',
    title: 'Belgeler ve aile planı',
    short: 'Kopyalar, buluşma yeri, bağlantı kişisi',
    art: 'prep-plan',
    doList: [
      { t: 'Kimlik, tapu, sigorta ve sağlık belgelerinin kopyalarını su geçirmez biçimde saklayın; bir kopyasını bölge dışındaki bağlantı kişinize verin.', src: [A] },
      { t: 'Alternatif buluşma yerlerini ve bölge dışı bağlantı kişisini ailece belirleyin.', src: [A] },
      { t: 'Planı altı ayda bir gözden geçirip tatbikat yapın.', src: [A] },
    ],
    why: [{ t: 'Afet anında eve ulaşılamayabilir ve şebekeler kesilebilir; önceden yapılan plan ailenin birbirini bulmasını sağlar.', src: [A] }],
    dontList: [{ t: 'Önemli belgelerin tek kopyasını evde bırakmayın.', src: [A] }],
    link: { label: 'Ailem', href: '/ailem' },
  },
  {
    id: 'prep-kit',
    cat: 'before',
    title: 'Acil durum çantası',
    short: 'İlk 72 saat için',
    art: 'kit',
    doList: [
      { t: 'Yardım ekipleri ulaşana kadar ilk 72 saat için acil ihtiyaçlarınızı ve değerli belgelerinizi içeren bir afet ve acil durum çantası hazırlayın.', src: [B] },
      { t: 'Belge kopyalarını su geçirmez bir kılıfta çantaya koyun.', src: [A] },
      { t: 'Sarsıntı bittikten sonra çantanızı alıp toplanma alanına gidin.', src: [A, B] },
    ],
    why: [{ t: 'Afetin ilk günlerinde suya, ilaca ve belgelere erişim zorlaşabilir.', src: [B] }],
    dontList: [{ t: 'Çantayı ulaşılması zor bir yerde saklamayın.', src: [], status: 'review', note: 'Genel öneri; kaynakta açık ifade yok.' }],
    link: { label: 'Çanta kontrol listesi', href: '/canta' },
  },
];

/** Uygulamada gösterilen (doğrulanmış) maddeler. */
export const shown = (items: Item[]) => items.filter((i) => i.status !== 'review');

/** Doğrulanmış en az bir "ne yapmalı" maddesi olan konular yayımlanır. */
export const PUBLISHED_TOPICS = TOPICS.filter((t) => shown(t.doList).length > 0);

export const topicById = (id: string) => PUBLISHED_TOPICS.find((t) => t.id === id) ?? null;

/** Konunun dayandığı kaynaklar (gösterilen maddelerden). */
export function topicSources(t: Topic): Source[] {
  const ids = new Set<SourceId>();
  for (const i of [...shown(t.doList), ...shown(t.why), ...shown(t.dontList)]) i.src.forEach((s) => ids.add(s));
  return [...ids].map((id) => SOURCES[id]);
}

/** İnceleme bekleyen maddeler (rapor ve testler için). */
export const REVIEW_ITEMS = TOPICS.flatMap((t) =>
  [...t.doList, ...t.why, ...t.dontList].filter((i) => i.status === 'review').map((i) => ({ topic: t.id, ...i })),
);

export function isStale(now = Date.now()): boolean {
  return now - Date.parse(CHECKED_AT) > STALE_AFTER_DAYS * 24 * 3600_000;
}

/** Ana sayfa "ACİL DURUM" kartındaki kısayollar */
export const QUICK_LINKS: { label: string; target: { kind: 'topic'; id: string } | { kind: 'cat'; id: Category } | { kind: 'route'; href: '/canta' | '/ailem' } ; art: ArtId; tone: string }[] = [
  { label: 'Deprem anında ne yapmalıyım?', target: { kind: 'topic', id: 'during-indoor' }, art: 'indoor', tone: '#E5484D' },
  { label: 'Deprem sonrasında ne yapmalıyım?', target: { kind: 'topic', id: 'after-first' }, art: 'after', tone: '#F08C2E' },
  { label: 'Enkaz altında kaldım', target: { kind: 'topic', id: 'trapped' }, art: 'trapped', tone: '#C2410C' },
  { label: 'Dışarıdaysam', target: { kind: 'topic', id: 'during-outdoor' }, art: 'outdoor', tone: '#12A37F' },
  { label: 'Araçtaysam', target: { kind: 'topic', id: 'during-vehicle' }, art: 'vehicle', tone: '#2F7CF6' },
  { label: 'Aileme nasıl ulaşırım?', target: { kind: 'topic', id: 'family' }, art: 'family', tone: '#7C5CF6' },
  { label: 'Acil durum çantam hazır mı?', target: { kind: 'route', href: '/canta' }, art: 'kit', tone: '#B7791F' },
];
