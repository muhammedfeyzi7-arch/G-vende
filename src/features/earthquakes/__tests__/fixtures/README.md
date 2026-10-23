Bu klasördeki örnek yanıtlar, kaynakların bilinen yanıt BİÇİMİNE göre elle hazırlanmıştır
(ayrıştırıcı testleri için). Gerçek deprem kaydı değildir; uygulamada gösterilmez.
Geliştirme ortamında kaynaklara ağ erişimi olmadığından canlı yanıtla karşılaştırılamamıştır.

`emsc.json`: ilk kayıt, EMSC FDSN servisinin 2026-10-23'te Supabase sunucusundan alınan gerçek yanıtının biçimini ve
değerlerini izler; diğer kayıtlar kenar durumları (eksik büyüklük, deprem dışı olay "qb", geçersiz kayıt) için elle eklenmiştir.

`afad.json`: alan adları, 2026-10-23'te üretim senkronunun AFAD `apiv2/event/filter` servisinden aldığı gerçek yanıtta
gözlenenlerle birebir aynıdır (bkz. `quake_sync_state.sample_keys`, `sync.test.ts`). Değerler örnektir.
