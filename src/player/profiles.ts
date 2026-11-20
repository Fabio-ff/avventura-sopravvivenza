// Profili dei personaggi giocabili (valori in src/missions/characters.json).
import rawProfiles from '../missions/characters.json';
import { CANONICAL_CLIPS, type ClipMap } from '../render/clip-for';

export const GRAVITY = 25;

export interface AbilityProfile {
  id: string;
  nome: string;
  /** Una riga sull'abilità, mostrata nel menu di scelta. */
  descrizione: string;
  /** Ritratto del menu: percorso sotto `assets/`. */
  ritratto: string;
  /** `object-position` CSS per inquadrare il volto nel ritratto (predefinito centro). */
  inquadratura?: string;
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
  /** Scossa elettrica: resta solo nel profilo (nessun effetto in gioco per ora). */
  canShock?: boolean;
  /** Tinta del modello (esadecimale) oppure null per i colori originali. */
  colore: string | null;
  /** Modello 3D sotto `assets/`; se assente si usa Golden. */
  modello?: string;
  /** Dalle clip logiche del gioco alla clip nel file, con un fattore di velocità. */
  clip?: ClipMap;
  /** Altezza in metri a cui il modello resta sospeso sopra il suolo (solo visiva). */
  fluttua?: number;
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

function optionalClipMap(o: Record<string, unknown>, ctx: string): ClipMap | undefined {
  const v = o.clip;
  if (v === undefined) return undefined;
  if (typeof v !== 'object' || v === null || Array.isArray(v))
    throw new Error(`Profilo ${ctx}: il campo "clip" deve essere un oggetto`);
  const out: ClipMap = {};
  for (const [key, spec] of Object.entries(v)) {
    const logica = CANONICAL_CLIPS.find((c) => c === key);
    if (!logica) throw new Error(`Profilo ${ctx}: clip logica sconosciuta "${key}"`);
    const s = spec as Record<string, unknown> | null;
    if (typeof s !== 'object' || s === null || typeof s.nome !== 'string' || s.nome === '')
      throw new Error(`Profilo ${ctx}: la clip "${key}" deve avere un "nome" di testo`);
    const velocita = s.velocita ?? 1;
    if (typeof velocita !== 'number' || !Number.isFinite(velocita) || velocita < 0)
      throw new Error(
        `Profilo ${ctx}: la "velocita" della clip "${key}" deve essere un numero >= 0`,
      );
    out[logica] = { nome: s.nome, velocita };
  }
  return out;
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
    const descrizione = o.descrizione;
    if (typeof descrizione !== 'string' || descrizione === '')
      throw new Error(`Profilo ${ctx}: il campo "descrizione" manca`);
    const ritratto = o.ritratto;
    if (typeof ritratto !== 'string' || ritratto === '')
      throw new Error(`Profilo ${ctx}: il campo "ritratto" deve essere un percorso di testo`);
    const colore = o.colore;
    if (colore !== null && typeof colore !== 'string')
      throw new Error(`Profilo ${ctx}: il campo "colore" manca (testo o null)`);
    const extra: Partial<AbilityProfile> = {};
    if (o.canShock !== undefined) extra.canShock = bool(o, 'canShock', ctx);
    if (o.modello !== undefined) {
      if (typeof o.modello !== 'string' || o.modello === '')
        throw new Error(`Profilo ${ctx}: il campo "modello" deve essere un percorso di testo`);
      extra.modello = o.modello;
    }
    if (o.inquadratura !== undefined) {
      if (typeof o.inquadratura !== 'string' || o.inquadratura === '')
        throw new Error(`Profilo ${ctx}: il campo "inquadratura" deve essere un testo`);
      extra.inquadratura = o.inquadratura;
    }
    const clip = optionalClipMap(o, ctx);
    if (clip) extra.clip = clip;
    if (o.fluttua !== undefined) {
      if (typeof o.fluttua !== 'number' || !Number.isFinite(o.fluttua) || o.fluttua < 0)
        throw new Error(`Profilo ${ctx}: il campo "fluttua" deve essere un numero >= 0`);
      extra.fluttua = o.fluttua;
    }
    return {
      ...extra,
      id: o.id,
      nome: o.nome,
      descrizione,
      ritratto,
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
