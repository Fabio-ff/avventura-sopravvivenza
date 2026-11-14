import { describe, expect, it } from 'vitest';
import { consumeSteps, FIXED_STEP, MAX_STEPS_PER_FRAME } from '../src/app/game-loop';

describe('consumeSteps', () => {
  it('un frame da 1/60 fa un passo', () => {
    const r = consumeSteps(0, FIXED_STEP);
    expect(r.steps).toBe(1);
    expect(r.accumulator).toBeCloseTo(0, 9);
  });
  it('un frame breve non fa passi e accumula', () => {
    const r = consumeSteps(0, 0.01);
    expect(r.steps).toBe(0);
    expect(r.accumulator).toBeCloseTo(0.01, 9);
  });
  it('il resto passa al frame dopo', () => {
    const a = consumeSteps(0, 0.025);
    expect(a.steps).toBe(1);
    const b = consumeSteps(a.accumulator, 0.025);
    expect(b.steps).toBe(2);
  });
  it('la somma dei passi segue il tempo reale', () => {
    let acc = 0;
    let total = 0;
    for (let i = 0; i < 100; i++) {
      const r = consumeSteps(acc, 1 / 144);
      acc = r.accumulator;
      total += r.steps;
    }
    expect(total).toBe(Math.floor((100 / 144) * 60 + 1e-6));
  });
  it('ha un tetto di passi per frame e scarta il resto', () => {
    const r = consumeSteps(0, 1);
    expect(r.steps).toBe(MAX_STEPS_PER_FRAME);
    expect(r.accumulator).toBe(0);
  });
  it('ignora dt non validi', () => {
    expect(consumeSteps(0, NaN).steps).toBe(0);
    expect(consumeSteps(0, -1).steps).toBe(0);
  });
});
