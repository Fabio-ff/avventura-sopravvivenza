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
