export type QuakeSourceId = 'afad' | 'kandilli' | 'usgs';

/**
 * Kaynağın olay için verdiği çözümün durumu.
 * - reviewed: kaynak tarafından gözden geçirilmiş / revize edilmiş çözüm
 * - automatic: otomatik veya ilksel çözüm
 * - unknown: kaynak bu bilgiyi vermiyor
 */
export type ReviewStatus = 'reviewed' | 'automatic' | 'unknown';

/** Tek bir kaynağın tek bir olaya ilişkin ölçümü. Değerler kaynaktan geldiği gibi korunur. */
export interface SourceReading {
  source: QuakeSourceId;
  sourceEventId: string;
  /** Büyüklük (ör. ML 4.8). Kaynak vermiyorsa null — asla tahmin edilmez. */
  magnitude: number | null;
  magnitudeType: string | null;
  latitude: number;
  longitude: number;
  /** km; kaynak vermiyorsa null. */
  depthKm: number | null;
  /** ISO 8601 UTC */
  occurredAt: string;
  /** Kaynağın yayımlama/güncelleme zamanı (ISO). Bilinmiyorsa null. */
  sourceUpdatedAt: string | null;
  /** Bu kaydın uygulama tarafından alındığı zaman (ISO). */
  fetchedAt: string;
  place: string | null;
  url: string | null;
  reviewStatus: ReviewStatus;
}

/** Bir veya daha fazla kaynaktan birleştirilmiş tek olay. */
export interface EarthquakeEvent {
  /** Kararlı birleşik kimlik: birincil okumanın `${source}:${sourceEventId}` değeri. */
  id: string;
  /** Ekranda öne çıkan okuma (kaynak öncelik sırasına göre). */
  primary: SourceReading;
  /** Tüm kaynakların özgün okumaları (birincil dahil). */
  readings: SourceReading[];
}

export type SourceHealth = {
  source: QuakeSourceId;
  ok: boolean;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  error: string | null;
  count: number;
};
