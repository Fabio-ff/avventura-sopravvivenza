// Mondo di gioco fatto di scatole allineate agli assi. Nessuna dipendenza da three.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** fisso = muro/pavimento; spingibile = masso; pericolo = tocca e fa male, non blocca. */
export type SolidKind = 'fisso' | 'spingibile' | 'pericolo';

export interface Solid {
  id: number;
  kind: SolidKind;
  min: Vec3;
  max: Vec3;
}

/** Scatola da due angoli. */
export function box(id: number, kind: SolidKind, min: Vec3, max: Vec3): Solid {
  return { id, kind, min: { ...min }, max: { ...max } };
}

/** Quota della superficie più alta sotto (x, z) a quota `y` o più in basso, oppure null. */
export function groundBelow(
  solids: readonly Solid[],
  x: number,
  z: number,
  y: number,
): number | null {
  let best: number | null = null;
  for (const s of solids) {
    if (s.kind === 'pericolo') continue;
    if (x < s.min.x || x > s.max.x || z < s.min.z || z > s.max.z) continue;
    if (s.max.y > y + 0.05) continue;
    if (best === null || s.max.y > best) best = s.max.y;
  }
  return best;
}
