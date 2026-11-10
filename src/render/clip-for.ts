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
