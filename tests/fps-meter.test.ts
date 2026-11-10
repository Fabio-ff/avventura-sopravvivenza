import { describe, expect, it } from 'vitest';
import { FpsMeter } from '../src/ui/debug-overlay';

describe('FpsMeter', () => {
  it('vale 0 finché la finestra non è chiusa', () => {
    const m = new FpsMeter(0.5);
    expect(m.tick(0.1)).toBe(0);
  });
  it('media i frame sulla finestra', () => {
    const m = new FpsMeter(0.5);
    let v = 0;
    for (let i = 0; i < 31; i++) v = m.tick(1 / 60);
    expect(v).toBeCloseTo(60, 5);
  });
  it('ignora delta non validi', () => {
    const m = new FpsMeter(0.5);
    expect(m.tick(Number.NaN)).toBe(0);
    expect(m.tick(-1)).toBe(0);
  });
});
