/** Media dei frame per secondo su una finestra di tempo (default mezzo secondo). */
export class FpsMeter {
  private frames = 0;
  private elapsed = 0;
  private value = 0;

  constructor(private readonly windowSeconds = 0.5) {}

  /** Registra un frame durato `dt` secondi; ritorna gli fps medi dell'ultima finestra chiusa (0 prima). */
  tick(dt: number): number {
    if (!Number.isFinite(dt) || dt <= 0) return this.value;
    this.frames += 1;
    this.elapsed += dt;
    if (this.elapsed >= this.windowSeconds) {
      this.value = this.frames / this.elapsed;
      this.frames = 0;
      this.elapsed = 0;
    }
    return this.value;
  }
}

/** Contatore fps sempre visibile in un angolo, leggibile sul tablet. */
export class FpsCounter {
  private readonly el: HTMLDivElement;
  private readonly meter = new FpsMeter();

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'fps';
    this.el.textContent = '-- fps';
    parent.appendChild(this.el);
  }

  update(dt: number): void {
    const fps = this.meter.tick(dt);
    if (fps > 0) this.el.textContent = `${Math.round(fps)} fps`;
  }

  dispose(): void {
    this.el.remove();
  }
}
