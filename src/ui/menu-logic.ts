// Logica pura del menu di scelta del personaggio (niente DOM, testabile).
import type { UrlOptions } from '../app/url-options';
import type { AbilityProfile } from '../player/profiles';

/** Numero di barrette di velocità e salto (da 1 a BARS_MAX). */
export const BARS_MAX = 5;

export interface CharacterCard {
  id: string;
  nome: string;
  descrizione: string;
  /** Percorso del ritratto sotto `assets/`. */
  ritratto: string;
  /** `object-position` CSS del ritratto. */
  inquadratura: string;
  /** Valori grezzi dal profilo (per le etichette). */
  corsa: number;
  salto: number;
  vite: number;
  /** Barrette piene da 1 a BARS_MAX, relative al minimo e al massimo dei profili. */
  barreVelocita: number;
  barreSalto: number;
}

function bars(value: number, min: number, max: number): number {
  if (max <= min) return Math.ceil(BARS_MAX / 2);
  return 1 + Math.round(((value - min) / (max - min)) * (BARS_MAX - 1));
}

/** Dai profili ai dati delle schede (stesso ordine dei profili). */
export function cardsFromProfiles(profiles: readonly AbilityProfile[]): CharacterCard[] {
  const corse = profiles.map((p) => p.corsa);
  const salti = profiles.map((p) => p.salto);
  const [minC, maxC] = [Math.min(...corse), Math.max(...corse)];
  const [minS, maxS] = [Math.min(...salti), Math.max(...salti)];
  return profiles.map((p) => ({
    id: p.id,
    nome: p.nome,
    descrizione: p.descrizione,
    ritratto: p.ritratto,
    inquadratura: p.inquadratura ?? '50% 50%',
    corsa: p.corsa,
    salto: p.salto,
    vite: p.vite,
    barreVelocita: bars(p.corsa, minC, maxC),
    barreSalto: bars(p.salto, minS, maxS),
  }));
}

/**
 * Indirizzo con `pg` impostato (o tolto se `pg` è null); gli altri parametri e il
 * percorso restano. Restituisce un indirizzo relativo (percorso + query + hash).
 */
export function urlWithPg(href: string, pg: string | null): string {
  const url = new URL(href);
  if (pg === null) url.searchParams.delete('pg');
  else url.searchParams.set('pg', pg);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Si mostra il menu finché non c'è un personaggio valido nell'indirizzo. */
export function screenFor(options: Pick<UrlOptions, 'pg'>): 'menu' | 'game' {
  return options.pg === null ? 'menu' : 'game';
}

/** Quanto resta attiva la conferma del pulsante "Personaggi", in millisecondi. */
export const BACK_CONFIRM_MS = 3000;
export const BACK_LABEL = 'Personaggi';
export const BACK_CONFIRM_LABEL = 'Torna al menu?';

/**
 * Un tocco sul pulsante "Personaggi". `armedAt` è l'istante del primo tocco (null = non armato).
 * Il primo tocco arma la conferma; un secondo entro `BACK_CONFIRM_MS` naviga; più tardi riarma.
 */
export function pressBack(
  armedAt: number | null,
  now: number,
): { action: 'conferma' | 'naviga'; armedAt: number | null } {
  if (armedAt !== null && now - armedAt <= BACK_CONFIRM_MS)
    return { action: 'naviga', armedAt: null };
  return { action: 'conferma', armedAt: now };
}

/** Etichetta del pulsante: quella di conferma solo mentre è armato e il tempo non è scaduto. */
export function backLabel(armedAt: number | null, now: number): string {
  return armedAt !== null && now - armedAt <= BACK_CONFIRM_MS ? BACK_CONFIRM_LABEL : BACK_LABEL;
}
