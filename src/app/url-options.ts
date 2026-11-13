/** Personaggi giocabili (ids di characters.json). */
export const PG_IDS = ['golden', 'ninja', 'golem', 'mago', 'vichinga'] as const;
/** Livelli disponibili. */
export const LEVEL_IDS = ['palestra'] as const;

/** Opzioni lette dall'indirizzo (query string). */
export interface UrlOptions {
  /** Mostra il contatore fps; `?fps=0` lo nasconde. */
  showFps: boolean;
  /** `?pg=`: personaggio; un valore sconosciuto vale golden. */
  pg: (typeof PG_IDS)[number];
  /** `?level=`: livello; un valore sconosciuto vale palestra. */
  level: (typeof LEVEL_IDS)[number];
}

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.find((a) => a === value) ?? fallback;
}

export function readUrlOptions(search: string): UrlOptions {
  const params = new URLSearchParams(search);
  return {
    showFps: params.get('fps') !== '0',
    pg: pick(params.get('pg'), PG_IDS, 'golden'),
    level: pick(params.get('level'), LEVEL_IDS, 'palestra'),
  };
}
