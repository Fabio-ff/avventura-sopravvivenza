import { describe, expect, it } from 'vitest';
import { needsReset } from '../src/render/character-view';
import { CROUCH_HOVER, hoverOffset } from '../src/render/player-view';

describe('cambio di clip', () => {
  it('la stessa azione non riparte da capo, una diversa sì', () => {
    const a = {};
    const b = {};
    expect(needsReset(a, a)).toBe(false);
    expect(needsReset(a, b)).toBe(true);
    expect(needsReset(undefined, b)).toBe(true);
  });
});

describe('fluttuazione', () => {
  it('in piedi oscilla attorno alla quota, da accovacciati resta bassa e ferma', () => {
    expect(hoverOffset(undefined, 1)).toBe(0);
    const alti = [0, 0.5, 1, 1.5].map((t) => hoverOffset(0.25, t));
    expect(Math.max(...alti)).toBeGreaterThan(0.25);
    for (const t of [0, 0.5, 1, 1.5]) expect(hoverOffset(0.25, t, true)).toBe(CROUCH_HOVER);
    expect(CROUCH_HOVER).toBeLessThanOrEqual(0.05);
    // chi fluttua meno di CROUCH_HOVER non sale
    expect(hoverOffset(0.02, 3, true)).toBe(0.02);
  });
});
