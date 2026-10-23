import { colors } from '@/theme';

/**
 * Harita kaplama katmanları (MapLibre stil tanımı). Hem native hem önizleme tarafında aynı tanım kullanılır.
 * Halkalar merkez üssüne UZAKLIĞI gösterir; renk geçişi görseldir, ölçülmüş sarsıntı alanı değildir.
 */
type LayerDef = { id: string; type: 'fill' | 'line' | 'circle'; paint: Record<string, unknown>; filter?: unknown[] };

export const RING_LAYERS: LayerDef[] = [
  {
    id: 'rings-fill',
    type: 'fill',
    paint: {
      'fill-color': [
        'step',
        ['get', 'km'],
        colors.danger,
        12,
        '#FF4B3A',
        20,
        colors.warning,
        30,
        '#FFA22B',
        40,
        '#FFB81F',
        60,
        colors.caution,
      ],
      // Üst üste binen halkalar merkeze doğru koyulaşan yumuşak bir geçiş oluşturur.
      'fill-opacity': ['step', ['get', 'km'], 0.34, 12, 0.26, 20, 0.19, 30, 0.14, 40, 0.1, 60, 0.08],
    },
  },
  {
    id: 'rings-line',
    type: 'line',
    filter: ['in', ['get', 'km'], ['literal', [25, 50, 75]]],
    paint: {
      'line-color': ['step', ['get', 'km'], colors.danger, 40, colors.warning, 60, colors.caution],
      'line-opacity': 0.75,
      'line-width': 1.5,
    },
  },
];

export const REPORT_LAYERS: LayerDef[] = [
  {
    id: 'reports-glow',
    type: 'circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 9, 10, 15],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.35,
      'circle-blur': 1,
    },
  },
  {
    id: 'reports-dot',
    type: 'circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 4, 10, 7],
      'circle-color': ['get', 'color'],
      'circle-stroke-color': '#071522',
      'circle-stroke-width': 1.5,
    },
  },
];

const isFocus = ['==', ['get', 'focus'], true];

export const QUAKE_LAYERS: LayerDef[] = [
  {
    id: 'quake-glow-outer',
    type: 'circle',
    filter: isFocus,
    paint: { 'circle-radius': 64, 'circle-color': colors.danger, 'circle-opacity': 0.22, 'circle-blur': 1 },
  },
  {
    id: 'quake-glow-inner',
    type: 'circle',
    filter: isFocus,
    paint: { 'circle-radius': 34, 'circle-color': colors.danger, 'circle-opacity': 0.4, 'circle-blur': 0.7 },
  },
  {
    id: 'quake-dot',
    type: 'circle',
    paint: {
      'circle-radius': ['case', isFocus, 13, ['interpolate', ['linear'], ['get', 'mag'], 1, 3, 3, 5, 5, 9, 7, 14]],
      'circle-color': ['case', isFocus, colors.danger, ['get', 'color']],
      'circle-opacity': 0.95,
      'circle-stroke-color': ['case', isFocus, '#FFD0D5', '#030B14'],
      'circle-stroke-width': ['case', isFocus, 2, 1],
    },
  },
  { id: 'quake-core', type: 'circle', filter: isFocus, paint: { 'circle-radius': 4, 'circle-color': '#FFFFFF' } },
];

const isCluster = ['has', 'point_count'];
const notCluster = ['!', ['has', 'point_count']];

/** Toplanma alanları kümelenir: binlerce nokta tek tek çizilmez; dokununca yakınlaşır. */
export const ASSEMBLY_LAYERS: LayerDef[] = [
  {
    id: 'assembly-cluster',
    type: 'circle',
    filter: isCluster,
    paint: {
      'circle-radius': ['step', ['get', 'point_count'], 13, 10, 17, 50, 22, 200, 28],
      'circle-color': colors.safe,
      'circle-opacity': 0.35,
      'circle-stroke-color': colors.safe,
      'circle-stroke-width': 2,
    },
  },
  {
    id: 'assembly-glow',
    type: 'circle',
    filter: notCluster,
    paint: { 'circle-radius': 15, 'circle-color': colors.safe, 'circle-opacity': 0.3, 'circle-blur': 1 },
  },
  {
    id: 'assembly-dot',
    type: 'circle',
    filter: notCluster,
    paint: { 'circle-radius': 7.5, 'circle-color': colors.safe, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2.5 },
  },
];
/** Küme ayarı (native ve web aynı). */
export const ASSEMBLY_CLUSTER = { cluster: true, clusterRadius: 44, clusterMaxZoom: 14 } as const;

/** Aktif fay hatları: ince turuncu-kırmızı çizgi (deprem noktalarının altında kalır). */
export const FAULT_COLOR = '#F2542D';
export const FAULT_LAYERS: LayerDef[] = [
  {
    id: 'fault-line',
    type: 'line',
    paint: { 'line-color': FAULT_COLOR, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.2, 10, 2.5], 'line-opacity': 0.85 },
  },
];
