/** Comandi letti una volta per fotogramma. `moveY` positivo = avanti. */
export interface InputFrame {
  /** Movimento laterale, da -1 (sinistra) a 1 (destra). */
  moveX: number;
  /** Movimento in avanti, da -1 (indietro) a 1 (avanti). */
  moveY: number;
  /** Vero se il personaggio deve camminare invece di correre. */
  walk: boolean;
  /** Vero finché il comando di salto è premuto. */
  jump: boolean;
  /** Vero finché il comando per accovacciarsi è premuto. */
  crouch: boolean;
  /** Rotazione orizzontale della camera in radianti, accumulata dall'ultima lettura. */
  lookX: number;
  /** Rotazione verticale della camera in radianti, accumulata dall'ultima lettura. */
  lookY: number;
}

export type BackendKind = 'keyboard' | 'gamepad' | 'touch';

/** Una sorgente di comandi. `sample(dt)` restituisce lo stato e azzera il look accumulato. */
export interface InputBackend {
  readonly kind: BackendKind;
  sample(dt: number): InputFrame;
  /** Azzera tasti, tocchi e look: scheda in background o finestra che perde il fuoco. */
  reset(): void;
  dispose(): void;
}
