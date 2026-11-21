import { describe, expect, it } from 'vitest';
import { AnimationClip, Bone, VectorKeyframeTrack } from 'three';
import { clipSulPosto, needsReset } from '../src/render/character-view';
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

describe('clipSulPosto', () => {
  it("toglie la deriva orizzontale del bacino e tiene l'altezza", () => {
    const hips = new Bone();
    hips.name = 'Hips';
    hips.position.set(0, 1, 0.1);
    const track = new VectorKeyframeTrack(
      'Hips.position',
      [0, 0.5, 1],
      [0.3, 1, 2, 0.4, 1.2, 4, 0.5, 1, 6],
    );
    const clip = new AnimationClip('run', 1, [track]);
    const out = clipSulPosto(clip, hips);
    const v = out.tracks[0]!.values;
    // x e z: primo fotogramma sulla posa di base, ciclo chiuso, nessuna deriva
    expect(v[2]).toBeCloseTo(0.1);
    expect(v[8]).toBeCloseTo(0.1);
    expect(v[5]).toBeCloseTo(0.1);
    expect(v[0]).toBeCloseTo(0);
    expect(v[6]).toBeCloseTo(0);
    // y invariata; la clip originale non è toccata
    expect(v[4]).toBeCloseTo(1.2);
    expect(v[1]).toBe(1);
    expect(clip.tracks[0]!.values[8]).toBe(6);
  });
  it('senza traccia del bacino restituisce una copia identica', () => {
    const hips = new Bone();
    hips.name = 'Hips';
    const clip = new AnimationClip('x', 1, [
      new VectorKeyframeTrack('Altro.position', [0, 1], [0, 0, 0, 1, 1, 1]),
    ]);
    expect(Array.from(clipSulPosto(clip, hips).tracks[0]!.values)).toEqual([0, 0, 0, 1, 1, 1]);
  });
});
