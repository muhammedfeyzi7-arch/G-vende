import type { ReportCategory } from '@/types/report';
import { distanceKm, type LatLng } from '@/utils/geo';

/**
 * Bilgi kirliliğine karşı yayın kuralları. Sunucu (supabase/migrations/…_trust.sql) aynı kuralları
 * zorunlu uygular; buradaki kopya yalnızca kullanıcıya göndermeden önce ne eksik olduğunu göstermek içindir.
 */
export const REPORT_RADIUS_M = 1000;
export const VOTE_RADIUS_M = 500;
export const MAX_GPS_ACCURACY_M = 100;
export const LIVE_PHOTO_MAX_AGE_MIN = 10;
export const VERIFY_THRESHOLD = 3;

/** Olay yeri bildiren kategoriler: konum zorunlu. */
export const LOCATION_REQUIRED: ReportCategory[] = ['damage', 'road', 'help'];
/** Kanıt fotoğrafı zorunlu kategoriler (yalnızca uygulama kamerası). */
export const PHOTO_REQUIRED: ReportCategory[] = ['damage', 'road'];

export type TrustRole = 'user' | 'official' | 'rescue';

export interface TrustInfo {
  verified: boolean;
  role: TrustRole;
  orgName: string | null;
  strikes: number;
  suspendedUntil: string | null;
}

export const isSuspended = (t: TrustInfo | null, now = Date.now()) => !!t?.suspendedUntil && Date.parse(t.suspendedUntil) > now;
export const isInstitution = (t: TrustInfo | null) => t?.role === 'official' || t?.role === 'rescue';

export type GateKey = 'quake' | 'identity' | 'location' | 'photo' | 'community';
export type GateState = 'ok' | 'todo' | 'blocked' | 'skip' | 'info';
export interface Gate {
  key: GateKey;
  title: string;
  detail: string;
  state: GateState;
}

export interface GateInput {
  backend: boolean;
  signedIn: boolean;
  trust: TrustInfo | null;
  category: ReportCategory | null;
  /** Bildirime konum eklenecek mi (zorunlu kategorilerde her zaman) */
  withLocation: boolean;
  device: { latitude: number; longitude: number; accuracy: number } | null;
  /** Bildirilen nokta (bu sürümde cihaz konumu; ileride haritadan seçilebilir) */
  point: LatLng | null;
  photos: { capturedAt: string }[];
  /** Bulunulan yere yakın, son 72 saatteki resmî deprem (yoksa null). Bkz. reports/quakeGate. */
  nearbyQuake: { magnitude: number; place: string; source: string } | null;
  now?: number;
}

