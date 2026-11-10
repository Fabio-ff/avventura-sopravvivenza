import { describe, expect, it } from 'vitest';
import { CANONICAL_CLIPS, clipFor, resolveClip, type CharacterState } from '../src/render/clip-for';

describe('clipFor', () => {
  it('sceglie la clip omonima per ogni stato', () => {
    const states: CharacterState[] = ['idle', 'run', 'jump', 'hit', 'fall'];
    for (const s of states) expect(clipFor(s)).toBe(s);
    expect([...CANONICAL_CLIPS]).toEqual(states);
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
