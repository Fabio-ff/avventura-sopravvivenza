import { describe, expect, it } from 'vitest';
import { readUrlOptions } from '../src/app/url-options';

describe('readUrlOptions', () => {
  it('mostra gli fps di default', () => {
    expect(readUrlOptions('').showFps).toBe(true);
  });
  it('?fps=0 li nasconde', () => {
    expect(readUrlOptions('?fps=0').showFps).toBe(false);
  });
  it('predefiniti: golden in palestra', () => {
    const o = readUrlOptions('');
    expect(o.pg).toBe('golden');
    expect(o.level).toBe('palestra');
  });
  it('?pg= accetta i personaggi noti', () => {
    expect(readUrlOptions('?pg=ninja').pg).toBe('ninja');
    expect(readUrlOptions('?pg=vichinga').pg).toBe('vichinga');
  });
  it('valori sconosciuti tornano al predefinito, senza errori', () => {
    const o = readUrlOptions('?pg=drago&level=giungla');
    expect(o.pg).toBe('golden');
    expect(o.level).toBe('palestra');
    expect(readUrlOptions('?pg=&level=').pg).toBe('golden');
    expect(readUrlOptions('?pg=NINJA').pg).toBe('golden');
  });
});
