import { describe, expect, it } from 'vitest';
import { readUrlOptions } from '../src/app/url-options';

describe('readUrlOptions', () => {
  it('mostra gli fps di default', () => {
    expect(readUrlOptions('').showFps).toBe(true);
  });
  it('?fps=0 li nasconde', () => {
    expect(readUrlOptions('?fps=0').showFps).toBe(false);
  });
});
