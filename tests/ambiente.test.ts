import { describe, expect, it } from 'vitest';
import levelJson from '../src/missions/palestra/level.json';
import { perimetroLivello, validateLevel } from '../src/world/build-level';
import { worldBoxUVs } from '../src/world/uv-mondo';
import { disponiVegetazione, distanzaDa, FASCIA_MAX, FASCIA_MIN } from '../src/world/vegetazione';

const base = () => ({
  partenza: { x: 0, y: 0, z: 0 },
  scatole: [
    {
      id: 1,
      tipo: 'fisso',
      posizione: { x: 0, y: -0.5, z: 0 },
      dimensioni: { x: 10, y: 1, z: 10 },
      colore: '#112233',
    },
  ],
});

describe('materiale delle scatole', () => {
  it('è facoltativo', () => {
    expect(validateLevel(base()).scatole[0]!.materiale).toBeUndefined();
  });
  it('accetta erba, pietra e muro', () => {
    for (const m of ['erba', 'pietra', 'muro']) {
      const l = base();
      Object.assign(l.scatole[0]!, { materiale: m });
      expect(validateLevel(l).scatole[0]!.materiale).toBe(m);
    }
  });
  it('rifiuta un materiale sconosciuto', () => {
    const l = base();
    Object.assign(l.scatole[0]!, { materiale: 'lava' });
    expect(() => validateLevel(l)).toThrow(/materiale/);
  });
  it('la trappola resta a tinta unita', () => {
    const level = validateLevel(levelJson);
    expect(level.scatole.find((b) => b.tipo === 'pericolo')!.materiale).toBeUndefined();
  });
});

describe('UV in scala mondo', () => {
  it('restituisce 24 vertici (u, v)', () => {
    expect(worldBoxUVs({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })).toHaveLength(48);
  });
  it('la texture si ripete ogni 2 m, qualunque sia la dimensione', () => {
    const uv = worldBoxUVs({ x: 0, y: 0, z: 0 }, { x: 20, y: 1, z: 4 }, 2);
    // faccia +z (ultime due facce: indici 16..): u lungo x, 20 m = 10 ripetizioni
    const u = (i: number) => uv[(16 + i) * 2]!;
    expect(u(1) - u(0)).toBeCloseTo(10);
    // faccia +y: u lungo x (10 ripetizioni), v lungo z (2 ripetizioni)
    expect(uv[(8 + 1) * 2]! - uv[8 * 2]!).toBeCloseTo(10);
    expect(uv[8 * 2 + 1]! - uv[(8 + 2) * 2 + 1]!).toBeCloseTo(2);
  });
  it('una scatola doppia ha il doppio delle ripetizioni', () => {
    const a = worldBoxUVs({ x: 0, y: 0, z: 0 }, { x: 4, y: 4, z: 4 });
    const b = worldBoxUVs({ x: 0, y: 0, z: 0 }, { x: 8, y: 4, z: 4 });
    // faccia +z: u cresce di 2 con 4 m, di 4 con 8 m
    expect(a[17 * 2]! - a[16 * 2]!).toBeCloseTo(2);
    expect(b[17 * 2]! - b[16 * 2]!).toBeCloseTo(4);
  });
  it('scatole vicine hanno lo stesso passo (UV ancorate al mondo)', () => {
    const a = worldBoxUVs({ x: 0, y: 0, z: 0 }, { x: 4, y: 4, z: 4 });
    const b = worldBoxUVs({ x: 4, y: 0, z: 0 }, { x: 4, y: 4, z: 4 });
    // faccia +z: l'u minimo di b è l'u massimo di a
    expect(b[16 * 2]!).toBeCloseTo(a[17 * 2]!);
  });
});

describe('vegetazione', () => {
  const perimetro = perimetroLivello(validateLevel(levelJson));
  const piante = disponiVegetazione(perimetro, 200);

  it('stesso seme, stessi punti', () => {
    expect(disponiVegetazione(perimetro, 200)).toEqual(piante);
  });
  it('un altro seme dà punti diversi', () => {
    expect(disponiVegetazione(perimetro, 200, 7)).not.toEqual(piante);
  });
  it('produce il numero richiesto', () => {
    expect(piante).toHaveLength(200);
  });
  it('nessun punto dentro il perimetro, tutti nella fascia', () => {
    for (const p of piante) {
      const d = distanzaDa(perimetro, p.x, p.z);
      expect(d).toBeGreaterThanOrEqual(FASCIA_MIN);
      expect(d).toBeLessThanOrEqual(FASCIA_MAX);
    }
  });
  it('alberi e palme alti 8-14 m', () => {
    for (const p of piante.filter((q) => q.tipo !== 'roccia')) {
      expect(p.altezza).toBeGreaterThanOrEqual(8);
      expect(p.altezza).toBeLessThanOrEqual(14);
    }
  });
});
