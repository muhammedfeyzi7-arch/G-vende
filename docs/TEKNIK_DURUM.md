# GÜVENDE — Teknik Durum Raporu

Tarih: 22 Ekim 2026 · Sürüm 0.1.0

## 1. Başlangıç incelemesi

- GÜVENDE başka hiçbir projeye bağlı olmadan, boş bir klasörde sıfırdan ve kendi git deposuyla oluşturuldu.
- Ortam: Node 22, Expo SDK 58 (React Native 0.88, React 19.3). Paket sürümleri Expo'nun `bundledNativeModules.json`
  listesine göre sabitlendi.
- **Ağ kısıtı:** Geliştirme konteynerinin ağ politikası `deprem.afad.gov.tr`, `www.koeri.boun.edu.tr`,
  `earthquake.usgs.gov`, `tiles.openfreemap.org` ve `docs.expo.dev` adreslerine erişimi engelliyor. Bu yüzden
  kaynakların **canlı yanıtı, güncel kullanım şartları ve harita stili bu ortamdan doğrulanamadı.**

## 2. Aşamalara göre durum

| Aşama | Durum | Not |
| --- | --- | --- |
| 1. Mimari | ✅ Tamam | Expo Router, modüler `features/*`, veri erişimi UI'dan ayrık |
| 2. Ana ekran + harita | ✅ Kod tamam, ⚠️ cihazda görülmedi | Düzen web önizlemesiyle referansa göre kontrol edildi; MapLibre yalnızca iOS/Android'de çizilir ve cihazda/emülatörde **test edilmedi** |
| 3. Deprem verisi | ✅ Kod + testler, ⚠️ canlı doğrulanmadı | Ayrıştırıcılar bilinen biçime göre hazırlanmış örnek yanıtlarla test edildi |
| 4. Toplanma alanları, harita filtreleri | ✅ Kod, ⚠️ veri yok | Hiçbir resmî veri içe aktarılmadı; uygulama bunu açıkça söylüyor ve e-Devlet sorgusuna yönlendiriyor |
| 5. Bildirimler, fotoğraf, moderasyon | ✅ Kod + RLS testleri | Moderatör paneli yok (gizlenen bildirimler Supabase panelinden incelenir) |
| 6. Aile ağı, çevrimdışı | ✅ Kod + RLS testleri | Gerçek zamanlı abonelik yerine 30 sn yoklama |
| 7. Test ve uyum | ⚠️ Kısmi | Aşağıdaki "Doğrulananlar" bölümüne bakın |

## 3. Doğrulananlar (bu ortamda gerçekten çalıştırıldı)

- `npx tsc --noEmit` — hatasız.
- `npm test` — 8 test dosyası, 58 test geçti: AFAD/Kandilli/USGS ayrıştırıcıları, boş yanıt, bozuk yanıt, kaynak erişilemezken
  önbellek ve sağlık durumu, aynı olayın üç kaynaktan birleştirilmesi (özgün değerler korunarak), uyarı kartı mantığı
  (sahte alarm üretmeme), bildirim doğrulama, çevrimdışı kuyruk, harita yüklenememe/tekrar dene, canlı akış durumları.
- `npm run test:db` — Yerel PostgreSQL 16 üzerinde, Supabase auth/storage şemalarının asgari taklidiyle 36 RLS/güvenlik
  testi geçti: yazar kimliğinin gizliliği, konum yuvarlama, hız sınırı, tekrar gönderim tekilleştirmesi, anonim yazma
  engeli, başkasının kaydını silememe, tek faydalı oyu, 3 şikâyette gizleme, fotoğraf klasörü kısıtı, aile grubu
  erişimi, davetsiz katılamama, rol yükseltememe, konum paylaşımı kapalıyken konumun atılması, kullanılmış davetin
  geçersizliği, tercih/push belirteci gizliliği, resmî tabloların istemciden yazılamaması, veri dışa aktarma.
  _Gerçek bir Supabase projesinde çalıştırılmadı._
- Deno: üç sunucu işlevi tip denetiminden geçti; push alıcı seçimi için 6 test geçti. _Dağıtılmadı._
- `npx expo prebuild` — iOS ve Android yerel projeleri üretildi; Kandilli HTTP istisnası yalnızca o alan adı için
  `Info.plist` ve `network_security_config.xml`'e yazıldı; arka plan konum izni kaldırıldı.
