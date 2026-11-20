/** Le clip canoniche che ogni modello di personaggio contiene. */
export const CANONICAL_CLIPS = ['idle', 'run', 'jump', 'hit', 'fall'] as const;
export type CanonicalClip = (typeof CANONICAL_CLIPS)[number];

/** Stati di un personaggio che scelgono una clip. */
export type CharacterState = 'idle' | 'run' | 'jump' | 'hit' | 'fall';

/** Clip che si ripetono; le altre partono una volta e restano sull'ultimo fotogramma. */
export const LOOPING_CLIPS: ReadonlySet<CanonicalClip> = new Set<CanonicalClip>(['idle', 'run']);

/** La clip che mostra `state`. */
export function clipFor(state: CharacterState): CanonicalClip {
  return state;
}

/** La clip voluta, altrimenti idle, altrimenti null (posa di base). Non lancia mai. */
export function resolveClip(
  wanted: CanonicalClip,
  available: ReadonlySet<string>,
): CanonicalClip | null {
  if (available.has(wanted)) return wanted;
  return available.has('idle') ? 'idle' : null;
}

/** Clip di un modello per una clip logica: nome nel file e fattore di velocità (0 = ferma sulla posa). */
export interface ClipSpec {
  nome: string;
  velocita: number;
}
export type ClipMap = Partial<Record<CanonicalClip, ClipSpec>>;

/** Nome della clip nel file e velocità per una clip logica; senza mappa vale il nome omonimo a velocità 1. */
export function clipSpecFor(map: ClipMap | undefined, logical: CanonicalClip): ClipSpec {
  return map?.[logical] ?? { nome: logical, velocita: 1 };
}
