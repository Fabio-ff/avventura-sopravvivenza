import { describe, expect, it } from 'vitest';
import { clampFrameDt, MAX_FRAME_DT } from '../src/app/frame-time';

describe('clampFrameDt', () => {
  it('lascia passare i delta normali', () => {
    expect(clampFrameDt(0.016)).toBe(0.016);
  });
  it('limita i delta lunghi (ritorno da scheda in background)', () => {
    expect(clampFrameDt(5)).toBe(MAX_FRAME_DT);
  });
  it('scarta valori negativi o non numerici', () => {
    expect(clampFrameDt(-1)).toBe(0);
    expect(clampFrameDt(Number.NaN)).toBe(0);
  });
});
