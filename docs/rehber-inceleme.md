# Acil Durum Rehberi — Kaynaklar, Telif ve Uzman İnceleme Listesi

İçerik sürümü: **2026.10.24-1** · Son kaynak karşılaştırması: **23 Ekim 2026**
İçerik dosyası: `src/features/guide/content.ts` (her madde kaynağa bağlı; `status: 'review'` maddeler uygulamada gösterilmez).

## 1. Kullanılan resmî kaynaklar

| Kimlik | Kurum | Başlık | Bağlantı | Yayın | Okundu |
|---|---|---|---|---|---|
| `afad-onlemler` | AFAD | Deprem Öncesi, Anı ve Sonrası Alabileceğiniz Önlemleri Biliyor Musunuz? | https://www.afad.gov.tr/deprem-oncesi-ani-ve-sonrasi-alabileceginiz-onlemleri-biliyor-musunuz | 05.03.2018 | 23.10.2026 |
| `afad-guvende-kal` | AFAD | Deprem Öncesi, Anı ve Sonrası Önlemini Al, Güvende Kal | https://www.afad.gov.tr/deprem-oncesi-ani-ve-sonrasi-onlemini-al-guvende-kal | 19.03.2018 | 23.10.2026 |
| `ready` | FEMA (ABD) — Ready.gov | Earthquakes | https://www.ready.gov/earthquakes | — (son güncelleme 09.09.2026) | 23.10.2026 |
| `acm112` | İçişleri Bakanlığı — 112 Acil Çağrı Merkezi | 112 Acil Çağrı Merkezi | https://www.112.gov.tr/ | — | 23.10.2026 |
| `guvende` | GÜVENDE | Uygulamanın çalışma biçimi (resmî kaynak değil) | — | — | — |

**Ready.gov tamamlayıcı kaynaktır:** yalnızca AFAD metinlerinde bulunmayan ve AFAD ile çelişmeyen maddelerde kullanılır (yatakta yastıkla korunma, iç duvar yanına çökme, kapı eşiğine sığınmama, el freni, baston/yürüteç, düdük, toz için ağzı örtme, artçıda yeniden Çök-Kapan-Tutun, arama yerine SMS, ağır enkazı tek başına kaldırmama). ABD'ye özgü bilgiler (911, sigorta) alınmadı. AFAD ile çelişen konularda (hayat üçgeni, tünelde araçtan inme) madde gösterilmez.

Sayfalar, geliştirme ortamının internet erişimi kısıtlı olduğu için Supabase sunucusundan (pg_net) indirilip okundu.

**Erişilemeyen / okunamayan:** `saglik.gov.tr` (bağlantı koptu); `shakeout.org` ve `earthquakecountry.org` (403); `kizilay.org.tr` deprem sayfası (404); AFAD'ın ayrıntılı "Afet ve Acil Durum Çantası" sayfası (aranan adreslerde 404).

## 2. Telif ve kullanım

- AFAD sayfalarının altında "© 2026 T.C. İçişleri Bakanlığı Afet ve Acil Durum Yönetimi Başkanlığı" ibaresi var; açık lisans ifadesi bulunmuyor. Bu nedenle:
  - Metinler **birebir kopyalanmadı**; bilgiye dayanan kısa, özgün ifadeler yazıldı.
  - **AFAD görseli, infografiği veya logosu kullanılmadı.** Rehber ve Acil Durum fotoğrafları uygulama sahibinin sağladığı kolajdan kırpılır (`design/guide-art/source/collage.png` → `python3 design/guide-art/photos.py` → `assets/guide/art/`). Görseller uygulama sahibi tarafından yapay zekâ aracıyla üretilmiştir (sahibin 24.10.2026 beyanı); internetten alınmış fotoğraf değildir. Gerçek kişi, kurum logosu veya marka içermez. Logo ve ana sayfa kart dekoru çizimdir (`node design/guide-art/build.mjs`).
  - Uygulamada "GÜVENDE, AFAD'ın veya başka bir kurumun resmî uygulaması değildir" ibaresi her konu sayfasında ve rehber merkezinde gösterilir.
