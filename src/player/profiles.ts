// Profili dei personaggi giocabili (valori in src/missions/characters.json).
import rawProfiles from '../missions/characters.json';

export const GRAVITY = 25;

export interface AbilityProfile {
  id: string;
  nome: string;
  /** Velocità in m/s. */
  corsa: number;
  camminata: number;
  accovacciato: number;
  /** Altezza del salto in metri. */
  salto: number;
  vite: number;
  canPush: boolean;
  canReveal: boolean;
  canSmash: boolean;
  /** Tinta del modello (esadecimale) oppure null per i colori originali. */
  colore: string | null;
}

function num(o: Record<string, unknown>, k: string, ctx: string): number {
  const v = o[k];
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0)
    throw new Error(`Profilo ${ctx}: il campo "${k}" manca o non è un numero positivo`);
  return v;
}

function bool(o: Record<string, unknown>, k: string, ctx: string): boolean {
  const v = o[k];
  if (typeof v !== 'boolean')
    throw new Error(`Profilo ${ctx}: il campo "${k}" manca o non è vero/falso`);
  return v;
}

/** Valida a mano il JSON dei profili; errore chiaro in italiano se qualcosa non va. */
export function loadProfiles(raw: unknown = rawProfiles): AbilityProfile[] {
  if (!Array.isArray(raw) || raw.length === 0)
    throw new Error('characters.json deve contenere una lista di profili');
  const out = raw.map((item: unknown, i): AbilityProfile => {
    if (typeof item !== 'object' || item === null)
      throw new Error(`Profilo #${i}: non è un oggetto`);
    const o = item as Record<string, unknown>;
    if (typeof o.id !== 'string' || o.id === '')
      throw new Error(`Profilo #${i}: il campo "id" manca`);
    const ctx = o.id;
    if (typeof o.nome !== 'string') throw new Error(`Profilo ${ctx}: il campo "nome" manca`);
    const colore = o.colore;
    if (colore !== null && typeof colore !== 'string')
      throw new Error(`Profilo ${ctx}: il campo "colore" manca (testo o null)`);
    return {
      id: o.id,
      nome: o.nome,
      corsa: num(o, 'corsa', ctx),
      camminata: num(o, 'camminata', ctx),
      accovacciato: num(o, 'accovacciato', ctx),
      salto: num(o, 'salto', ctx),
      vite: num(o, 'vite', ctx),
      canPush: bool(o, 'canPush', ctx),
      canReveal: bool(o, 'canReveal', ctx),
      canSmash: bool(o, 'canSmash', ctx),
      colore,
    };
  });
  const ids = new Set<string>();
  for (const p of out) {
    if (ids.has(p.id)) throw new Error(`Profilo ${p.id}: l'id è duplicato`);
    ids.add(p.id);
    if (!Number.isInteger(p.vite))
      throw new Error(`Profilo ${p.id}: il campo "vite" deve essere un intero di almeno 1`);
  }
  if (!out.some((p) => p.id === 'golden')) throw new Error('Manca il profilo "golden"');
  return out;
}

let cache: AbilityProfile[] | null = null;

/** Profilo per id; un id sconosciuto restituisce golden. */
export function profileFor(id: string): AbilityProfile {
  cache ??= loadProfiles();
  return cache.find((p) => p.id === id) ?? cache.find((p) => p.id === 'golden')!;
}

/** Velocità verticale di stacco per raggiungere l'altezza del salto. */
export function jumpSpeed(profile: AbilityProfile): number {
  return Math.sqrt(2 * GRAVITY * profile.salto);
}

/** Distanza orizzontale e altezza del salto a corsa piena (terreno piano). */
export function jumpReach(profile: AbilityProfile): { distance: number; height: number } {
  const airTime = (2 * jumpSpeed(profile)) / GRAVITY;
  return { distance: profile.corsa * airTime, height: profile.salto };
}
