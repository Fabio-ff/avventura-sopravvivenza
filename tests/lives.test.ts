import { describe, expect, it } from 'vitest';
import {
  DEFEAT_DURATION,
  HIT_INVULNERABILITY,
  RESPAWN_INVULNERABILITY,
  blinkHidden,
  createLives,
  registerFall,
  registerHit,
  tickLives,
} from '../src/player/lives';
import { profileFor } from '../src/player/profiles';

const advance = (s: ReturnType<typeof createLives>, seconds: number): (string | null)[] => {
  const out: (string | null)[] = [];
  for (let t = 0; t < seconds - 1e-9; t += 1 / 60) out.push(tickLives(s, 1 / 60));
  return out;
};

describe('vite', () => {
  it('3 vite per quasi tutti, 4 per golem e titano', () => {
    for (const id of ['golden', 'ninja', 'mago', 'vichinga'])
      expect(createLives(profileFor(id).vite).vite).toBe(3);
    expect(createLives(profileFor('golem').vite).vite).toBe(4);
    expect(createLives(profileFor('titano').vite).vite).toBe(4);
  });

  it('un colpo toglie una vita e avvia 1,5 s di invulnerabilità', () => {
    const s = createLives(3);
    expect(registerHit(s)).toBe('colpo');
    expect(s.vite).toBe(2);
    expect(s.invuln).toBe(HIT_INVULNERABILITY);
  });

  it('un secondo colpo entro 1,5 s è ignorato, dopo conta', () => {
    const s = createLives(3);
    registerHit(s);
    advance(s, 1.4);
    expect(registerHit(s)).toBeNull();
    expect(s.vite).toBe(2);
    advance(s, 0.2);
    expect(s.invuln).toBe(0);
    expect(registerHit(s)).toBe('colpo');
    expect(s.vite).toBe(1);
  });

  it('una caduta chiede il punto sicuro e toglie una vita, anche se invulnerabili', () => {
    const s = createLives(3);
    registerHit(s);
    expect(registerFall(s)).toBe('punto-sicuro');
    expect(s.vite).toBe(1);
    expect(s.invuln).toBeGreaterThanOrEqual(RESPAWN_INVULNERABILITY);
  });

  it('dopo una caduta c è una breve invulnerabilità ai colpi', () => {
    const s = createLives(3);
    registerFall(s);
    expect(registerHit(s)).toBeNull();
    advance(s, RESPAWN_INVULNERABILITY + 0.05);
    expect(registerHit(s)).toBe('colpo');
  });

  it('a zero vite: sconfitto, poi dopo la scritta ripartenza con vite piene', () => {
    const s = createLives(3);
    registerFall(s);
    advance(s, 1.1);
    registerFall(s);
    advance(s, 1.1);
    expect(registerFall(s)).toBe('sconfitto');
    expect(s.vite).toBe(0);
    expect(s.phase).toBe('sconfitto');
    // da sconfitti i colpi e le cadute non contano
    expect(registerHit(s)).toBeNull();
    expect(registerFall(s)).toBeNull();
    const events = advance(s, DEFEAT_DURATION - 0.1);
    expect(events.every((e) => e === null)).toBe(true);
    expect(s.phase).toBe('sconfitto');
    expect(advance(s, 0.2)).toContain('ripartenza');
    expect(s).toMatchObject({ vite: 3, phase: 'gioco' });
    expect(s.invuln).toBeGreaterThan(0);
  });

  it('l ultimo colpo porta alla sconfitta senza invulnerabilità residua', () => {
    const s = createLives(1);
    expect(registerHit(s)).toBe('sconfitto');
    expect(s.invuln).toBe(0);
  });

  it('il lampeggio alterna a circa 8 Hz solo con invulnerabilità', () => {
    expect(blinkHidden(0)).toBe(false);
    let nascosto = 0;
    const n = 600;
    for (let i = 0; i < n; i++) if (blinkHidden(1.5 - (i / n) * 1.5 + 1e-6)) nascosto++;
    expect(nascosto / n).toBeGreaterThan(0.4);
    expect(nascosto / n).toBeLessThan(0.6);
    expect(blinkHidden(0.99)).not.toBe(blinkHidden(0.99 - 1 / 16));
  });
});
