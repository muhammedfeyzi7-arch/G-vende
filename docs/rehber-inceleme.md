# Acil Durum Rehberi — Kaynaklar, Telif ve Uzman İnceleme Listesi

İçerik sürümü: **2026.10.23-1** · Son kaynak karşılaştırması: **23 Ekim 2026**
İçerik dosyası: `src/features/guide/content.ts` (her madde kaynağa bağlı; `status: 'review'` maddeler uygulamada gösterilmez).

## 1. Kullanılan resmî kaynaklar

| Kimlik | Kurum | Başlık | Bağlantı | Yayın | Okundu |
|---|---|---|---|---|---|
| `afad-onlemler` | AFAD | Deprem Öncesi, Anı ve Sonrası Alabileceğiniz Önlemleri Biliyor Musunuz? | https://www.afad.gov.tr/deprem-oncesi-ani-ve-sonrasi-alabileceginiz-onlemleri-biliyor-musunuz | 05.03.2018 | 23.10.2026 |
| `afad-guvende-kal` | AFAD | Deprem Öncesi, Anı ve Sonrası Önlemini Al, Güvende Kal | https://www.afad.gov.tr/deprem-oncesi-ani-ve-sonrasi-onlemini-al-guvende-kal | 19.03.2018 | 23.10.2026 |
| `acm112` | İçişleri Bakanlığı — 112 Acil Çağrı Merkezi | 112 Acil Çağrı Merkezi | https://www.112.gov.tr/ | — | 23.10.2026 |
| `guvende` | GÜVENDE | Uygulamanın çalışma biçimi (resmî kaynak değil) | — | — | — |

Sayfalar, geliştirme ortamının internet erişimi kısıtlı olduğu için Supabase sunucusundan (pg_net) indirilip okundu.

**Erişilemeyen / okunamayan:** `saglik.gov.tr` (bağlantı koptu); AFAD'ın ayrıntılı "Afet ve Acil Durum Çantası" sayfası (aranan adreslerde 404).

## 2. Telif ve kullanım

- AFAD sayfalarının altında "© 2026 T.C. İçişleri Bakanlığı Afet ve Acil Durum Yönetimi Başkanlığı" ibaresi var; açık lisans ifadesi bulunmuyor. Bu nedenle:
  - Metinler **birebir kopyalanmadı**; bilgiye dayanan kısa, özgün ifadeler yazıldı.
  - **AFAD görseli, infografiği veya logosu kullanılmadı.** Tüm illüstrasyonlar GÜVENDE için çizilmiş vektörlerdir (`src/features/guide/Art.tsx`, `src/features/emergency/DropCoverHold.tsx`).
  - Uygulamada "GÜVENDE, AFAD'ın veya başka bir kurumun resmî uygulaması değildir" ibaresi her konu sayfasında ve rehber merkezinde gösterilir.
- **Hukuki değerlendirme önerilir:** Kaynak gösterilerek özetleme yapılması (FSEK m.35 alıntı/özet sınırları) ve kurum adının kaynak olarak anılması uygun kabul edilse de yayın öncesi bir hukukçunun onayı alınmalıdır.

## 3. Uzman incelemesi bekleyen maddeler (uygulamada GÖSTERİLMİYOR)

| Konu | Madde | Neden beklemede |
|---|---|---|
| İçerideyseniz | "Hayat üçgeni" oluşturun | AFAD 2018 metni Çök-Kapan-Tutun ile birlikte "hayat üçgeni" ifadesini kullanıyor; uluslararası kuruluşlar bu yöntemi önermiyor. Kaynaklar arası çelişki: uygulama yalnızca Çök-Kapan-Tutun anlatır. |
| İçerideyseniz | Yataktaysanız yüzüstü dönüp başınızı yastıkla koruyun | Okunan AFAD kaynaklarında yok (eski sürümden kalma). |
| İçerideyseniz | Asansördeyseniz tüm katların düğmesine basıp ilk durakta inin | Okunan AFAD kaynaklarında yok. |
| Araçtaysanız | Tünel/kapalı otoparkta araçtan inip aracın yanına yan yatın | AFAD önerisi; başka ülkelerin rehberleri araçta kalmayı öneriyor. Uzman görüşü gerekli. |
| Enkaz altında | Toz için ağız ve burnu kumaşla örtün | Okunan AFAD kaynaklarında yok; Sağlık Bakanlığı / Kızılay ile doğrulanmalı. |
| Çanta | Çantayı ulaşılması zor yerde saklamayın | Genel öneri; kaynakta açık ifade yok. |

## 4. Kaldırılan önceki içerik

Önceki sürümdeki "Yangın", "Yaralanma (temel ilk yardım)" ve "Tahliye" rehberleri kaynakla doğrulanmadığı için kaldırıldı. İlk yardım içeriği **Sağlık Bakanlığı / Kızılay** kaynağı okunup tıbbi uzman onayı alınmadan yeniden eklenmemelidir. Gaz/yangın ve tahliye ile ilgili AFAD destekli maddeler "Deprem sonrasında" konularına taşındı.

## 5. Kısmen kaynaklı içerik

- **Acil durum çantası madde listesi** (`src/features/emergency/content.ts`, `/canta`): AFAD ilk 72 saat için çanta önerir ve belge kopyalarının su geçirmez saklanmasını söyler; ancak su, gıda, fener, düdük, powerbank gibi madde madde liste AFAD'ın ayrıntılı listesiyle **karşılaştırılamadı**. Ekranda bu durum açıkça yazılıdır.
- **Özel ihtiyaçlar:** Tekerlekli sandalye (tekerlekleri kilitle, baş-boynu koru) ve deprem sonrası yaşlı/bebek/hamile/engelli bireylere yardım AFAD kaynaklıdır. **Evcil hayvanlar ve engelli bireyler için hazırlık** konusunda okunan kaynaklarda içerik yok; bu bölüm eklenmedi.

## 6. Güncelleme süreci

1. Kaynak sayfalar yeniden okunur ve maddeler karşılaştırılır.
2. Değişen maddeler güncellenir; `CONTENT_VERSION` artırılır, `CHECKED_AT` ve kaynakların `checkedAt` alanları güncellenir.
3. `npx jest src/features/guide` çalıştırılır (her gösterilen maddenin kaynağı, bağlantılar, kısayollar test edilir).
4. Doğrulama 365 günden eskiyse uygulama "güncel olmayabilir" uyarısı gösterir.