/** Kullanıcı akışı: 0) bölgede deprem 1) kimlik 2) konum 3) canlı fotoğraf 4) topluluk onayı. */
export function evaluateGates(i: GateInput): Gate[] {
  const now = i.now ?? Date.now();
  const inst = isInstitution(i.trust);
  const gates: Gate[] = [];

  // Herkese açık bildirim yalnızca deprem bölgesinde açılır (sunucu da denetler; kurumlar muaf).
  if (inst) {
    gates.push({ key: 'quake', title: 'Bölge şartı yok', detail: 'Kurumsal hesaplar her zaman bildirim yapabilir.', state: 'skip' });
  } else if (i.nearbyQuake) {
    gates.push({
      key: 'quake',
      title: `Bölgede deprem: M${i.nearbyQuake.magnitude.toFixed(1)}`,
      detail: `${i.nearbyQuake.place} · ${i.nearbyQuake.source} kaydı`,
      state: 'ok',
    });
  } else {
    gates.push({
      key: 'quake',
      title: 'Bölgenizde yakın zamanda deprem yok',
      detail: !i.device
        ? 'Konumunuz alınınca kontrol edilir.'
        : 'Olay bildirimi yalnızca son 72 saatte çevrenizde M4+ deprem olduysa açılır.',
      state: i.device ? 'blocked' : 'todo',
    });
  }

  gates.push(
    !i.backend
      ? { key: 'identity', title: 'Kimlik doğrulama', detail: 'Sunucu bağlantısı bu kurulumda yok.', state: 'blocked' }
      : !i.signedIn
        ? { key: 'identity', title: 'Kimlik doğrulama', detail: 'Önce giriş yapın.', state: 'todo' }
        : isSuspended(i.trust, now)
          ? {
              key: 'identity',
              title: 'Hesap askıda',
              detail: 'Yanlış ihbar nedeniyle bir süre bildirim gönderemezsiniz.',
              state: 'blocked',
            }
          : i.trust?.verified
            ? {
                key: 'identity',
                title: inst ? `Kurumsal hesap · ${i.trust.orgName ?? ''}`.trim() : 'Kimlik doğrulandı',
                detail: inst ? 'Bildirimleriniz “Resmî” rozetiyle yayınlanır.' : 'NVİ kimlik doğrulaması tamam.',
                state: 'ok',
              }
            : {
                key: 'identity',
                title: 'Kimlik doğrulama gerekli',
                detail: 'T.C. kimlik bilgilerinizle bir kez doğrulayın.',
                state: 'todo',
              },
  );

  const needLoc = !!i.category && (LOCATION_REQUIRED.includes(i.category) || !inst);
  if (!i.withLocation && !needLoc) {
    gates.push({ key: 'location', title: 'Konum eklenmeyecek', detail: 'Bildirim haritada gösterilmez.', state: 'skip' });
  } else if (inst) {
    gates.push({
      key: 'location',
      title: 'Konum',
      detail: 'Kurumsal hesaplar uzaktan bildirim yapabilir.',
      state: i.point ? 'ok' : 'todo',
    });
  } else if (!i.device) {
    gates.push({
      key: 'location',
      title: needLoc ? 'Canlı konum gerekli' : 'Canlı konum',
      detail: 'Yalnızca bulunduğunuz yerin 1 km yakınını bildirebilirsiniz.',
      state: 'todo',
    });
  } else if (i.device.accuracy > MAX_GPS_ACCURACY_M) {
    gates.push({
      key: 'location',
      title: 'GPS doğruluğu yetersiz',
      detail: `±${Math.round(i.device.accuracy)} m. Açık alanda tekrar deneyin (en fazla ${MAX_GPS_ACCURACY_M} m).`,
      state: 'todo',
    });
  } else if (i.point && distanceKm(i.device, i.point) * 1000 > REPORT_RADIUS_M) {
    gates.push({
      key: 'location',
      title: 'Bildirilen yer çok uzak',
      detail: 'Bildirilen nokta konumunuza en fazla 1 km olabilir.',
      state: 'blocked',
    });
  } else {
    gates.push({ key: 'location', title: 'Konum doğrulandı', detail: `GPS ±${Math.round(i.device.accuracy)} m`, state: 'ok' });
  }

  const needPhoto = !!i.category && PHOTO_REQUIRED.includes(i.category) && !inst;
  const live = i.photos.filter((p) => now - Date.parse(p.capturedAt) <= LIVE_PHOTO_MAX_AGE_MIN * 60_000);
  if (!needPhoto) {
    gates.push({ key: 'photo', title: 'Fotoğraf isteğe bağlı', detail: 'Yalnızca uygulama kamerasıyla çekilir.', state: 'skip' });
  } else if (live.length) {
    gates.push({ key: 'photo', title: 'Canlı fotoğraf eklendi', detail: 'Uygulama kamerasıyla şimdi çekildi.', state: 'ok' });
  } else {
    gates.push({
      key: 'photo',
      title: 'Kanıt fotoğrafı gerekli',
      detail: i.photos.length
        ? `Fotoğraf ${LIVE_PHOTO_MAX_AGE_MIN} dakikadan eski; yeniden çekin.`
        : 'Galeriden yükleme kapalı; uygulama kamerasıyla şimdi çekin.',
      state: 'todo',
    });
  }

  gates.push(
    inst
      ? { key: 'community', title: 'Resmî bilgi', detail: 'Doğrudan doğrulanmış olarak yayınlanır.', state: 'info' }
      : {
          key: 'community',
          title: 'Önce “Kullanıcı Bildirimi”',
          detail: `Yakındaki ${VERIFY_THRESHOLD} doğrulanmış kişi onaylayınca “Topluluk Destekli” olur; ${VERIFY_THRESHOLD} “yanlış ihbar” oyu alırsa kaldırılır.`,
          state: 'info',
        },
  );
  return gates;
}

export const gatesPass = (gates: Gate[]) => gates.every((g) => g.state === 'ok' || g.state === 'skip' || g.state === 'info');

/** Sunucu kural hatalarını kullanıcı diline çevirir; kural hatası değilse null. */
export function trustErrorMessage(message: string | undefined | null): string | null {
  const m = message ?? '';
  const map: [string, string][] = [
    ['identity_required', 'Bu işlem için kimlik doğrulaması gerekir.'],
    ['account_suspended', 'Yanlış ihbar nedeniyle hesabınız geçici olarak askıya alındı.'],
    ['no_recent_quake', 'Bölgenizde son 72 saatte M4+ deprem kaydı yok; olay bildirimi yalnızca deprem bölgesinde açılır.'],
    ['device_location_required', 'Canlı GPS konumunuz alınamadı.'],
    ['quake_location_required', 'Deprem bölgesinde olduğunuzun kontrolü için konum gerekir.'],
    ['location_required', 'Bu bildirim türü için konum zorunludur.'],
    ['location_inaccurate', `GPS doğruluğu yetersiz (en fazla ${MAX_GPS_ACCURACY_M} m).`],
    ['too_far', 'Bulunduğunuz yere çok uzak bir noktayı bildiremez veya oylayamazsınız.'],
    ['identity_too_new', 'Kimlik doğrulamasından 24 saat sonra oy verebilirsiniz (sahte hesaplara karşı önlem).'],
    ['collusion_limit', 'Aynı kişinin bildirimlerini 24 saatte en fazla 3 kez onaylayabilirsiniz.'],
    ['photo_not_live', `Fotoğraf uygulama kamerasıyla son ${LIVE_PHOTO_MAX_AGE_MIN} dakika içinde çekilmiş olmalı.`],
    ['own_report', 'Kendi bildiriminizi oylayamazsınız.'],
    ['official_report', 'Resmî bildirimler oylanamaz.'],
    ['no_location', 'Konumsuz bildirimler oylanamaz.'],
    ['report_not_found', 'Bildirim artık yayında değil.'],
  ];
  return map.find(([k]) => m.includes(k))?.[1] ?? null;
}
