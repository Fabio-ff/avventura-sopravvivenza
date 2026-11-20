// Vite, invulnerabilità e ripartenza. Logica pura: nessun three e nessun DOM.
// Avanza con il `dt` della simulazione e dice cosa deve fare chi la usa (main.ts).

/** Invulnerabilità dopo un colpo, in secondi. */
export const HIT_INVULNERABILITY = 1.5;
/** Invulnerabilità breve al rientro dopo una caduta o una ripartenza. */
export const RESPAWN_INVULNERABILITY = 1;
/** Quanto resta la scritta "Riprova!" prima della ripartenza. */
export const DEFEAT_DURATION = 2;
/** Frequenza del lampeggio del modello durante l'invulnerabilità, in Hz. */
export const BLINK_HZ = 8;

export type LivesPhase = 'gioco' | 'sconfitto';

export interface LivesState {
  max: number;
  vite: number;
  /** Secondi di invulnerabilità rimasti (0 = vulnerabile). */
  invuln: number;
  phase: LivesPhase;
  /** Secondi rimasti alla ripartenza (solo da sconfitto). */
  defeatTimer: number;
}

export function createLives(max: number): LivesState {
  return { max, vite: max, invuln: 0, phase: 'gioco', defeatTimer: 0 };
}

function lose(s: LivesState): boolean {
  s.vite = Math.max(0, s.vite - 1);
  if (s.vite > 0) return false;
  s.phase = 'sconfitto';
  s.defeatTimer = DEFEAT_DURATION;
  s.invuln = 0;
  return true;
}

/**
 * Un contatto con un pericolo. `colpo`: una vita in meno, contraccolpo e invulnerabilità;
 * `sconfitto`: vite finite; null: ignorato (invulnerabile o già sconfitto).
 */
export function registerHit(s: LivesState): 'colpo' | 'sconfitto' | null {
  if (s.phase !== 'gioco' || s.invuln > 0) return null;
  if (lose(s)) return 'sconfitto';
  s.invuln = HIT_INVULNERABILITY;
  return 'colpo';
}

/**
 * Una caduta nel fossato: toglie una vita anche durante l'invulnerabilità.
 * `punto-sicuro`: tornare all'ultimo punto sicuro; `sconfitto`: vite finite.
 */
export function registerFall(s: LivesState): 'punto-sicuro' | 'sconfitto' | null {
  if (s.phase !== 'gioco') return null;
  if (lose(s)) return 'sconfitto';
  s.invuln = Math.max(s.invuln, RESPAWN_INVULNERABILITY);
  return 'punto-sicuro';
}

/** Fa passare il tempo; dopo la scritta chiede la ripartenza e rimette le vite piene. */
export function tickLives(s: LivesState, dt: number): 'ripartenza' | null {
  if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - dt);
  if (s.phase !== 'sconfitto') return null;
  s.defeatTimer -= dt;
  if (s.defeatTimer > 0) return null;
  s.vite = s.max;
  s.phase = 'gioco';
  s.defeatTimer = 0;
  s.invuln = RESPAWN_INVULNERABILITY;
  return 'ripartenza';
}

/** Vero nelle fasi "spente" del lampeggio (il modello sparisce); sempre falso senza invulnerabilità. */
export function blinkHidden(invuln: number): boolean {
  return invuln > 0 && Math.floor(invuln * BLINK_HZ * 2) % 2 === 1;
}
