import { describe, expect, it } from 'vitest';
import { jumpReach, loadProfiles, profileFor } from '../src/player/profiles';

describe('profili', () => {
  it('contengono i sei personaggi con i valori della tabella', () => {
    const p = loadProfiles();
    expect(p.map((x) => x.id)).toEqual(['golden', 'ninja', 'golem', 'mago', 'vichinga', 'titano']);
    expect(p.every((x) => x.camminata === 2.5 && x.accovacciato === 2)).toBe(true);
    expect(profileFor('ninja')).toMatchObject({ corsa: 7, salto: 2, vite: 3 });
    expect(profileFor('golem')).toMatchObject({ corsa: 5, salto: 1, vite: 4, canPush: true });
    expect(profileFor('mago').canReveal).toBe(true);
    expect(profileFor('vichinga').canSmash).toBe(true);
    expect(profileFor('golden').colore).toBeNull();
  });

  it('profileFor con id sconosciuto restituisce golden', () => {
    expect(profileFor('boh').id).toBe('golden');
    expect(profileFor('').id).toBe('golden');
  });

  it('loadProfiles segnala in italiano un campo mancante', () => {
    const rotto = [
      { id: 'golden', nome: 'G', descrizione: 'd', ritratto: 'r.jpg', corsa: 6, colore: null },
    ];
    expect(() => loadProfiles(rotto)).toThrow(/golden.*camminata/);
    expect(() => loadProfiles({})).toThrow(/lista di profili/);
  });

  it('jumpReach a corsa piena', () => {
    const g = jumpReach(profileFor('golden'));
    expect(g.height).toBe(1.2);
    expect(g.distance).toBeGreaterThan(3.5);
    expect(g.distance).toBeLessThan(4);
    expect(jumpReach(profileFor('ninja')).distance).toBeGreaterThan(5.5);
  });
});

describe('profilo titano', () => {
  it('ha i valori provvisori, il modello, la fluttuazione e la mappa delle clip', () => {
    const t = profileFor('titano');
    expect(t).toMatchObject({ corsa: 5.5, camminata: 2.5, accovacciato: 2, salto: 1.4, vite: 4 });
    expect(t.canShock).toBe(true);
    expect(t.colore).toBeNull();
    expect(t.modello).toBe('characters/titano.glb');
    expect(t.fluttua).toBe(0.25);
    expect(t.clip?.run).toEqual({ nome: 'walk.001', velocita: 2 });
    expect(t.clip?.idle?.velocita).toBe(0);
  });
  it('golden e i segnaposto non hanno campi nuovi', () => {
    for (const id of ['golden', 'ninja', 'golem', 'mago', 'vichinga']) {
      const p = profileFor(id);
      expect(p.modello).toBeUndefined();
      expect(p.clip).toBeUndefined();
      expect(p.fluttua).toBeUndefined();
    }
  });
});
