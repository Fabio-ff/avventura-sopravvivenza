import { describe, expect, it } from 'vitest';
import levelJson from '../src/missions/palestra/level.json';
import { toSolids, validateLevel } from '../src/world/build-level';
import { createPlayer, stepPlayer, type PlayerInput } from '../src/player/controller';
import { jumpReach, profileFor } from '../src/player/profiles';
import type { CanonicalClip } from '../src/render/clip-for';
import { viewParamsFor } from '../src/render/player-view';
import type { Solid } from '../src/world/solids';

const ok = () => ({
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

describe('validateLevel', () => {
  it('accetta un livello valido', () => {
    expect(validateLevel(ok()).scatole).toHaveLength(1);
  });
  it('rifiuta id duplicati', () => {
    const l = ok();
    l.scatole.push({ ...l.scatole[0]! });
    expect(() => validateLevel(l)).toThrow(/duplicato/);
  });
  it('rifiuta dimensioni non positive', () => {
    const l = ok();
    l.scatole[0]!.dimensioni.y = 0;
    expect(() => validateLevel(l)).toThrow(/dimensioni/);
  });
  it('rifiuta tipi non validi', () => {
    const l = ok();
    l.scatole[0]!.tipo = 'lava';
    expect(() => validateLevel(l)).toThrow(/tipo/);
  });
  it('rifiuta colori non validi', () => {
    const l = ok();
    l.scatole[0]!.colore = 'rosso';
    expect(() => validateLevel(l)).toThrow(/colore/);
  });
  it('rifiuta una partenza nel vuoto o in aria', () => {
    const l = ok();
    l.partenza = { x: 50, y: 0, z: 0 };
    expect(() => validateLevel(l)).toThrow(/partenza/);
    const m = ok();
    m.partenza = { x: 0, y: 2, z: 0 };
    expect(() => validateLevel(m)).toThrow(/partenza/);
  });
  it('rifiuta file senza scatole o non oggetti', () => {
    expect(() => validateLevel(null)).toThrow();
    expect(() => validateLevel({ partenza: { x: 0, y: 0, z: 0 }, scatole: [] })).toThrow(/scatole/);
  });
});

describe('level.json della palestra', () => {
  const level = validateLevel(levelJson);
  const solids = toSolids(level);
  const byName = (nome: string): Solid => solids[level.scatole.findIndex((b) => b.nome === nome)]!;

  it('è valido: id unici, tipi, dimensioni, partenza su una lastra', () => {
    expect(new Set(level.scatole.map((b) => b.id)).size).toBe(level.scatole.length);
  });

  it('contiene una scatola spingibile e una pericolo', () => {
    expect(level.scatole.filter((b) => b.tipo === 'spingibile')).toHaveLength(1);
    expect(level.scatole.filter((b) => b.tipo === 'pericolo')).toHaveLength(1);
  });

  it('le misure delle prove sono quelle del piano', () => {
    const h = (nome: string) => byName(nome).max.y - byName(nome).min.y;
    expect(h('gradino 0,3 m')).toBeCloseTo(0.3);
    expect(h('gradino 0,8 m')).toBeCloseTo(0.8);
    expect(h('muro 1,6 m')).toBeCloseTo(1.6);
    expect(h('muro alto')).toBeCloseTo(4);
    expect(h('masso')).toBeCloseTo(1.5);
    expect(byName('masso').kind).toBe('spingibile');
    // fossati: vuoto tra due lastre
    expect(byName('lastra partenza').min.z - byName('lastra 2').max.z).toBeCloseTo(2);
    expect(byName('lastra 2').min.z - byName('lastra 3').max.z).toBeCloseTo(5.5);
    // passaggio basso: luce 1,2 m sotto l'architrave
    expect(byName('architrave').min.y).toBeCloseTo(1.2);
    // recinzione alta 6 m
    expect(byName('recinto ovest').max.y).toBeCloseTo(6);
    // varco del masso largo quanto il masso
    expect(byName('muro masso destro').min.x - byName('muro masso sinistro').max.x).toBeCloseTo(
      byName('masso').max.x - byName('masso').min.x,
    );
  });

  it('i fossati si saltano come dice il piano', () => {
    const golden = jumpReach(profileFor('golden'));
    const golem = jumpReach(profileFor('golem'));
    const ninja = jumpReach(profileFor('ninja'));
    const titano = jumpReach(profileFor('titano'));
    expect(golem.distance).toBeGreaterThan(2);
    expect(golden.distance).toBeLessThan(5.5);
    expect(ninja.distance).toBeGreaterThan(5.5);
    // il Titano supera il fossato da 2 m, non quello da 5,5 m né il muro da 1,6 m
    expect(titano.distance).toBeGreaterThan(2);
    expect(titano.distance).toBeLessThan(5.5);
    expect(titano.height).toBeLessThan(1.6);
    expect(golden.height).toBeGreaterThan(0.8);
    expect(golden.height).toBeLessThan(1.5);
  });

  it('golden dalla partenza resta a terra, fermo', () => {
    const state = createPlayer(level.partenza);
    const none: PlayerInput = { moveX: 0, moveY: 0, walk: false, jump: false, crouch: false };
    const profile = profileFor('golden');
    let events = 0;
    for (let i = 0; i < 300; i++)
      events += stepPlayer(state, none, 0, profile, solids, 1 / 60).length;
    expect(events).toBe(0);
    expect(state.grounded).toBe(true);
    expect(state.mode).toBe('fermo');
    expect(state.position.y).toBeCloseTo(0, 5);
    expect(state.position.x).toBeCloseTo(level.partenza.x, 5);
    expect(state.position.z).toBeCloseTo(level.partenza.z, 5);
  });
});

describe('viewParamsFor', () => {
  it('mappa le modalità sulle clip', () => {
    expect(viewParamsFor('fermo').state).toBe('idle');
    expect(viewParamsFor('cammina').state).toBe('run');
    expect(viewParamsFor('cammina').timeScale).toBeLessThan(1);
    expect(viewParamsFor('corre').timeScale).toBe(1);
    expect(viewParamsFor('salta').state).toBe('jump');
    expect(viewParamsFor('cade').state).toBe('fall');
    expect(viewParamsFor('colpito').state).toBe('hit');
    expect(viewParamsFor('accovacciato').state).toBe('idle');
    expect(viewParamsFor('accovacciato').squash).toBeLessThan(1);
  });

  const NINJA = new Set<CanonicalClip>([
    'idle',
    'run',
    'jump',
    'hit',
    'fall',
    'walk',
    'crouch',
    'crouchWalk',
  ]);
  const MAGO = new Set<CanonicalClip>(['idle', 'run', 'jump', 'hit', 'fall']);

  it('con la clip walk la camminata non è la corsa rallentata', () => {
    expect(viewParamsFor('cammina', true, NINJA)).toMatchObject({ state: 'walk', timeScale: 1 });
    expect(viewParamsFor('cammina', true, MAGO)).toMatchObject({ state: 'run', timeScale: 0.45 });
  });
  it('accovacciato con clip dedicate: niente schiacciamento', () => {
    expect(viewParamsFor('accovacciato', false, NINJA)).toEqual({
      state: 'crouch',
      timeScale: 1,
      squash: 1,
    });
    expect(viewParamsFor('accovacciato', true, NINJA)).toEqual({
      state: 'crouchWalk',
      timeScale: 1,
      squash: 1,
    });
  });
  it('accovacciato senza clip dedicate: idle schiacciato (Golden, Titano, Mago, segnaposto)', () => {
    for (const moving of [false, true]) {
      const v = viewParamsFor('accovacciato', moving, MAGO);
      expect(v.state).toBe('idle');
      expect(v.squash).toBeLessThan(1);
    }
    expect(viewParamsFor('accovacciato', true).state).toBe('idle');
  });
  it('ripieghi parziali: senza crouchWalk si usa crouch; solo crouchWalk da fermo schiaccia', () => {
    const soloCrouch = new Set<CanonicalClip>(['idle', 'crouch']);
    expect(viewParamsFor('accovacciato', true, soloCrouch).state).toBe('crouch');
    const soloWalk = new Set<CanonicalClip>(['idle', 'crouchWalk']);
    expect(viewParamsFor('accovacciato', false, soloWalk).state).toBe('idle');
    expect(viewParamsFor('accovacciato', false, soloWalk).squash).toBeLessThan(1);
    expect(viewParamsFor('accovacciato', true, soloWalk).state).toBe('crouchWalk');
  });
  it('le altre modalità non dipendono dalle clip facoltative', () => {
    for (const mode of ['fermo', 'corre', 'salta', 'cade', 'colpito'] as const) {
      expect(viewParamsFor(mode, true, NINJA)).toEqual(viewParamsFor(mode, true, MAGO));
    }
  });
});
