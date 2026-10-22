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
  /** Yerel dosya URI'leri */
  photos: string[];
}

export type PendingReport = NewReportInput & {
  createdAt: string;
  attempts: number;
  lastError: string | null;
  /** Bildirim kaydı oluşturulduysa sunucu kimliği (fotoğraflar sonra yüklenecekse) */
  serverId: string | null;
};
