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
