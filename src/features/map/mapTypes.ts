import type { AssemblyPoint } from '@/types/assembly';
import type { EarthquakeEvent } from '@/types/earthquake';
import type { UserReport } from '@/types/report';
import type { LatLng } from '@/utils/geo';
import type { MapStyleId } from '@/features/settings/settings';

/** Harita bileşeninin (native MapLibre ve Expo Go yedeği) ortak tipleri. */
export type MapLayers = { quakes: boolean; rings: boolean; reports: boolean; assembly: boolean; family: boolean };
export const DEFAULT_LAYERS: MapLayers = { quakes: true, rings: true, reports: true, assembly: true, family: true };

/** Aile üyesinin izinli son konumu (yalnızca çevrimiçi grupta ve paylaşım açıksa). */
export type FamilyPin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  at: string;
  stale: boolean;
  status: 'safe' | 'help' | 'waiting' | 'home' | 'unknown';
  /** İşaretçinin altında gösterilecek kısa durum etiketi */
  label?: string;
  /** Yalnızca cihazda saklanan fotoğraf */
  photoUri?: string | null;
};

export type MapSelection = { kind: 'quake'; id: string } | { kind: 'report'; id: string } | { kind: 'assembly'; id: string };

export interface QuakeMapHandle {
  flyTo: (p: LatLng, zoom?: number) => void;
  /** Haritanın görünen merkezi (konum seçimi için) */
  getCenter: () => Promise<LatLng | null>;
}

export type QuakeMapProps = {
  events: EarthquakeEvent[];
  focus: EarthquakeEvent | null;
  reports: UserReport[];
  assemblyPoints: AssemblyPoint[];
  user: LatLng | null;
  /** GPS konumu mu (mavi nokta) yoksa elle seçilen il mi */
  userIsPrecise: boolean;
  layers: MapLayers;
  onSelect: (s: MapSelection) => void;
  /** Haritanın üst/alt kısmındaki kaplamalar için görünüm boşluğu */
  topInset?: number;
  bottomInset?: number;
  /** Açılış görünümü (verilmezse odak olay / kullanıcı / Türkiye) */
  initialCenter?: LatLng;
  initialZoom?: number;
  /** Kullanıcının Ayarlar'da seçtiği harita görünümü */
  mapStyle?: MapStyleId;
  /** false ise harita yalnızca gösterim amaçlıdır (kaydırma/yakınlaştırma kapalı) */
  interactive?: boolean;
  family?: FamilyPin[];
  /** Ölçek çubuğu (sol alt) */
  scaleBar?: boolean;
  /** Kaydırma/yakınlaştırma bitince görünen alan [batı, güney, doğu, kuzey] ve yakınlaştırma */
  onViewportChange?: (v: { bounds: [number, number, number, number]; zoom: number }) => void;
};

