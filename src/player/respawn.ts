// Rientro dopo una caduta: direzione e blocco dei comandi. Logica pura (niente three, niente DOM).
import { teleport, type PlayerState } from './controller';
import { registerFall, type LivesState } from './lives';
import type { Solid } from '../world/solids';

/** Dopo un rientro i comandi di movimento tornano comunque dopo questo tempo, in secondi. */
export const INPUT_GATE_MAX = 1.5;
/** Sotto questa intensità la leva (o i tasti) conta come a riposo. */
export const INPUT_REST = 0.15;

/** Blocco di movimento e salto dopo un rientro: finisce a leva a riposo o dopo `INPUT_GATE_MAX`. */
export interface InputGate {
  /** Secondi rimasti di blocco (0 = comandi liberi). */
  remaining: number;
}

export function createInputGate(): InputGate {
  return { remaining: 0 };
}

/** Avvia il blocco (rientro da una caduta, ripartenza da "Riprova!"). */
export function armInputGate(g: InputGate): void {
  g.remaining = INPUT_GATE_MAX;
}

/** Fa passare `dt`; `stick` è l'intensità della leva o dei tasti di movimento (0..1). */
export function tickInputGate(g: InputGate, stick: number, dt: number): void {
  if (g.remaining <= 0) return;
  g.remaining = stick < INPUT_REST ? 0 : Math.max(0, g.remaining - dt);
}

export function inputBlocked(g: InputGate): boolean {
  return g.remaining > 0;
}

/** Direzione (come `PlayerState.facing`) da `from` verso `to`, o null se i punti coincidono. */
export function facingToward(
  from: { x: number; z: number },
  to: { x: number; z: number },
): number | null {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  if (Math.hypot(dx, dz) < 1e-3) return null;
  return Math.atan2(dx, dz);
}

/**
 * Gestisce l'evento `caduto`: una vita in meno e rientro sul punto sicuro, guardando via dal
 * vuoto (dal punto di caduta verso il punto sicuro), con i comandi di movimento bloccati.
 * Vero se la caduta è stata contata.
 */
export function handleFall(
  player: PlayerState,
  lives: LivesState,
  solids: readonly Solid[],
  gate: InputGate,
): boolean {
  if (registerFall(lives) === null) return false;
  const heading = facingToward(player.position, player.safePoint);
  teleport(player, player.safePoint, solids);
  if (heading !== null) player.facing = heading;
  armInputGate(gate);
  return true;
}
