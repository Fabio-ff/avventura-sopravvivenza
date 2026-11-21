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

describe('validazione dei campi del menu', () => {
  const base = () => JSON.parse(JSON.stringify(loadProfiles())) as Record<string, unknown>[];

  it('descrizione e ritratto obbligatori', () => {
    const a = base();
    delete a[0].descrizione;
    expect(() => loadProfiles(a)).toThrow(/golden.*descrizione/);
    const b = base();
    b[0].ritratto = '';
    expect(() => loadProfiles(b)).toThrow(/golden.*ritratto/);
  });

  it("inquadratura facoltativa ma, se c'è, deve essere testo", () => {
    const a = base();
    a[0].inquadratura = 5;
    expect(() => loadProfiles(a)).toThrow(/inquadratura/);
    const b = base();
    delete b[0].inquadratura;
    expect(loadProfiles(b)[0].inquadratura).toBeUndefined();
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
  it('clip facoltative walk, crouch, crouchWalk accettate; inizio e fine controllati', () => {
    const p = base();
    p[0].clip = {
      walk: { nome: 'a' },
      crouch: { nome: 'b', inizio: 0.8, velocita: 2.5 },
      crouchWalk: { nome: 'c' },
    };
    const g = loadProfiles(p)[0];
    expect(g.clip?.crouch).toEqual({ nome: 'b', velocita: 2.5, inizio: 0.8 });
    expect(g.clip?.crouchWalk?.velocita).toBe(1);
    const a = base();
    a[0].clip = { crouch: { nome: 'b', inizio: -1 } };
    expect(() => loadProfiles(a)).toThrow(/inizio/);
    const b = base();
    b[0].clip = { crouch: { nome: 'b', inizio: 2, fine: 1 } };
    expect(() => loadProfiles(b)).toThrow(/fine/);
    const c = base();
    c[0].clip = { striscia: { nome: 'x' } };
    expect(() => loadProfiles(c)).toThrow(/striscia/);
  });
  it('sulPosto e scalaAccovacciato: tipi controllati', () => {
    const p = base();
    p[0].sulPosto = true;
    p[0].scalaAccovacciato = 0.85;
    expect(loadProfiles(p)[0]).toMatchObject({ sulPosto: true, scalaAccovacciato: 0.85 });
    const a = base();
    a[0].sulPosto = 'si';
    expect(() => loadProfiles(a)).toThrow(/sulPosto/);
    const b = base();
    b[0].scalaAccovacciato = 1.5;
    expect(() => loadProfiles(b)).toThrow(/scalaAccovacciato/);
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