- **Hukuki değerlendirme önerilir:** Kaynak gösterilerek özetleme yapılması (FSEK m.35 alıntı/özet sınırları) ve kurum adının kaynak olarak anılması uygun kabul edilse de yayın öncesi bir hukukçunun onayı alınmalıdır.

## 3. Uzman incelemesi bekleyen maddeler (uygulamada GÖSTERİLMİYOR)

| Konu | Madde | Neden beklemede |
|---|---|---|
| İçerideyseniz | "Hayat üçgeni" oluşturun | AFAD 2018 metni Çök-Kapan-Tutun ile birlikte "hayat üçgeni" ifadesini kullanıyor; uluslararası kuruluşlar bu yöntemi önermiyor. Kaynaklar arası çelişki: uygulama yalnızca Çök-Kapan-Tutun anlatır. |
| İçerideyseniz | Asansördeyseniz tüm katların düğmesine basıp ilk durakta inin | Okunan AFAD kaynaklarında yok. |
| Araçtaysanız | Tünel/kapalı otoparkta araçtan inip aracın yanına yan yatın | AFAD önerisi; başka ülkelerin rehberleri araçta kalmayı öneriyor. Uzman görüşü gerekli. |
| Çanta | Çantayı ulaşılması zor yerde saklamayın | Genel öneri; kaynakta açık ifade yok. |

## 4. Kaldırılan önceki içerik

Önceki sürümdeki "Yangın", "Yaralanma (temel ilk yardım)" ve "Tahliye" rehberleri kaynakla doğrulanmadığı için kaldırıldı. İlk yardım içeriği **Sağlık Bakanlığı / Kızılay** kaynağı okunup tıbbi uzman onayı alınmadan yeniden eklenmemelidir. Gaz/yangın ve tahliye ile ilgili AFAD destekli maddeler "Deprem sonrasında" konularına taşındı.

## 5. Kısmen kaynaklı içerik

- **Acil durum çantası madde listesi** (`src/features/emergency/content.ts`, `/canta`): AFAD ilk 72 saat için çanta önerir ve belge kopyalarının su geçirmez saklanmasını söyler; ancak su, gıda, fener, düdük, powerbank gibi madde madde liste AFAD'ın ayrıntılı listesiyle **karşılaştırılamadı**. Ekranda bu durum açıkça yazılıdır.
- **Özel ihtiyaçlar:** Tekerlekli sandalye (tekerlekleri kilitle, baş-boynu koru) ve deprem sonrası yaşlı/bebek/hamile/engelli bireylere yardım AFAD kaynaklıdır. **Evcil hayvanlar ve engelli bireyler için hazırlık** konusunda okunan kaynaklarda içerik yok; bu bölüm eklenmedi.

## 5b. Türetilmiş maddeler

- **Özel ihtiyaçlar** (`prep-special`): iki AFAD maddesinin birleşimidir — "Afete hazırlık planını evdeki herkesle birlikte yapın, tatbikat yapın" ile "Yaşlı, bebek, hamile ve engelli bireylere yardımcı olun" / "Tekerlekli sandalyede tekerlekleri kilitleyin, baş ve boynu koruyun". **Evcil hayvanlar için kaynaklı içerik yok**; bu yüzden metinde yer almaz (görselde kedi bulunur).
- **Hazırlık grupları:** "Ev güvenliği" ve "Eşya ve mobilya güvenliği", `prep-home` konusunun maddeleridir (`g: 'furniture'` ile ayrılır). "Acil durum çantası" grubu `/canta` listesini sayar.

## 6. Güncelleme süreci

1. Kaynak sayfalar yeniden okunur ve maddeler karşılaştırılır.
2. Değişen maddeler güncellenir; `CONTENT_VERSION` artırılır, `CHECKED_AT` ve kaynakların `checkedAt` alanları güncellenir.
3. `npx jest src/features/guide` çalıştırılır (her gösterilen maddenin kaynağı, bağlantılar, kısayollar test edilir).
4. Doğrulama 365 günden eskiyse uygulama "güncel olmayabilir" uyarısı gösterir.

