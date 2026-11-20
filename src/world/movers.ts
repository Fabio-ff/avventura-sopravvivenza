// Scatole che si muovono avanti e indietro lungo un asse (la trappola). Logica pura, nessun three.
import type { Solid, Vec3 } from './solids';

export type MotoAsse = 'x' | 'z';

/** Moto di una scatola: `ampiezza` è la corsa totale in metri, `periodo` il ciclo completo in secondi. */
export interface Moto {
  asse: MotoAsse;
  ampiezza: number;
  periodo: number;
}

/**
 * Spostamento dal centro del moto al tempo `t`: a t = 0 la scatola sta a un estremo (-ampiezza/2),
 * a mezzo periodo all'altro, e torna al periodo. Il coseno rende il moto continuo, senza scatti.
 */
export function motoOffset(moto: Moto, t: number): number {
  return -(moto.ampiezza / 2) * Math.cos((2 * Math.PI * t) / moto.periodo);
}

/** Valida a mano il campo `moto` di una scatola; errore chiaro in italiano. */
export function validateMoto(raw: unknown, ctx: string): Moto {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    throw new Error(`${ctx}: "moto" deve essere un oggetto`);
  const o = raw as Record<string, unknown>;
  if (o.asse !== 'x' && o.asse !== 'z') throw new Error(`${ctx}: "moto.asse" deve essere x o z`);
  for (const k of ['ampiezza', 'periodo'] as const) {
    const v = o[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0)
      throw new Error(`${ctx}: "moto.${k}" manca o non è un numero positivo`);
  }
  return { asse: o.asse, ampiezza: o.ampiezza as number, periodo: o.periodo as number };
}

/** Una scatola in moto: `centroMin`/`centroMax` sono gli estremi sull'asse al centro del moto. */
export interface Mover {
  solid: Solid;
  moto: Moto;
  centroMin: number;
  centroMax: number;
}

export function createMover(solid: Solid, moto: Moto): Mover {
  return { solid, moto, centroMin: solid.min[moto.asse], centroMax: solid.max[moto.asse] };
}

/** Porta la scatola nella posizione che le spetta al tempo `t` (modifica `solid` sul posto). */
export function placeMover(mover: Mover, t: number): void {
  const off = motoOffset(mover.moto, t);
  mover.solid.min[mover.moto.asse] = mover.centroMin + off;
  mover.solid.max[mover.moto.asse] = mover.centroMax + off;
}

/**
 * Punto da cui spingere via il giocatore dopo un colpo: il centro della scatola, ma lungo l'asse di
 * moto si usa la posizione del giocatore. Così il contraccolpo va di lato rispetto alla trappola e
 * non nella sua direzione di marcia (che la farebbe raggiungere di nuovo).
 */
export function knockOrigin(out: Vec3, solid: Solid, moto: Moto | undefined, player: Vec3): Vec3 {
  out.x = (solid.min.x + solid.max.x) / 2;
  out.y = (solid.min.y + solid.max.y) / 2;
  out.z = (solid.min.z + solid.max.z) / 2;
  if (moto) out[moto.asse] = player[moto.asse];
  return out;
}
