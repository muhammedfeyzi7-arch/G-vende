import type { QuakeSourceId, SourceReading } from '@/types/earthquake';

export interface QuakeQuery {
  /** Başlangıç (dahil) */
  since: Date;
  until: Date;
  minMagnitude: number;
  /** Türkiye ve çevresi varsayılan sınır kutusu */
  bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  limit: number;
}

export interface QuakeSource {
  id: QuakeSourceId;
  label: string;
  /** Kullanıcıya gösterilen kaynak/kullanım notu */
  attribution: string;
  homepage: string;
  fetch(query: QuakeQuery, fetcher: Fetcher): Promise<SourceReading[]>;
}

export type Fetcher = (url: string, init?: { headers?: Record<string, string> }) => Promise<FetchResult>;

export interface FetchResult {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export const TURKEY_BBOX = { minLat: 34.5, maxLat: 43.5, minLon: 24.5, maxLon: 46.5 } as const;

export class SourceError extends Error {
  constructor(
    public source: QuakeSourceId,
    message: string,
  ) {
    super(message);
    this.name = 'SourceError';
  }
}
