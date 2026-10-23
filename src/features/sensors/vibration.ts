/**
 * Telefon ivmeölçerinden titreşim ölçümü (saf hesaplar; sensör aboneliği ekranda).
 * Yerçekimi düşük geçiren süzgeçle tahmin edilip çıkarılır; kalan "dinamik ivme" g cinsindendir.
 * Bu bir sismometre veya erken uyarı değildir: telefon masada dururken yakındaki titreşimi gösterir,
 * elde tutulurken yürüme ve el hareketi de görünür.
 */
export type Vec = { x: number; y: number; z: number };

export interface VibrationState {
  gravity: Vec | null;
  /** Son örneklerin dinamik ivme büyüklüğü (g), en yenisi sonda. */
  samples: number[];
  peak: number;
}

export const SAMPLE_INTERVAL_MS = 40; // 25 Hz
export const WINDOW = 250; // ~10 sn
const ALPHA = 0.9; // yerçekimi süzgeci

export const initialVibration = (): VibrationState => ({ gravity: null, samples: [], peak: 0 });

export function step(state: VibrationState, a: Vec): VibrationState {
  const g = state.gravity
    ? {
        x: ALPHA * state.gravity.x + (1 - ALPHA) * a.x,
        y: ALPHA * state.gravity.y + (1 - ALPHA) * a.y,
        z: ALPHA * state.gravity.z + (1 - ALPHA) * a.z,
      }
    : a;
  const m = Math.hypot(a.x - g.x, a.y - g.y, a.z - g.z);
  const samples = state.samples.length >= WINDOW ? [...state.samples.slice(1), m] : [...state.samples, m];
  return { gravity: g, samples, peak: Math.max(state.peak, m) };
}

/** Son `n` örneğin karekök ortalaması — anlık "seviye" için tek tek sıçramalardan daha kararlı. */
export function rms(samples: number[], n = 25): number {
  const s = samples.slice(-n);
  if (!s.length) return 0;
  return Math.sqrt(s.reduce((a, v) => a + v * v, 0) / s.length);
}

export type Level = { key: 'still' | 'light' | 'moderate' | 'strong'; label: string };

/** Telefonun algıladığı hareket düzeyi (deprem şiddeti değildir). */
export function levelOf(g: number): Level {
  if (g < 0.01) return { key: 'still', label: 'Sakin' };
  if (g < 0.05) return { key: 'light', label: 'Hafif titreşim' };
  if (g < 0.2) return { key: 'moderate', label: 'Belirgin sarsıntı' };
  return { key: 'strong', label: 'Güçlü hareket' };
}

/** Grafik için en fazla `points` noktaya indirger (her dilimin tepe değeri korunur). */
export function downsample(samples: number[], points: number): number[] {
  if (samples.length <= points) return samples;
  const size = samples.length / points;
  return Array.from({ length: points }, (_, i) => Math.max(...samples.slice(Math.floor(i * size), Math.floor((i + 1) * size))));
}
