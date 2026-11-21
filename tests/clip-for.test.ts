import { describe, expect, it } from 'vitest';
import {
  ALL_CLIPS,
  CANONICAL_CLIPS,
  clipFor,
  clipSpecFor,
  resolveClip,
  type CharacterState,
} from '../src/render/clip-for';

describe('clipFor', () => {
  it('sceglie la clip omonima per ogni stato', () => {
    const states: CharacterState[] = ['idle', 'run', 'jump', 'hit', 'fall'];
    for (const s of states) expect(clipFor(s)).toBe(s);
    expect([...CANONICAL_CLIPS]).toEqual(states);
    expect([...ALL_CLIPS]).toEqual([...states, 'walk', 'crouch', 'crouchWalk']);
  });
});

describe('resolveClip', () => {
  it('usa la clip voluta se esiste', () => {
    expect(resolveClip('run', new Set(['idle', 'run']))).toBe('run');
  });
  it('ripiega su idle, poi su null', () => {
    expect(resolveClip('jump', new Set(['idle']))).toBe('idle');
    expect(resolveClip('jump', new Set())).toBeNull();
  });
});

describe('clipSpecFor', () => {
  it('senza mappa: nome omonimo a velocità 1', () => {
    expect(clipSpecFor(undefined, 'run')).toEqual({ nome: 'run', velocita: 1 });
  });
  it('con mappa: nome e velocità del personaggio; le clip non mappate restano omonime', () => {
    const map = { run: { nome: 'walk.001', velocita: 2 }, idle: { nome: 'walk.001', velocita: 0 } };
    expect(clipSpecFor(map, 'run')).toEqual({ nome: 'walk.001', velocita: 2 });
    expect(clipSpecFor(map, 'idle')?.velocita).toBe(0);
    expect(clipSpecFor(map, 'jump')).toEqual({ nome: 'jump', velocita: 1 });
  });
});

describe('clip facoltative', () => {
  it('senza mappa non esistono, anche se il file ha una clip omonima', () => {
    expect(clipSpecFor(undefined, 'walk')).toBeNull();
    expect(clipSpecFor(undefined, 'crouch')).toBeNull();
    expect(clipSpecFor({ run: { nome: 'x', velocita: 1 } }, 'crouchWalk')).toBeNull();
  });
  it('con mappa: nome, velocità, inizio e fine', () => {
    const map = { crouch: { nome: 'accovacciarsi', velocita: 2.5, inizio: 0.8 } };
    expect(clipSpecFor(map, 'crouch')).toEqual({
      nome: 'accovacciarsi',
      velocita: 2.5,
      inizio: 0.8,
    });
  });
});
