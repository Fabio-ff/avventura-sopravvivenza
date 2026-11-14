import { describe, expect, it } from 'vitest';
import { loadProfiles } from '../src/player/profiles';

describe('validazione profili', () => {
  const base = () => JSON.parse(JSON.stringify(loadProfiles())) as Record<string, unknown>[];

  it('id duplicati: errore', () => {
    const p = base();
    p[1].id = 'golden';
    expect(() => loadProfiles(p)).toThrow(/duplicato/);
  });

  it('vite non intera o minore di 1: errore', () => {
    const a = base();
    a[0].vite = 2.5;
    expect(() => loadProfiles(a)).toThrow(/vite/);
    const b = base();
    b[0].vite = 0;
    expect(() => loadProfiles(b)).toThrow(/vite/);
  });
});

describe('validazione dei campi del modello', () => {
  const base = () => JSON.parse(JSON.stringify(loadProfiles())) as Record<string, unknown>[];

  it('mappa clip valida: accettata, velocità predefinita 1', () => {
    const p = base();
    p[0].clip = { run: { nome: 'corri' }, idle: { nome: 'fermo', velocita: 0 } };
    const g = loadProfiles(p)[0];
    expect(g.clip?.run).toEqual({ nome: 'corri', velocita: 1 });
    expect(g.clip?.idle?.velocita).toBe(0);
  });
  it('clip logica sconosciuta: errore chiaro', () => {
    const p = base();
    p[0].clip = { vola: { nome: 'x' } };
    expect(() => loadProfiles(p)).toThrow(/golden.*vola/);
  });
  it('nome mancante o velocità negativa: errore', () => {
    const a = base();
    a[0].clip = { run: {} };
    expect(() => loadProfiles(a)).toThrow(/nome/);
    const b = base();
    b[0].clip = { run: { nome: 'x', velocita: -1 } };
    expect(() => loadProfiles(b)).toThrow(/velocita/);
  });
  it('tipi sbagliati di modello, fluttua, clip, canShock: errore', () => {
    for (const [k, v, re] of [
      ['modello', 3, /modello/],
      ['fluttua', 'alto', /fluttua/],
      ['clip', 'no', /clip/],
      ['canShock', 'si', /canShock/],
    ] as const) {
      const p = base();
      p[0][k] = v;
      expect(() => loadProfiles(p)).toThrow(re);
    }
  });
});
