import { describe, expect, it } from 'vitest';
import { jumpReach, loadProfiles, profileFor } from '../src/player/profiles';

describe('profili', () => {
  it('contengono i cinque personaggi con i valori della tabella', () => {
    const p = loadProfiles();
    expect(p.map((x) => x.id)).toEqual(['golden', 'ninja', 'golem', 'mago', 'vichinga']);
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
    const rotto = [{ id: 'golden', nome: 'G', corsa: 6, colore: null }];
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
