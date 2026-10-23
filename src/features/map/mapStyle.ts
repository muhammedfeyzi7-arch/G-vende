import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import {
  DAYLIGHT,
  NAVY_DARK,
  NIGHT_SATELLITE,
  OFFLINE_SOURCES,
  offlineFillLayers,
  offlineLineLayers,
  type BasePalette,
} from './offline/base';

/**
 * Harita stilleri. Hepsinin altında uygulamaya gömülü Türkiye altlığı vardır (offline/base.ts):
 * internet yokken de kıyılar, il sınırları, ana yollar ve şehir adları görünür. İnternet varken
 * üstüne uydu görüntüsü (EOX Sentinel-2) ve 8. yakınlaştırmadan sonra sokak ayrıntısı
 * (OpenFreeMap vektör karoları, anahtarsız) eklenir.
 */
const name = ['coalesce', ['get', 'name:tr'], ['get', 'name:latin'], ['get', 'name']];

export const FALLBACK_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const OMT = { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: '© OpenMapTiles © OpenStreetMap katkıcıları' };
const NE_ATTRIBUTION = 'Natural Earth';

/** Yakın plan sokak ayrıntısı (çevrimiçi). */
function detailLayers(c: { urban: string; road: string; roadMinor: string; label: string; halo: string }) {
  return [
    {
      id: 'omt-urban',
      type: 'fill',
      source: 'omt',
      'source-layer': 'landuse',
      minzoom: 8,
      filter: ['in', ['get', 'class'], ['literal', ['residential', 'industrial', 'commercial']]],
      paint: { 'fill-color': c.urban, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.3, 12, 0.7] },
    },
    {
      id: 'omt-roads-minor',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      minzoom: 10,
      filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary', 'minor']]],
      paint: { 'line-color': c.roadMinor, 'line-opacity': 0.7, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 15, 3] },
    },
    {
      id: 'omt-roads-major',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      minzoom: 8,
      filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': c.road, 'line-opacity': 0.85, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 15, 5] },
    },
    {
      id: 'omt-place',
      type: 'symbol',
      source: 'omt',
      'source-layer': 'place',
      minzoom: 9,
      filter: ['in', ['get', 'class'], ['literal', ['town', 'village', 'suburb', 'city']]],
      layout: { 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 9, 11, 14, 15] },
      paint: { 'text-color': c.label, 'text-halo-color': c.halo, 'text-halo-width': 1.4 },
    },
  ];
}

const base = (n: string, p: BasePalette) => ({
  version: 8,
  name: n,
  glyphs: GLYPHS,
  sources: { ...OFFLINE_SOURCES, omt: OMT },
  metadata: { attribution: NE_ATTRIBUTION, palette: p },
});

/** Varsayılan: gece uydu görünümü (referans tasarım). */
export const SATELLITE_STYLE = {
  ...base('GÜVENDE Uydu', NIGHT_SATELLITE),
  sources: {
    ...OFFLINE_SOURCES,
    omt: OMT,
    s2: {
      type: 'raster',
      tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'],
      tileSize: 256,
      maxzoom: 14,
      attribution: 'Sentinel-2 cloudless – https://s2maps.eu, EOX IT Services GmbH (Copernicus Sentinel verisi 2016 & 2017 içerir)',
    },
  },
  layers: [
    ...offlineFillLayers(NIGHT_SATELLITE),
    { id: 'satellite', type: 'raster', source: 's2', paint: { 'raster-brightness-max': 0.55, 'raster-saturation': -0.25, 'raster-contrast': 0.15 } },
    ...offlineLineLayers(NIGHT_SATELLITE),
    ...detailLayers({ urban: '#2A2A33', road: '#E3AA3C', roadMinor: '#B98634', label: '#F2F6FA', halo: '#030B14' }),
  ],
} as unknown as StyleSpecification;

/** Koyu lacivert vektör görünüm. */
export const GUVENDE_DARK_STYLE = {
  ...base('GÜVENDE Koyu', NAVY_DARK),
  layers: [
    ...offlineFillLayers(NAVY_DARK),
    ...offlineLineLayers(NAVY_DARK),
    ...detailLayers({ urban: '#13253A', road: '#2F5172', roadMinor: '#1B3149', label: '#D8E2EC', halo: '#030B14' }),
  ],
} as unknown as StyleSpecification;

/** Açık tema / gündüz görünümü. */
export const LIGHT_STYLE = {
  ...base('GÜVENDE Açık', DAYLIGHT),
  layers: [
    ...offlineFillLayers(DAYLIGHT),
    ...offlineLineLayers(DAYLIGHT),
    ...detailLayers({ urban: '#E3E1DA', road: '#E39A2C', roadMinor: '#FFFFFF', label: '#1F2D3D', halo: '#FFFFFF' }),
  ],
} as unknown as StyleSpecification;

/** Son çare: hiçbir ağ kaynağı kullanmayan tamamen çevrimdışı stil (asla yüklenme hatası vermez). */
export const offlineOnlyStyle = (p: BasePalette) =>
  ({
    version: 8,
    name: 'GÜVENDE Çevrimdışı',
    sources: OFFLINE_SOURCES,
    layers: [...offlineFillLayers(p), ...offlineLineLayers(p)],
  }) as unknown as StyleSpecification;

/** Bir stilin şehir etiketleri için açık mı koyu mu yazı kullanacağı. */
export const isLightMap = (id: 'dark' | 'satellite' | 'light') => id === 'light';
export const paletteFor = (id: 'dark' | 'satellite' | 'light') => (id === 'light' ? DAYLIGHT : id === 'dark' ? NAVY_DARK : NIGHT_SATELLITE);

export const MAP_STYLE_OPTIONS: { id: 'dark' | 'satellite' | 'light'; label: string; description: string }[] = [
  { id: 'satellite', label: 'Uydu', description: 'Gece uydu görünümü + yollar ve şehirler (EOX Sentinel-2, CC BY 4.0)' },
  { id: 'dark', label: 'Koyu', description: 'Gece ve kesintide göz yormayan koyu harita' },
  { id: 'light', label: 'Açık', description: 'Gündüz kullanımına uygun açık harita' },
];
