// Collisioni corpo-scatole. Il corpo è un cilindro verticale; per le collisioni la sua
// impronta è approssimata da un quadrato di lato 2*raggio (semplice e senza incastri).
// Nessuna dipendenza da three.
import type { Solid, Vec3 } from './solids';

/** Cilindro verticale: `position` è il centro della base. */
export interface Body {
  position: Vec3;
  radius: number;
  height: number;
}

export interface MoveOptions {
  /** Se vero, le scatole `spingibile` vengono spostate in orizzontale. */
  canPush: boolean;
}

export interface MoveResult {
  position: Vec3;
  grounded: boolean;
  hitCeiling: boolean;
  /** Id del primo `pericolo` toccato durante il movimento. */
  hazardId: number | null;
  /** Id delle scatole spostate (le scatole passate vengono modificate sul posto). */
  pushed: number[];
}

/** Altezza massima dei gradini saliti da soli. */
export const STEP_HEIGHT = 0.35;
const EPS = 1e-6;
const GROUND_PROBE = 0.02;

const blocks = (s: Solid): boolean => s.kind !== 'pericolo';

function overlaps(px: number, py: number, pz: number, r: number, h: number, s: Solid): boolean {
  return (
    px + r > s.min.x + EPS &&
    px - r < s.max.x - EPS &&
    py + h > s.min.y + EPS &&
    py < s.max.y - EPS &&
    pz + r > s.min.z + EPS &&
    pz - r < s.max.z - EPS
  );
}

function firstBlocker(
  px: number,
  py: number,
  pz: number,
  r: number,
  h: number,
  solids: readonly Solid[],
): Solid | null {
  for (const s of solids) if (blocks(s) && overlaps(px, py, pz, r, h, s)) return s;
  return null;
}

/** Vero se il corpo (nella posizione data) compenetra una scatola che blocca. */
export function bodyOverlaps(body: Body, solids: readonly Solid[]): boolean {
  const p = body.position;
  return firstBlocker(p.x, p.y, p.z, body.radius, body.height, solids) !== null;
}

/** Vero se c'è un appoggio appena sotto i piedi. */
export function isStanding(body: Body, solids: readonly Solid[]): boolean {
  const p = body.position;
  return firstBlocker(p.x, p.y - GROUND_PROBE, p.z, body.radius, body.height, solids) !== null;
}

type Axis = 'x' | 'z';

/**
 * Sposta il masso di `amount` lungo l'asse, ma si ferma a filo della prima scatola che
 * trova (mai dentro altre scatole). Restituisce lo spostamento effettivo (stesso segno).
 */
function pushSolid(s: Solid, axis: Axis, amount: number, solids: readonly Solid[]): number {
  const others: Axis | 'y' = axis === 'x' ? 'z' : 'x';
  let moved = amount;
  for (const o of solids) {
    if (o === s || !blocks(o)) continue;
    const across =
      s.max[others] > o.min[others] + EPS &&
      s.min[others] < o.max[others] - EPS &&
      s.max.y > o.min.y + EPS &&
      s.min.y < o.max.y - EPS;
    if (!across) continue;
    // spazio libero davanti al masso lungo l'asse (se già compenetra, nessuno)
    if (amount > 0) {
      const room = o.min[axis] - s.max[axis];
      if (room > -EPS && room < moved) moved = Math.max(0, room);
    } else {
      const room = o.max[axis] - s.min[axis];
      if (room < EPS && room > moved) moved = Math.min(0, room);
    }
  }
  s.min[axis] += moved;
  s.max[axis] += moved;
  return moved;
}

/**
 * Sposta il corpo di `delta` risolvendo un asse alla volta (Y, X, Z). Lo spostamento è
 * diviso in sottopassi di al più mezzo raggio, così niente attraversa lastre sottili.
 */
