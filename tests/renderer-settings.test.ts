import { describe, expect, it } from 'vitest';
import { rendererSettings } from '../src/render/renderer-settings';

describe('rendererSettings', () => {
  it('antialias attivo sotto pixel ratio 2', () => {
    expect(rendererSettings(1)).toEqual({ antialias: true, pixelRatio: 1 });
    expect(rendererSettings(1.5)).toEqual({ antialias: true, pixelRatio: 1.5 });
  });
  it('antialias spento da 2 in su e pixel ratio limitato a 2', () => {
    expect(rendererSettings(2)).toEqual({ antialias: false, pixelRatio: 2 });
    expect(rendererSettings(3)).toEqual({ antialias: false, pixelRatio: 2 });
  });
  it('valori non validi ripiegano su 1', () => {
    expect(rendererSettings(Number.NaN)).toEqual({ antialias: true, pixelRatio: 1 });
    expect(rendererSettings(0)).toEqual({ antialias: true, pixelRatio: 1 });
  });
});
