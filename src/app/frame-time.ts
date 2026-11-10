/** Il frame più lungo, in secondi, di cui l'animazione può avanzare (scheda in background e ritorno). */
export const MAX_FRAME_DT = 0.1;

/** Limita il delta di frame a `[0, MAX_FRAME_DT]`. */
export function clampFrameDt(dt: number): number {
  if (!Number.isFinite(dt) || dt < 0) return 0;
  return Math.min(dt, MAX_FRAME_DT);
}
