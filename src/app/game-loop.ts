import { clampFrameDt } from './frame-time';

/** Passo fisso della simulazione, in secondi. */
export const FIXED_STEP = 1 / 60;
/** Tetto ai passi per frame: oltre, il tempo in eccesso si perde invece di rincorrerlo. */
export const MAX_STEPS_PER_FRAME = 5;

/**
 * Accumulatore a passo fisso: aggiunge `dt` e dice quanti passi eseguire, con il resto da portare
 * al frame dopo. Se si supera `maxSteps` il resto viene scartato.
 */
export function consumeSteps(
  accumulator: number,
  dt: number,
  step = FIXED_STEP,
  maxSteps = MAX_STEPS_PER_FRAME,
): { steps: number; accumulator: number } {
  const total = accumulator + (Number.isFinite(dt) && dt > 0 ? dt : 0);
  const steps = Math.floor(total / step + 1e-9);
  if (steps > maxSteps) return { steps: maxSteps, accumulator: 0 };
  return { steps, accumulator: Math.max(0, total - steps * step) };
}

/** Ciclo requestAnimationFrame con delta di frame limitato (scheda in background e ritorno). */
export class GameLoop {
  private rafId = 0;
  private lastTime = 0;
  private isRunning = false;

  constructor(
    /** `dt` è limitato (animazione); `rawDt` è il delta reale (contatore fps). */
    private readonly onFrame: (dt: number, rawDt: number) => void,
  ) {}

  get running(): boolean {
    return this.isRunning;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    cancelAnimationFrame(this.rafId);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private readonly frame = (now: number): void => {
    if (!this.isRunning) return;
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.onFrame(clampFrameDt(rawDt), rawDt);
    if (this.isRunning) this.rafId = requestAnimationFrame(this.frame);
  };

  private readonly onVisibilityChange = (): void => {
    // Ritorno da una scheda nascosta: si dimentica l'intervallo invece di animarlo.
    this.lastTime = performance.now();
  };
}
