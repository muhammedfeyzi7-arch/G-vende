# GÜVENDE — Deprem ve Afet Güvenliği Uygulaması

React Native (Expo SDK 58, Expo Router, TypeScript) ile iOS ve Android için geliştirilen mobil uygulama.
Backend: Supabase (Postgres + RLS + Storage + Edge Functions). Harita: MapLibre React Native.

> Projenin güncel durumu, doğrulanan/doğrulanamayan noktalar: [`docs/TEKNIK_DURUM.md`](docs/TEKNIK_DURUM.md)

![Ana ekran düzen önizlemesi](docs/ana-ekran-onizleme.png)
_(Web önizlemesi: kaplama katmanları gerçek çizimdir, taban harita karoları bu ortamdan yüklenemediği için zemin düzdür. Deprem kaydı test verisidir; akıştaki kayıtlar “ÖRNEK VERİ” etiketlidir.)_

## Windows'ta kurulum

1. [Node.js 22 LTS](https://nodejs.org) ve [Git](https://git-scm.com) kurun.
2. Bağımlılıklar:
   ```powershell
   npm install
   copy .env.example .env   # değerleri doldurun
   ```
3. **Development build gerekir** (MapLibre yerel modül içerdiği için Expo Go ile çalışmaz):
   - **Android (Windows'ta yerel):** Android Studio + bir emülatör veya USB hata ayıklamalı telefon →
     `npx expo run:android`
   - **iOS (Windows'tan bulutta):** `npx eas-cli@latest build --profile development --platform ios`
     (Apple Developer hesabı gerekir), sonra `npm run start:dev-client`.
   - Bulutta Android: `npx eas-cli@latest build --profile development --platform android`
4. Push bildirimleri için bir kez `npx eas-cli@latest init` çalıştırın (EAS `projectId` oluşturur).

## iPhone'da hızlı deneme (Expo Go, Apple hesabı gerekmez)

1. iPhone'a App Store'dan **Expo Go** uygulamasını kurun.
2. Bilgisayarda: `npm install`, ardından `npx expo start --tunnel`.
3. Ekrandaki QR kodu iPhone **Kamera** uygulamasıyla okutun; Expo Go'da açılır.

Expo Go yerel harita modülünü (MapLibre) içermez; bu modda uygulama gömülü Türkiye altlığıyla çizilen
**basit harita** kullanır (uydu/sokak ayrıntısı yok). Tam harita için geliştirme derlemesi gerekir
(`eas build --profile development --platform ios`, Apple Developer hesabı ister).

## Ortam değişkenleri (`.env`)

| Değişken | Açıklama |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yalnızca herkese açık anon anahtar. **service_role anahtarı asla buraya yazılmaz.** |
| `EXPO_PUBLIC_MAP_STYLE_URL` | MapLibre stil URL'si. Boşsa OpenFreeMap `dark` (anahtarsız). |
| `EXPO_PUBLIC_QUAKE_SOURCES` | `afad,kandilli,usgs` |
| `EXPO_PUBLIC_DEMO_REPORTS` | `1` ise yalnızca geliştirme derlemesinde, backend yokken “ÖRNEK VERİ” etiketli örnek akış. Üretimde yok sayılır. |

## Supabase kurulumu

```bash
npx supabase link --project-ref <proje>
node scripts/sync-function-shared.mjs      # fonksiyonların kullandığı src/ kodunu kopyalar
npx supabase db push                       # supabase/migrations/*
npx supabase functions deploy ingest-earthquakes delete-account notify-family verify-identity
```

- **Gizli değerler:** `20261023000007_jobs.sql` Vault'ta rastgele `ingest_secret`, `webhook_secret`, `identity_hash_pepper` üretir; fonksiyonlar bunları `internal_secret` (yalnızca service_role) ile okur. Panelde elle secret girmek gerekmez (girilirse ortam değişkeni önceliklidir). Push için isteğe bağlı: `EXPO_ACCESS_TOKEN`.
- **Proje adresi (bir kez, SQL düzenleyicide):** `select vault.create_secret('https://<proje>.supabase.co', 'project_url');`
- **Auth:** E-posta OTP'yi açın; e-posta şablonunda `{{ .Token }}` (6 haneli kod) gösterilmeli.
- **ingest-earthquakes:** `pg_cron` her dakika `pg_net` ile `x-ingest-secret` başlığıyla çağırır (migration kurar).
- **notify-family:** `safety_checkins` INSERT tetikleyicisi `x-webhook-secret` ile çağırır (migration kurar; konum gönderilmez).
- **verify-identity (kimlik doğrulama):** NVİ KPSPublic servisine bağlanır; Vault'taki `identity_hash_pepper` (veya `IDENTITY_HASH_PEPPER`) olmadan çalışmaz. T.C. no / ad / doğum yılı saklanmaz.
- **Kurumsal hesap (Resmî rozet):** Yalnızca SQL düzenleyicisinden (service role) atanır:
  `update public.profiles set role = 'official', org_name = 'AFAD Düzce' where id = '<kullanıcı-uuid>';` (kurtarma ekibi için `role = 'rescue'`).
- **Toplanma alanları:** `scripts/import-assembly-points.mjs` ile yalnızca resmî kaynak dosyalarından (varsayılan kuru çalıştırma).

## Komutlar

| Komut | Ne yapar |
| --- | --- |
| `npm test` | Jest birim + bileşen testleri |
| `npm run typecheck` | TypeScript denetimi |
| `npm run test:db` | Yerel PostgreSQL 16+ ile şema + RLS testleri (Linux/WSL; Windows'ta WSL önerilir) |
| `npx deno test supabase/functions/_shared/` | Sunucu işlevi birim testleri (`supabase/functions` dizininde) |

## Klasör yapısı

```
src/app/                 Expo Router ekranları ((tabs): Ana Sayfa, Harita, Acil Durum, Ailem, Ayarlar)
src/features/earthquakes Kaynak katmanı (AFAD, Kandilli, USGS), birleştirme, uyarı durumu, bileşenler
src/features/map         MapLibre haritası, katmanlar, lejant, seçim kartı
src/features/reports     Kullanıcı bildirimleri: API, doğrulama, çevrimdışı kuyruk, bileşenler
src/features/assembly-points  Resmî toplanma alanları
src/features/family      Aile güvenlik ağı
src/features/emergency   Çevrimdışı talimatlar ve afet çantası
src/providers, services, hooks, theme, types, utils
supabase/migrations      Şema, RLS, depolama politikaları
supabase/functions       ingest-earthquakes, notify-family, delete-account
supabase/tests           Yerel RLS testleri
plugins/                 Expo config plugin (Kandilli HTTP istisnası)
```
