import TR from './turkey.json';

/**
 * Uygulamaya gömülü Türkiye altlığı (Natural Earth, kamu malı). İnternet yokken de harita boş kalmaz:
 * kara/deniz, il sınırları, ana yollar, göller, nehirler. Şehir adları yazı tipi (glyph) indirmeden
 * çizilebilsin diye QuakeMap'te işaretçi olarak gösterilir (bkz. CITY_LABELS).
 */
type FC = GeoJSON.FeatureCollection;
const data = TR as unknown as Record<'land' | 'turkey' | 'provinces' | 'borders' | 'roads' | 'lakes' | 'rivers' | 'places' | 'seas', FC>;

export interface BasePalette {
  sea: string;
  land: string;
  turkey: string;
  lake: string;
  river: string;
  province: string;
  provinceOpacity: number;
  border: string;
  road: string;
  roadMinor: string;
  roadGlow: number;
  /** Şehir ışığı parıltısı (gece görünümü); 0 ise çizilmez */
  cityGlow: number;
}

export const NIGHT_SATELLITE: BasePalette = {
  sea: '#071421',
  land: '#18241E',
  turkey: '#1D2B23',
  lake: '#0B2539',
  river: '#1E4D73',
  province: '#8C78B8',
  provinceOpacity: 0.42,
  border: '#9FB0C2',
  road: '#E3AA3C',
  roadMinor: '#9C6FB8',
  roadGlow: 0.22,
  cityGlow: 0.55,
};

export const NAVY_DARK: BasePalette = {
  sea: '#030B14',
  land: '#0B1925',
  turkey: '#0E1E2D',
  lake: '#04101C',
  river: '#0F2B45',
  province: '#2C4A68',
  provinceOpacity: 0.8,
  border: '#4A6A8C',
  road: '#36597C',
  roadMinor: '#22405C',
  roadGlow: 0,
  cityGlow: 0.25,
};

export const DAYLIGHT: BasePalette = {
  sea: '#B9D6EE',
  land: '#ECEFE8',
  turkey: '#F7F8F4',
  lake: '#A9CBE8',
  river: '#8DB8DE',
  province: '#A893CF',
  provinceOpacity: 0.55,
  border: '#7D8B9A',
  road: '#E39A2C',
  roadMinor: '#E9B86A',
  roadGlow: 0,
  cityGlow: 0,
};

export const OFFLINE_SOURCES = {
  tr_land: { type: 'geojson', data: data.land },
  tr_turkey: { type: 'geojson', data: data.turkey },
  tr_provinces: { type: 'geojson', data: data.provinces },
  tr_borders: { type: 'geojson', data: data.borders },
  tr_roads: { type: 'geojson', data: data.roads },
  tr_lakes: { type: 'geojson', data: data.lakes },
  tr_rivers: { type: 'geojson', data: data.rivers },
  tr_places: { type: 'geojson', data: data.places },
};

/** Kara ve su dolguları (uydu görüntüsünün altına). */
export const offlineFillLayers = (p: BasePalette) => [
  { id: 'tr-bg', type: 'background', paint: { 'background-color': p.sea } },
  { id: 'tr-land', type: 'fill', source: 'tr_land', paint: { 'fill-color': p.land } },
  { id: 'tr-turkey', type: 'fill', source: 'tr_turkey', paint: { 'fill-color': p.turkey } },
];

/** Göller, nehirler, sınırlar, yollar (uydu görüntüsünün üstüne). */
export const offlineLineLayers = (p: BasePalette) => [
  { id: 'tr-lakes', type: 'fill', source: 'tr_lakes', paint: { 'fill-color': p.lake } },
  {
    id: 'tr-rivers',
    type: 'line',
    source: 'tr_rivers',
    paint: { 'line-color': p.river, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 10, 1.6] },
  },
  {
    id: 'tr-provinces',
    type: 'line',
    source: 'tr_provinces',
    paint: {
      'line-color': p.province,
      'line-opacity': p.provinceOpacity,
      'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 10, 1.4],
      'line-dasharray': [2, 1.5],
    },
  },
  {
    id: 'tr-borders',
    type: 'line',
    source: 'tr_borders',
    paint: { 'line-color': p.border, 'line-opacity': 0.7, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 10, 2] },
  },
  ...(p.roadGlow
    ? [
        {
          id: 'tr-roads-glow',
          type: 'line',
          source: 'tr_roads',
          filter: ['==', ['get', 'major'], 1],
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': p.road,
            'line-opacity': p.roadGlow,
            'line-blur': 3,
            'line-width': ['interpolate', ['linear'], ['zoom'], 5, 3, 10, 8],
          },
        },
      ]
    : []),
  ...(p.cityGlow
    ? [
        {
          // Gece uydu görüntüsündeki şehir ışıklarını andıran sıcak parıltı (yalnızca görsel).
          id: 'tr-city-glow',
          type: 'circle',
          source: 'tr_places',
          paint: {
            'circle-color': '#FFB347',
            'circle-opacity': ['*', p.cityGlow, ['match', ['get', 'rank'], 1, 0.55, 2, 0.4, 0.28]],
            'circle-blur': 1,
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              4,
              ['match', ['get', 'rank'], 1, 14, 2, 8, 5],
              9,
              ['match', ['get', 'rank'], 1, 60, 2, 36, 22],
            ],
          },
        },
      ]
    : []),
  {
    id: 'tr-roads-minor',
    type: 'line',
    source: 'tr_roads',
    filter: ['==', ['get', 'major'], 0],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': p.roadMinor, 'line-opacity': 0.65, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 10, 1.4] },
  },
  {
    id: 'tr-roads',
    type: 'line',
    source: 'tr_roads',
    filter: ['==', ['get', 'major'], 1],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': p.road, 'line-opacity': 0.8, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.8, 10, 2.4] },
  },
];

export interface CityLabel {
  name: string;
  latitude: number;
  longitude: number;
  /** 1: metropol, 2: büyükşehir, 3: il merkezi */
  rank: number;
  sea?: boolean;
}

const toLabel = (f: GeoJSON.Feature, sea = false): CityLabel => {
  const [longitude, latitude] = (f.geometry as GeoJSON.Point).coordinates as [number, number];
  return { name: String(f.properties?.name), latitude, longitude, rank: sea ? 0 : Number(f.properties?.rank ?? 3), sea };
};

export const CITY_LABELS: CityLabel[] = [...data.seas.features.map((f) => toLabel(f, true)), ...data.places.features.map((f) => toLabel(f))];

/** Yakınlaştırmaya göre gösterilecek etiketler (kalabalığı önlemek için). */
export function visibleLabels(zoom: number): CityLabel[] {
  return CITY_LABELS.filter((l) => (l.sea ? zoom < 8.5 : l.rank === 1 ? zoom < 11 : l.rank === 2 ? zoom >= 4.8 && zoom < 11 : zoom >= 5.7 && zoom < 11));
}
