/**
 * Memorizza la pressione di salto finché un passo di simulazione non l'ha vista: un tocco più
 * corto di un frame, o un frame senza passi, non si perde. Con più passi nello stesso frame il
 * fronte di salita è uno solo (lo gestisce il controller), quindi un solo salto.
 */
export class JumpLatch {
  private held = false;
  private pending = false;

  /** Una volta per frame, con lo stato del comando di salto. */
  feed(held: boolean): void {
    this.held = held;
    if (held) this.pending = true;
  }

  /** Valore da dare al passo di simulazione. */
  value(): boolean {
    return this.held || this.pending;
  }

  /** Da chiamare dopo ogni passo eseguito. */
  consume(): void {
    this.pending = false;
  }
}
