/** Personaggi giocabili (ids di characters.json). */
export const PG_IDS = ['golden', 'ninja', 'golem', 'mago', 'vichinga', 'titano'] as const;
/** Livelli disponibili. */
export const LEVEL_IDS = ['palestra'] as const;

/** Opzioni lette dall'indirizzo (query string). */
export interface UrlOptions {
  /** Mostra il contatore fps; `?fps=0` lo nasconde. */
  showFps: boolean;
  /** `?pg=`: personaggio; assente o sconosciuto vale null (si mostra il menu di scelta). */
  pg: (typeof PG_IDS)[number] | null;
  /** `?level=`: livello; un valore sconosciuto vale palestra. */
  level: (typeof LEVEL_IDS)[number];
}

function pick<T extends string, F>(
  value: string | null,
  allowed: readonly T[],
  fallback: F,
): T | F {
  return allowed.find((a) => a === value) ?? fallback;
}

export function readUrlOptions(search: string): UrlOptions {
  const params = new URLSearchParams(search);
  return {
    showFps: params.get('fps') !== '0',
    pg: pick(params.get('pg'), PG_IDS, null),
    level: pick(params.get('level'), LEVEL_IDS, 'palestra'),
  };
}
