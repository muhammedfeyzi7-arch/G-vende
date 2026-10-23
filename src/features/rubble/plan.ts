/**
 * Enkaz Altı Modu zamanlaması. Sürekli siren + flaş telefonu birkaç saatte bitirir; kurtarma
 * çalışmaları ise günler sürebilir. "Pil koruma" modunda her döngüde bir kez siren ve bir kez SOS
 * flaşı verilir, kalan sürede telefon karanlık ve sessiz bekler.
 */
export type RubbleMode = 'saver' | 'continuous';

/** Pil korumada bir döngü (siren + SOS flaşı, sonra bekleme). */
export const SAVER_CYCLE_MS = 30_000;

// Mors SOS: ... --- ...  Flaş için birim 300 ms (kamera ışığı çok hızlı açılıp kapanamaz).
const U = 300;
const dot = (): [boolean, number][] => [
  [true, U],
  [false, U],
];
const dash = (): [boolean, number][] => [
  [true, 3 * U],
  [false, U],
];
/** [ışık açık mı, süre ms] adımları; toplam ≈ 10 sn. */
export const SOS_STEPS: [boolean, number][] = [
  ...dot(),
  ...dot(),
  ...dot(),
  [false, 2 * U],
  ...dash(),
  ...dash(),
  ...dash(),
  [false, 2 * U],
  ...dot(),
  ...dot(),
  ...dot(),
  [false, 6 * U],
];
export const SOS_MS = SOS_STEPS.reduce((t, [, ms]) => t + ms, 0);

/** Döngü başında ışığın ne kadar süre SOS vereceği; pil korumada döngü başına bir kez. */
export function torchStepsFor(mode: RubbleMode): { steps: [boolean, number][]; repeatAfterMs: number } {
  return mode === 'continuous' ? { steps: SOS_STEPS, repeatAfterMs: 0 } : { steps: SOS_STEPS, repeatAfterMs: SAVER_CYCLE_MS - SOS_MS };
}

/** Işığın açık kaldığı zaman oranı (pil tahmini ve testler için). */
export function torchDuty(mode: RubbleMode): number {
  const on = SOS_STEPS.reduce((t, [lit, ms]) => t + (lit ? ms : 0), 0);
  return mode === 'continuous' ? on / SOS_MS : on / SAVER_CYCLE_MS;
}