- `npx expo export --platform ios --platform android` — iki platform için Hermes paketleri derlendi.
- Web önizlemesi (Playwright, 393×852): ana ekran düzeni referansla karşılaştırıldı; bilgi satırı taşması ve
  "Yakınımdaki toplanma alanları" düğmesinin kesilmesi düzeltildi.

## 4. Doğrulanamayanlar / açık riskler

1. **Veri kaynakları:** AFAD `apiv2/event/filter` uç noktası AFAD sitesinin kullandığı herkese açık servistir; belgelenmiş
   bir kamu API sözleşmesi veya yazılı kullanım şartı bulunamadı. Kandilli verisi bir API değil, düz metin sayfasıdır
   (yalnızca HTTP). Her ikisi için de **yayın öncesi kurumlardan yazılı izin/teyit alınmalıdır.** USGS FDSN belgeli ve
   kamu malıdır. AFAD `date` alanının UTC olduğu varsayıldı (bilinen geçmiş olaylarla tutarlı) — canlı veriyle teyit edilmeli.
2. **Harita:** Referans görsele göre özel bir koyu stil (`src/features/map/mapStyle.ts`: lacivert kara, koyu deniz, büyük
   şehir adları) ve parlayan kaplama katmanları (`layers.ts`) yazıldı. Kaplama katmanları web önizlemesinde maplibre-gl ile
   gerçekten çizdirilerek kontrol edildi; **taban harita karoları ve yazı tipleri bu ortamdan indirilemediği için koyu stilin
   kendisi görülemedi.** Stil yüklenemezse uygulama otomatik olarak OpenFreeMap `dark` stiline, o da olmazsa hata ekranına geçer.
   Native MapLibre davranışı cihazda denenmedi.
3. **Toplanma alanları:** Resmî veri içe aktarılmadı. AFAD'ın sorgu hizmeti e-Devlet girişli olduğundan toplu veri
   olarak alınamıyor; belediye açık veri portalları (ör. İBB) il bazında değerlendirilmeli.
4. **Push bildirimleri:** Uçtan uca (EAS projectId, Expo Push, zamanlayıcı) test edilmedi. Sunucu işlevleri uygulamanın
   `src/` altındaki ayrıştırıcılarını `deno.json` içe aktarma haritasıyla kullanır; Supabase CLI'nin bu dosyaları
   paketlediği **doğrulanmadı** — sorun olursa ayrıştırıcılar `supabase/functions/_shared` altına kopyalanmalı.
5. **Güvenlik talimatları** AFAD içeriklerinden özetlendi; yayın öncesi resmî metinle karşılaştırılmalı
   (`src/features/emergency/content.ts` içindeki `reviewedAt`).
6. **Erken uyarı yok:** Uygulama yalnızca yayımlanmış kayıtları gösterir; uyarı kartı "deprem oluyor" iddiasında bulunmaz.

## 5. Eksik kalanlar (sonraki adımlar)

- Moderatör paneli ve "topluluk teyitli / yetkili doğruladı" durumlarını atayan iş akışı (şema hazır, atama yok).
- Bot/spam için CAPTCHA (şu an: e-posta OTP girişi + veritabanı hız sınırı + şikâyet eşiği).
- Harita karolarının çevrimdışı indirilmesi (MapLibre `OfflineManager`).
- İngilizce dil ve açık tema (şu an yalnızca Türkçe, koyu tema).
- Gerçek cihazlarda iOS/Android, küçük ekran (iPhone SE) ve büyük yazı boyutu testleri; VoiceOver/TalkBack turu.
- `expo lint` yapılandırması.

## 6. Gizlilik tasarımı (özet)

- Bildirimlerde konum istemcide ve veritabanında ~1 km'ye yuvarlanır; yazar kimliği sütun yetkileriyle gizlidir.
- Fotoğraflar yeniden kodlanır (EXIF/GPS silinir), özel kovada tutulur, yalnızca görünür bildirimler için imzalı URL ile okunur.
- Arka plan konumu hiç istenmez (Android'de manifest'ten çıkarılır). Aile konumu yalnızca üye açarsa ve durum bildirildiği anda paylaşılır.
- Oturum belirteçleri Keychain/Keystore'da (expo-secure-store). Servis anahtarı yalnızca sunucu işlevlerinde.
- Hesap silme (`delete-account`) ve veri dışa aktarma (`export_my_data`) mevcuttur.

## 7. Güncelleme — referans ekranlar (Ana Sayfa, Acil Durum, Ayarlar) ve tüm sekmeler

