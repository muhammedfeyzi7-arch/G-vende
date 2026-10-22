import type { StyleSpecification } from '@maplibre/maplibre-react-native';

/**
 * GÜVENDE koyu harita stili (OpenMapTiles şeması, OpenFreeMap vektör karoları — anahtarsız).
 * Referans tasarıma göre: lacivert kara, daha koyu deniz, silik yollar, büyük beyaz şehir adları.
 * EXPO_PUBLIC_MAP_STYLE_URL tanımlıysa o kullanılır; bu stil yüklenemezse QuakeMap
 * OpenFreeMap'in hazır "dark" stiline geri döner.
 */
const name = ['coalesce', ['get', 'name:tr'], ['get', 'name:latin'], ['get', 'name']];

export const FALLBACK_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

export const GUVENDE_DARK_STYLE = {
  version: 8,
  name: 'GÜVENDE Dark',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: '© OpenMapTiles © OpenStreetMap katkıcıları' },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#0A1824' } },
    {
      id: 'landcover',
      type: 'fill',
      source: 'omt',
      'source-layer': 'landcover',
      paint: {
        'fill-color': ['match', ['get', 'class'], 'wood', '#0C1E26', 'grass', '#0D1C24', 'rock', '#121F2B', '#0B1A25'],
        'fill-opacity': 0.8,
      },
    },
    {
      id: 'landuse-urban',
      type: 'fill',
      source: 'omt',
      'source-layer': 'landuse',
      filter: ['in', ['get', 'class'], ['literal', ['residential', 'industrial', 'commercial']]],
      paint: { 'fill-color': '#13253A', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.4, 11, 0.8] },
    },
    { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': '#030B14' } },
    {
      id: 'waterway',
      type: 'line',
      source: 'omt',
      'source-layer': 'waterway',
      minzoom: 8,
      paint: { 'line-color': '#06121E', 'line-width': 1 },
    },
    {
      id: 'boundary-state',
      type: 'line',
      source: 'omt',
      'source-layer': 'boundary',
      filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]],
      paint: { 'line-color': '#1F3A55', 'line-width': 0.7, 'line-dasharray': [3, 2], 'line-opacity': 0.7 },
    },
    {
      id: 'boundary-country',
      type: 'line',
      source: 'omt',
      'source-layer': 'boundary',
      filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]],
      paint: { 'line-color': '#35577A', 'line-width': 1.2 },
    },
    {
      id: 'roads-minor',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      minzoom: 10,
      filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary', 'minor']]],
      paint: { 'line-color': '#15293D', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 15, 3] },
    },
    {
      id: 'roads-major',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#1F3B57',
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 10, 1.6, 15, 5],
        'line-opacity': 0.9,
      },
    },
    {
      id: 'water-name',
      type: 'symbol',
      source: 'omt',
      'source-layer': 'water_name',
      layout: { 'text-field': name, 'text-font': ['Noto Sans Italic'], 'text-size': 12, 'text-letter-spacing': 0.05 },
      paint: { 'text-color': '#3E74B0', 'text-halo-color': '#030B14', 'text-halo-width': 1 },
    },
    {
      id: 'place-town',
      type: 'symbol',
      source: 'omt',
      'source-layer': 'place',
      minzoom: 7,
      filter: ['in', ['get', 'class'], ['literal', ['town', 'village']]],
      layout: { 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 7, 11, 12, 14] },
      paint: { 'text-color': '#B8C6D6', 'text-halo-color': '#030B14', 'text-halo-width': 1.4 },
    },
    {
      id: 'place-city',
      type: 'symbol',
      source: 'omt',
      'source-layer': 'place',
      filter: ['==', ['get', 'class'], 'city'],
      layout: {
        'text-field': name,
        'text-font': ['Noto Sans Bold'],
        // Büyük şehirler (rank küçük) daha büyük yazılır.
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4,
          ['case', ['<=', ['get', 'rank'], 3], 15, 12],
          9,
          ['case', ['<=', ['get', 'rank'], 3], 22, 17],
        ],
        'text-padding': 6,
        'text-allow-overlap': false,
      },
      paint: { 'text-color': '#F2F6FA', 'text-halo-color': '#030B14', 'text-halo-width': 1.8, 'text-halo-blur': 0.5 },
    },
  ],
} as unknown as StyleSpecification;

/**
 * Uydu görünümü: EOX "Sentinel-2 cloudless 2016" mozaiği (CC BY 4.0, ücretsiz; atıf zorunlu)
 * üzerine GÜVENDE sınır/yol/yer adı katmanları. Görüntü koyulaştırılarak kaplamalar öne çıkarılır.
 * Not: Karo adresi bu geliştirme ortamından doğrulanamadı.
 */
const overlayLayers = (GUVENDE_DARK_STYLE.layers as { id: string }[]).filter((l) =>
  ['boundary-state', 'boundary-country', 'roads-major', 'water-name', 'place-town', 'place-city'].includes(l.id),
);

export const SATELLITE_STYLE = {
  ...GUVENDE_DARK_STYLE,
  name: 'GÜVENDE Uydu',
  sources: {
    ...GUVENDE_DARK_STYLE.sources,
    s2: {
      type: 'raster',
      tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'],
      tileSize: 256,
      maxzoom: 14,
      attribution: 'Sentinel-2 cloudless – https://s2maps.eu, EOX IT Services GmbH (Copernicus Sentinel verisi 2016 & 2017 içerir)',
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#030B14' } },
    {
      id: 'satellite',
      type: 'raster',
      source: 's2',
      paint: { 'raster-brightness-max': 0.55, 'raster-saturation': -0.35, 'raster-contrast': 0.1 },
    },
    ...overlayLayers,
  ],
} as unknown as StyleSpecification;

/** Açık görünüm: OpenFreeMap "liberty" hazır stili. */
export const LIGHT_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export const MAP_STYLE_OPTIONS: { id: 'dark' | 'satellite' | 'light'; label: string; description: string }[] = [
  { id: 'dark', label: 'Koyu', description: 'Gece ve kesintide göz yormayan koyu harita (OpenStreetMap)' },
  { id: 'satellite', label: 'Uydu', description: 'Sentinel-2 uydu görüntüsü + yer adları (EOX, CC BY 4.0)' },
  { id: 'light', label: 'Açık', description: 'Gündüz kullanımına uygun açık harita (OpenStreetMap)' },
];
