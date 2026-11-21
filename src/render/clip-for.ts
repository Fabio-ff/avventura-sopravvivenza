/** Le clip canoniche che ogni modello di personaggio contiene. */
export const CANONICAL_CLIPS = ['idle', 'run', 'jump', 'hit', 'fall'] as const;
/**
 * Clip facoltative: si usano solo se il profilo le mappa (mai per nome omonimo nel file).
 * `walk` camminata, `crouch` accovacciato fermo, `crouchWalk` accovacciato in movimento.
 */
export const OPTIONAL_CLIPS = ['walk', 'crouch', 'crouchWalk'] as const;
/** Tutti i nomi di clip logiche ammessi in un profilo. */
export const ALL_CLIPS = [...CANONICAL_CLIPS, ...OPTIONAL_CLIPS] as const;
export type CanonicalClip = (typeof ALL_CLIPS)[number];

/** Stati di un personaggio che scelgono una clip. */
export type CharacterState = CanonicalClip;

/** Clip che si ripetono; le altre partono una volta e restano sull'ultimo fotogramma. */
export const LOOPING_CLIPS: ReadonlySet<CanonicalClip> = new Set<CanonicalClip>([
  'idle',
  'run',
  'walk',
  'crouchWalk',
]);

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
  /** Secondi della clip da cui si parte (predefinito 0). */
  inizio?: number;
  /** Secondi della clip a cui ci si ferma (predefinito la fine). */
  fine?: number;
}
export type ClipMap = Partial<Record<CanonicalClip, ClipSpec>>;

/**
 * Nome della clip nel file e velocità per una clip logica; senza mappa le cinque clip canoniche
 * valgono il nome omonimo a velocità 1, quelle facoltative non esistono (null).
 */
export function clipSpecFor(map: ClipMap | undefined, logical: CanonicalClip): ClipSpec | null {
  const mapped = map?.[logical];
  if (mapped) return mapped;
  return (CANONICAL_CLIPS as readonly string[]).includes(logical)
    ? { nome: logical, velocita: 1 }
    : null;
}
