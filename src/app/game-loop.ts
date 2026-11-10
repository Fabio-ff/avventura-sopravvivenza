import { clampFrameDt } from './frame-time';

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
