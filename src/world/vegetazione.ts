// Disposizione della vegetazione attorno al livello: pura, deterministica (seme fisso), senza three.

export interface Rettangolo {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type TipoPianta = 'albero' | 'palma' | 'roccia';

export interface Piantina {
  tipo: TipoPianta;
  /** Variante di forma (0..2 per gli alberi, 0..1 per palme e rocce). */
  variante: number;
  x: number;
  z: number;
  /** Altezza totale in metri (per le rocce: diametro). */
  altezza: number;
  /** Rotazione attorno a y. */
  rotazione: number;
}

/** Generatore pseudo-casuale mulberry32. */
export function rng(seme: number): () => number {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FASCIA_MIN = 3;
export const FASCIA_MAX = 25;

/** Distanza di (x, z) dal rettangolo (0 se dentro). */
export function distanzaDa(r: Rettangolo, x: number, z: number): number {
  const dx = Math.max(r.minX - x, 0, x - r.maxX);
  const dz = Math.max(r.minZ - z, 0, z - r.maxZ);
  return Math.hypot(dx, dz);
}

/** `n` piante in una fascia tra FASCIA_MIN e FASCIA_MAX metri fuori dal perimetro. */
export function disponiVegetazione(
  perimetro: Rettangolo,
  n: number,
  seme: number = 20261121,
): Piantina[] {
  const rand = rng(seme);
  const out: Piantina[] = [];
  const largo: Rettangolo = {
    minX: perimetro.minX - FASCIA_MAX,
    maxX: perimetro.maxX + FASCIA_MAX,
    minZ: perimetro.minZ - FASCIA_MAX,
    maxZ: perimetro.maxZ + FASCIA_MAX,
  };
  let tentativi = 0;
  while (out.length < n && tentativi < n * 50) {
    tentativi++;
    const x = largo.minX + rand() * (largo.maxX - largo.minX);
    const z = largo.minZ + rand() * (largo.maxZ - largo.minZ);
    const d = distanzaDa(perimetro, x, z);
    if (d < FASCIA_MIN || d > FASCIA_MAX) continue;
    const r = rand();
    const tipo: TipoPianta = r < 0.5 ? 'albero' : r < 0.8 ? 'palma' : 'roccia';
    const altezza = tipo === 'roccia' ? 1 + rand() * 2.5 : 8 + rand() * 6;
    const variante = Math.floor(rand() * (tipo === 'albero' ? 3 : 2));
    out.push({ tipo, variante, x, z, altezza, rotazione: rand() * Math.PI * 2 });
  }
  return out;
}