export function moveBody(
  body: Body,
  delta: Vec3,
  solids: readonly Solid[],
  opts: MoveOptions,
): MoveResult {
  const r = body.radius;
  const h = body.height;
  let { x, y, z } = body.position;
  let hitCeiling = false;
  let hazardId: number | null = null;
  const pushed: number[] = [];

  const biggest = Math.max(Math.abs(delta.x), Math.abs(delta.y), Math.abs(delta.z));
  const n = Math.max(1, Math.ceil(biggest / (r / 2)));
  const dx = delta.x / n;
  const dy = delta.y / n;
  const dz = delta.z / n;

  const horizontal = (axis: Axis, d: number): void => {
    if (d === 0) return;
    const standing = firstBlocker(x, y - GROUND_PROBE, z, r, h, solids) !== null;
    if (axis === 'x') x += d;
    else z += d;
    for (let guard = 0; guard < 8; guard++) {
      const s = firstBlocker(x, y, z, r, h, solids);
      if (!s) return;
      if (opts.canPush && s.kind === 'spingibile') {
        const pen =
          axis === 'x'
            ? d > 0
              ? x + r - s.min.x
              : x - r - s.max.x
            : d > 0
              ? z + r - s.min.z
              : z - r - s.max.z;
        const moved = pushSolid(s, axis, pen, solids);
        if (moved !== 0 && !pushed.includes(s.id)) pushed.push(s.id);
        // spinto del tutto: si prosegue; altrimenti il masso fa da muro a filo
        if (Math.abs(moved - pen) < EPS) continue;
      }
      // gradino: si sale da soli solo se si è a terra
      if (standing && s.max.y > y && s.max.y - y <= STEP_HEIGHT + EPS) {
        if (!firstBlocker(x, s.max.y, z, r, h, solids)) {
          y = s.max.y;
          continue;
        }
      }
      // muro: ci si ferma a filo
      if (axis === 'x') x = d > 0 ? s.min.x - r : s.max.x + r;
      else z = d > 0 ? s.min.z - r : s.max.z + r;
    }
  };

  for (let i = 0; i < n; i++) {
    // Y
    if (dy !== 0) {
      y += dy;
      for (let guard = 0; guard < 8; guard++) {
        const s = firstBlocker(x, y, z, r, h, solids);
        if (!s) break;
        if (dy < 0) y = s.max.y;
        else {
          y = s.min.y - h;
          hitCeiling = true;
        }
      }
    }
    horizontal('x', dx);
    horizontal('z', dz);
    if (hazardId === null) {
      for (const s of solids) {
        if (s.kind === 'pericolo' && overlaps(x, y, z, r, h, s)) {
          hazardId = s.id;
          break;
        }
      }
    }
  }

  const grounded = delta.y <= 0 && firstBlocker(x, y - 0.001, z, r, h, solids) !== null;
  return { position: { x, y, z }, grounded, hitCeiling, hazardId, pushed };
}

/**
 * Frazione [0,1] del primo impatto del segmento con una scatola `fisso`, oppure null.
 * Usata dalla camera. Se il punto di partenza è dentro una scatola, quella è ignorata.
 */
export function segmentHitsSolids(from: Vec3, to: Vec3, solids: readonly Solid[]): number | null {
  const d = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
  let best: number | null = null;
  for (const s of solids) {
    if (s.kind !== 'fisso') continue;
    let t0 = 0;
    let t1 = 1;
    let ok = true;
    let entered = false;
    for (const a of ['x', 'y', 'z'] as const) {
      if (Math.abs(d[a]) < 1e-12) {
        if (from[a] < s.min[a] || from[a] > s.max[a]) ok = false;
        continue;
      }
      let ta = (s.min[a] - from[a]) / d[a];
      let tb = (s.max[a] - from[a]) / d[a];
      if (ta > tb) [ta, tb] = [tb, ta];
      if (ta > t0) {
        t0 = ta;
        entered = true;
      }
      if (tb < t1) t1 = tb;
      if (t0 > t1) ok = false;
    }
    if (ok && entered && (best === null || t0 < best)) best = t0;
  }
  return best;
}