**Yapılanlar**
- Ortak tasarım sistemi (`src/components/ds.tsx`): ekran başlığı, simge kutusu, bölüm kartı, satır/anahtar satırı, avatar (durum rozetli), ilerleme halkası, bildirim zili, hızlı kart. Ortası yükseltilmiş kırmızı Acil Durum düğmeli alt menü.
- **Ana Sayfa:** konum + logo + bildirim zili başlığı, alarm kartı, bilgi kartı, etiketli harita kontrolleri (Katmanlar/Konumum/Tam Ekran), 5 hızlı kutu (112, Ailem x/y güvende, Toplanma, Çanta, Rehber), “Ailem Güvende mi?”, “Son Bildirimler”, “Son Depremler”.
- **Acil Durum:** Acil Durum Modu, 112 kartı, Acil SMS / Konum Paylaş / Aileye Bildir / Acil Duyurular, ÇÖK–KAPAN–TUTUN–SONRA çizimleri (SVG, uygulamaya ait), Toplanma Noktamız (mini harita + yol tarifi), çanta ilerleme halkası, resmî kayıtlar.
- **Ayarlar:** profil kartı (fotoğraf/ad/telefon yalnızca cihazda), hızlı kartlar, 4 bildirim türü (kalıcı + sunucuya eşitleme), konum ve gizlilik, güvenlik (biyometrik uygulama kilidi, oturumlar), tercihler (harita görünümü Koyu/Uydu/Açık), destek, hakkında.
- Yeni alt ekranlar: bildirim merkezi, deprem geçmişi (zaman/büyüklük/mesafe filtreleri, sıralama), tüm bildirimler, aile üyesi detayı, acil SMS şablonları, resmî bilgiler, çanta listesi, rehberler (yangın, ilk yardım, tahliye dahil), sağlık bilgilerim, profil, hesap, gizlilik, konumumu gizle, güvenlik, tercihler, bildirim ayarları, yardım merkezi, geri bildirim.
- Harita sekmesi: büyüklük filtresi, harita/liste geçişi, izinli aile konumları katmanı (eskiyse “eski” işaretli).

**Gerçekten çalışanlar (sunucu olmadan):** deprem verisi (cihazda), harita, bildirim merkezi (uygulama açıkken eşleşen depremler), SMS ile durum bildirimi ve durum sorma, konum paylaşımı tercihi ve kişi bazlı gizleme, buluşma noktası, kendi toplanma alanı, düdük, SOS ışığı, Acil Durum Modu, çanta, rehberler, sağlık bilgileri, profil, biyometrik kilit (cihaz destekliyorsa), harita görünümü, tüm tercihlerin kalıcılığı.

**Sunucu gerektirenler:** herkese açık bildirimler, çevrimiçi aile grubu ve aile konumları, push bildirimleri, geri bildirimin uygulama içinden gönderilmesi (sunucu yokken metin paylaşılır), hesap/oturum işlemleri.

**Bilerek uygulanmayanlar / dürüstlük notları**
- Açık ve “sistem” teması yok: renkler tek koyu palete bağlı; seçenekler “bu sürümde yok” olarak kapalı gösterilir. Dil yalnızca Türkçe.
- Şifre değiştir yok: giriş e-posta koduyla, parola saklanmaz; yerine e-posta değiştirme sunulur.
- Aktif cihaz listesi yok: Supabase istemciye oturum listesi vermez; “diğer cihazlardan çıkış” çalışır.
- Ücretli üyelik yok: hızlı kartta yalnızca hesap durumu (Misafir / Hesap bağlı).
- Referanstaki “Şu an deprem oluyor” ve “Tahmini şiddet” yerine “Deprem kaydedildi” ve “Büyüklük” kullanılır.
- Kişilerin durumu kendiliğinden bilinmez: “Yanıt bekleniyor” siz sorduğunuzda, diğer durumlar siz işaretlediğinizde kaydedilir; yanıt vermeyen kişi tehlikede sayılmaz.

**Doğrulama:** `tsc` (tipli rotalarla — tüm yönlendirmeler var olan ekranlara gidiyor), Jest 109/109, yerel Postgres RLS testleri (geri bildirim tablosu dahil), Deno 7/7, `expo prebuild` (Face ID, rehber, biyometrik izinleri; arka plan konumu ve kayıt izni kaldırılmış), `expo export` iOS + Android. Web önizlemesiyle üç referans ekranla görsel karşılaştırma yapıldı. **Gerçek cihazda/emülatörde test edilmedi.**

## 8. Güncelleme — bilgi kirliliğine karşı güven katmanı (prototip)