## 7. 24 Ekim 2026 karşılaştırması

AFAD'ın iki sayfası yeniden okunup her gösterilen madde metinle karşılaştırıldı:

- "Sağlam masa **veya** mobilyanın yanında çökün" → AFAD metnine uygun olarak "masanın **altına** ya da dolgun koltuk/kanepe gibi eşyanın **yanına**" diye düzeltildi.
- "Eşya almak için geri dönmeyin" kaldırıldı (AFAD, binayı terk ederken gerekli eşyanın alınmasını söylüyor).
- Araç ve gaz konularındaki "neden" metinleri kaynakta olmayan ifadeler ("kontrolü kaybedebilir", "patlama") yerine kaynaktaki gerekçelerle yeniden yazıldı.
- "Yaralanmaların önemli bir kısmı" gibi kaynaksız oran ifadesi kaldırıldı.
- Ready.gov ile iki inceleme maddesi (yatak, toz) çözüldü ve yeni maddeler eklendi (bkz. bölüm 1).

### Görseller (24 Ekim 2026)

- Yeni özgün sahneler: **gaz** (borudaki vanayı kapatan el, açık pencere, "ateş yakmayın" işareti; AFAD gaz maddeleri) ve **tekerlekli sandalye** (tekerlekler kilitli, öne eğilip kollarla baş ve enseyi koruma; AFAD + Ready.gov). Önceden gaz konusu "binadan uzaklaşma", tekerlekli sandalye konusu genel "özel ihtiyaçlar" görselini kullanıyordu.
- Konu sayfasının üst görseli artık iç çerçevesiz, tam genişlikte 2:1 yatay kesittir (`GuideHero`); metro, gaz ve tekerlekli sandalye için de yatay kesit üretildi.

### Fotoğraflar (24 Ekim 2026)

Konu görselleri kullanıcının sağladığı 5×4 kolajdan kırpıldı. Bilinen sınırlar:

- **Çözünürlük:** her karo ~300×230 piksel; çıktılar 2× büyütüldü. Büyük alanlarda (konu sayfası üst görseli) telefonda yumuşak görünebilir. Karoların tek tek ≥1600 px sürümleri gelince `photos.py` doğrudan o dosyalarla çalıştırılmalı.
- **Gaz:** karodaki vana kolu boruya paralel (= açık) ve yanında yeşil onay var; "vanayı kapatın" ile çeliştiği için kol ve onay kırpıldı, yalnızca sayaç ve "ateş yakmayın" işareti kaldı. Kolu boruya dik (kapalı) yeni bir görsel gerekli.
- **Tekerlekli sandalye:** "hareket" anlamındaki yeşil ok kırpıldı. Kilitli fren görünmüyor.
- **İkinci kolaj (`collage2.png`, 24.10.2026):** Çök-Kapan-Tutun (bir el başta, diğeri masa ayağında) ve çanta görselleri bununla değiştirildi. Gaz karosunda vana yine dikey boru üzerinde ve kol boruya paralel (= açık), yanında onay var; vana ve onay yine kırpıldı. Tekerlekli sandalye yakın çekimi kullanılmadı: frenin kilitli olduğu anlaşılmıyor ve el tekerleği itiyor gibi.
- Kullanılmayan karolar: acil çıkış tabelası, konum/uyarı telefonu.
- **Üçüncü ve dördüncü kolaj (`collage3.png`, `collage4.png`, 24.10.2026):** tekerlekli sandalye (öne eğilip başını koruyan), aile mesajı, belge poşeti ve çanta içeriği konu görsellerine; yatak, iç duvar, baston, kıyı, sigorta kutusu ve ocak ise ilgili maddelerin yanına küçük resim olarak eklendi (`Item.pic`). Kullanılmayanlar: gaz (iki kolajda da vana kolu boruya paralel = açık, yanında onay) ve enkaz yığınında çömelen kişi (hasarlı binanın dibinde; "hasarlı binalardan uzak durun" ile çelişir). İç duvar karosunda kişinin yanındaki pencere perdesi kırpıldı.
