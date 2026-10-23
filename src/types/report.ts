export type ReportCategory = 'shake' | 'damage' | 'road' | 'safe' | 'help' | 'other';
export type FeltIntensity = 1 | 2 | 3 | 4;
export type Verification = 'unverified' | 'community' | 'official';

export interface UserReport {
  id: string;
  category: ReportCategory;
  feltIntensity: FeltIntensity | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  areaLabel: string | null;
  earthquakeEventId: string | null;
  verification: Verification;
  helpfulCount: number;
  /** Yakındaki doğrulanmış kullanıcıların "doğru" / "yanlış ihbar" oyları (kurumsal oy 3 sayılır) */
  confirmCount: number;
  denyCount: number;
  /** Kurumsal hesap bildirimi ise rol ve kurum adı (ör. "AFAD Düzce") */
  authorRole: 'official' | 'rescue' | null;
  authorOrg: string | null;
  createdAt: string;
  media: { id: string; path: string; url: string | null }[];
  /** Yalnızca geliştirme örnek verisi için true; üretimde hiçbir zaman ayarlanmaz. */
  isSample?: boolean;
}

export interface NewReportInput {
  clientId: string;
  category: ReportCategory;
  feltIntensity: FeltIntensity | null;
  description: string;
  location: { latitude: number; longitude: number } | null;
  areaLabel: string | null;
  earthquakeEventId: string | null;
  /** Uygulama kamerasıyla çekilen fotoğraflar: yerel URI ve çekim zamanı */
  photos: ReportPhoto[];
  /** Gönderim anındaki cihaz GPS konumu (yalnızca sunucu kontrolü için; yayınlanmaz) */
  device: DeviceFix | null;
}

export interface ReportPhoto {
  uri: string;
  capturedAt: string;
}

export interface DeviceFix {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export type PendingReport = NewReportInput & {
  createdAt: string;
  attempts: number;
  lastError: string | null;
  /** Bildirim kaydı oluşturulduysa sunucu kimliği (fotoğraflar sonra yüklenecekse) */
  serverId: string | null;
};
