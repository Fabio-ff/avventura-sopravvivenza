import { describe, expect, it } from 'vitest';
import { loadProfiles } from '../src/player/profiles';

describe('validazione profili', () => {
  const base = () => JSON.parse(JSON.stringify(loadProfiles())) as Record<string, unknown>[];

  it('id duplicati: errore', () => {
    const p = base();
    p[1].id = 'golden';
    expect(() => loadProfiles(p)).toThrow(/duplicato/);
  });

  it('vite non intera o minore di 1: errore', () => {
    const a = base();
    a[0].vite = 2.5;
    expect(() => loadProfiles(a)).toThrow(/vite/);
    const b = base();
    b[0].vite = 0;
    expect(() => loadProfiles(b)).toThrow(/vite/);
  });
});
