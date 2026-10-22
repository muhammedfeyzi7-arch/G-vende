# GÜVENDE — Teknik Durum Raporu

Tarih: 22 Ekim 2026 · Sürüm 0.1.0

## 1. Başlangıç incelemesi

- Oturumdaki tek depo (`isg-panel`) GÜVENDE ile ilgisiz bir OSGB/İSG web paneliydi (Vite + React). Kullanıcı isteği üzerine
  o depoya dokunulmadı; GÜVENDE ayrı, boş bir klasörde (`/home/user/guvende`) sıfırdan, kendi git deposuyla oluşturuldu.
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