Kurallar **sunucuda** (Postgres tetikleyicileri + RLS, `supabase/migrations/20261023000005_trust.sql`) uygulanır; uygulama yalnızca eksikleri gösterir.

| Yöntem | Uygulama | Sınır (dürüst not) |
|---|---|---|
| Kimlik doğrulama | `verify-identity` işlevi NVİ KPSPublic `TCKimlikNoDogrula` ile T.C. no + ad + soyad + doğum yılını eşleştirir. Kimlik verisi saklanmaz; yalnızca HMAC özeti (tek kimlik = tek hesap) ve doğrulama zamanı. KVKK açık rıza kutusu zorunlu. Günde 5 deneme. | Bilgilerin eşleştiğini gösterir, telefonu kullananın o kişi olduğunu kanıtlamaz. **e-Devlet ile giriş** kamu protokolü gerektirir; prototipte yok. NVİ servisi bu ortamdan çağrılamadı (ağ kısıtı); SOAP zarfı ve yanıt ayrıştırma birim testli. |
| Canlı konum (1 km) | Konumlu bildirimde cihaz GPS'i (doğruluk ≤ 100 m) bildirilen yere ≤ 1 km olmalı. Hasar/yol/yardım için konum zorunlu. Cihaz konumu kontrol sonrası silinir. | Root/jailbreak cihazda sahte GPS mümkün; mağaza sürümünde Play Integrity / App Attest eklenmeli. |
| Yalnızca anlık kamera | Galeriden yükleme kaldırıldı. Hasar/yol bildirimi, son 10 dk içinde çekilmiş fotoğraf eklenene kadar `pending_photo` durumunda yayınlanmaz. | Çekim zamanı istemciden gelir; değiştirilmiş istemci taklit edebilir (cihaz bütünlük doğrulaması gerekir). Çevrimdışı kuyrukta 10 dk geçen fotoğraflı bildirim reddedilir. |
| Topluluk doğrulaması | 500 m içindeki doğrulanmış kişiler oylar. 3 onay → `community` (Doğrulanmış Bilgi). 3 ret ve retler onaydan fazla → kaldırılır, yazara ihlal puanı + askı (1. ihlal 7 gün, sonrası 30 gün). Kendi bildirimine ve resmî bildirime oy yok; saatte 30 oy sınırı. | Toplu kötüye kullanım (anlaşmalı oy) mümkün; itiraz ve moderatör paneli henüz yok. |
| Kurumsal hesaplar | `profiles.role` = official/rescue + `org_name`; yalnızca service role atar. Konum/fotoğraf şartı yok, bildirim doğrudan “Resmî · Kurum” rozetiyle yayınlanır; oyları 3 sayılır. | Kurum başvuru/onay süreci tanımlanmadı. |

**Testler:** `supabase/tests/trust.test.sql` (yeni, 30+ kontrol: doğrulanmamış/askıdaki kullanıcı, uzak konum, zayıf GPS, eski fotoğraf, 500 m oy, 3 onay/3 ret, resmî rozet, kurumsal oy ağırlığı) + mevcut RLS testleri geçti. Deno: NVİ SOAP/ayrıştırma/özet testleri. Jest: kural motoru (`evaluateGates`) ve yeni ekranlar.

**Yeni/değişen dosyalar:** `supabase/migrations/20261023000005_trust.sql`, `supabase/functions/verify-identity/index.ts`, `supabase/functions/_shared/nvi.ts(+test)`, `src/features/trust/*` (rules, tckn, api, TrustProvider, TrustBadge), `src/app/kimlik.tsx`, `src/app/guven.tsx`, `src/app/rapor/yeni.tsx` (4 adımlı yayın kontrolü, yalnız kamera, canlı GPS), `src/app/rapor/[id].tsx` (Doğru/Yanlış ihbar oyu), `ReportRow`/`ReportCard` (güven rozeti), Ayarlar → Kimlik doğrulama.

**Görsel uyum:** yazı ölçeği referans yoğunluğuna indirildi, düz alt menü (kırmızı siren), varsayılan uydu harita + sarı yollar, kenardan kenara Harita, 4'lü deprem özet satırı, aile üyesi fotoğrafı (yalnızca cihazda), Ailem haritasında “Sen” mavi nokta. Referanslardaki “Şu an deprem oluyor / Tahmini şiddet” ifadeleri bilinçli olarak “Deprem kaydedildi / Büyüklük” olarak bırakıldı (uygulama erken uyarı sistemi değildir).
