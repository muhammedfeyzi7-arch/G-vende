# Çevrimdışı Türkiye altlığı

`turkey.json` uygulamaya gömülüdür; internet yokken de harita boş kalmaz (kıyı şeridi, il sınırları,
ana yollar, göller, nehirler, il merkezleri, denizler).

- Kaynak: [Natural Earth](https://www.naturalearthdata.com) 1:10m (kamu malı / public domain):
  `ne_10m_land`, `ne_10m_admin_1_states_provinces`, `ne_10m_admin_0_countries`, `ne_10m_roads`,
  `ne_10m_lakes`, `ne_10m_rivers_lake_centerlines`, `ne_10m_populated_places_simple`.
- İşlem: 24–46°D, 34–43,5°K kutusuna kırpıldı, sadeleştirildi (~0,002–0,004°), koordinatlar 3 haneye yuvarlandı.
- İl merkezleri: 81 ilin yaklaşık merkez koordinatı (yalnızca etiket amaçlı, Türkçe adlarla).
- Ölçek kabadır (~1 km); sokak düzeyi ayrıntı çevrimiçi katmanlardan gelir.
