import { describe, expect, it } from 'vitest';
import {
  applyKnockback,
  createPlayer,
  stepPlayer,
  teleport,
  type PlayerInput,
  type PlayerState,
} from '../src/player/controller';
import { profileFor } from '../src/player/profiles';
import { bodyOverlaps } from '../src/world/collide';
import { box, type Solid } from '../src/world/solids';

const DT = 1 / 60;
// Con questa angolazione della camera "avanti" è +x e "destra" è +z.
const YAW_X = -Math.PI / 2;
const NONE: PlayerInput = { moveX: 0, moveY: 0, walk: false, jump: false, crouch: false };
const fwd = (extra: Partial<PlayerInput> = {}): PlayerInput => ({ ...NONE, moveY: 1, ...extra });

const slab = (id: number, x0: number, x1: number, top = 0): Solid =>
  box(id, 'fisso', { x: x0, y: top - 1, z: -50 }, { x: x1, y: top, z: 50 });

function player(x: number, y = 0, z = 0): PlayerState {
  return createPlayer({ x, y, z });
}

/** Avanza di `frames` passi; `each` vede lo stato dopo ogni passo. */
function run(
  s: PlayerState,
  frames: number,
  input: (f: number) => PlayerInput,
  id: string,
  solids: Solid[],
  each?: (s: PlayerState, f: number) => void,
  dt: (f: number) => number = () => DT,
): void {
  for (let f = 0; f < frames; f++) {
    stepPlayer(s, input(f), YAW_X, profileFor(id), solids, dt(f));
    each?.(s, f);
  }
}

const overlapsAny = (s: PlayerState, solids: Solid[]): boolean =>
  bodyOverlaps({ position: s.position, radius: 0.35, height: s.crouching ? 1 : 1.8 }, solids);

describe('masso da 1,5 m e dt variabili', () => {
  // dt deterministici tra 1/120 e 1/30
  const varDt = (i: number): number => 1 / 120 + (((i * 37) % 11) / 10) * (1 / 30 - 1 / 120);

  function climbsRock(id: string): boolean {
    const rock = box(2, 'spingibile', { x: 0, y: 0, z: -20 }, { x: 1.2, y: 1.5, z: 20 });
    const solids = [slab(1, -30, 50), rock];
    for (let k = 10; k < 90; k += 2) {
      const s = player(-8);
      let top = false;
      run(
        s,
        200,
        (f) => fwd({ jump: f === k || f === k + 1 }),
        id,
        solids,
        (st) => {
          if (st.grounded && st.position.y > 1.4) top = true;
        },
        varDt,
      );
      if (top) return true;
    }
    return false;
  }

  it('golden, mago e vichinga non salgono sul masso, il ninja sì', () => {
    for (const id of ['golden', 'mago', 'vichinga']) expect(climbsRock(id)).toBe(false);
    expect(climbsRock('ninja')).toBe(true);
  });
});

describe('dt grande', () => {
  const floor = [slab(1, -50, 50)];

  it('con dt = 0,7 il salto non si perde e non si attraversa il suolo', () => {
    const s = player(0);
    run(s, 10, () => NONE, 'ninja', floor);
    stepPlayer(s, { ...NONE, jump: true }, YAW_X, profileFor('ninja'), floor, 0.7);
    expect(s.grounded).toBe(false);
    expect(s.position.y).toBeGreaterThan(1.5);
    const f = player(0, 3);
    stepPlayer(f, NONE, YAW_X, profileFor('golden'), floor, 0.7);
    expect(f.position.y).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(f.position.y)).toBe(true);
  });
});

describe('masso sul bordo', () => {
  it('spinto verso il bordo di una lastra si ferma a filo e blocca come un muro', () => {
    const rock = box(2, 'spingibile', { x: 2, y: 0, z: -0.6 }, { x: 3.2, y: 1.5, z: 0.6 });
    const solids = [slab(1, -30, 6), rock];
    const s = player(0);
    run(
      s,
      400,
      () => fwd({ walk: true }),
      'golem',
      solids,
      () => {
        expect(rock.max.x).toBeLessThanOrEqual(6 + 1e-6);
      },
    );
    expect(rock.max.x).toBeCloseTo(6, 4);
    expect(s.position.x).toBeCloseTo(rock.min.x - 0.35, 3);
    expect(s.position.y).toBeGreaterThan(-0.01);
  });
});

describe('teleport', () => {
  it('azzera lo stato e imposta il punto sicuro alla destinazione', () => {
    const solids = [slab(1, -30, 30)];
    const s = player(0);
    run(s, 5, () => NONE, 'golden', solids);
    s.crouching = true;
    s.coyote = 0.05;
    s.jumpBuffer = 0.05;
    applyKnockback(s, { x: 1, y: 0, z: 0 });
    teleport(s, { x: 10, y: 0, z: 3 }, solids);
    expect(s.position).toEqual({ x: 10, y: 0, z: 3 });
    expect(s.velocity).toEqual({ x: 0, y: 0, z: 0 });
    expect(s.crouching).toBe(false);
    expect(s.knock).toEqual({ x: 0, z: 0 });
    expect(s.hitTimer).toBe(0);
    expect(s.coyote).toBe(0);
    expect(s.jumpBuffer).toBe(0);
    expect(s.safePoint).toEqual({ x: 10, y: 0, z: 3 });
  });

  it('se la destinazione è dentro una scatola, sposta in orizzontale senza salire', () => {
    const solids = [slab(1, -30, 30), box(2, 'fisso', { x: 0, y: 0, z: -3 }, { x: 2, y: 3, z: 3 })];
    const s = player(-10);
    teleport(s, { x: 1, y: 0, z: 0 }, solids);
    expect(s.position.y).toBe(0);
    expect(overlapsAny(s, solids)).toBe(false);
    expect(Math.hypot(s.position.x - 1, s.position.z)).toBeLessThan(3.5);
    expect(s.safePoint).toEqual(s.position);
  });
});

describe('discesa', () => {
  it('scendere un gradino da 0,3 m non passa per cade; oltre un fossato sì', () => {
    const steps = [slab(1, -30, 5, 0.3), slab(2, 5, 60, 0)];
    const a = player(0, 0.3);
    run(a, 10, () => NONE, 'golden', steps);
    run(
      a,
      150,
      () => fwd(),
      'golden',
      steps,
      (st) => {
        expect(st.mode).not.toBe('cade');
      },
    );
    expect(a.position.x).toBeGreaterThan(8);
    expect(a.position.y).toBeCloseTo(0, 3);

    const gap = [slab(1, -30, 0), slab(2, 3, 60)];
    const b = player(-5);
    let fell = false;
    run(
      b,
      120,
      () => fwd(),
      'golden',
      gap,
      (st) => {
        if (st.mode === 'cade') fell = true;
      },
    );
    expect(fell).toBe(true);
  });
});

describe('gancio terreno', () => {
  it('stepPlayer inoltra groundHeightAt come suolo', () => {
    const s = player(0, 3);
    for (let i = 0; i < 120; i++)
      stepPlayer(s, NONE, YAW_X, profileFor('golden'), [], DT, () => 0.5);
    expect(s.position.y).toBeCloseTo(0.5, 5);
    expect(s.grounded).toBe(true);
  });
});

describe('incastri', () => {
  it('angolo interno tra due muri: non si incastra e ne esce', () => {
    const solids = [
      slab(1, -50, 50),
      box(2, 'fisso', { x: 5, y: 0, z: -50 }, { x: 6, y: 3, z: 50 }),
      box(3, 'fisso', { x: -50, y: 0, z: 5 }, { x: 50, y: 3, z: 6 }),
    ];
    const s = player(0);
    run(
      s,
      150,
      () => ({ ...NONE, moveX: 1, moveY: 1 }),
      'golden',
      solids,
      (st) => {
        expect(overlapsAny(st, solids)).toBe(false);
      },
    );
    expect(s.position.x).toBeCloseTo(5 - 0.35, 2);
    expect(s.position.z).toBeCloseTo(5 - 0.35, 2);
    run(s, 60, () => ({ ...NONE, moveX: -1, moveY: -1 }), 'golden', solids);
    expect(Math.hypot(s.position.x - 4.65, s.position.z - 4.65)).toBeGreaterThan(3);
  });

  it('masso tra giocatore e muro: non entra nel muro e il golem non resta incastrato', () => {
    const rock = box(2, 'spingibile', { x: 2, y: 0, z: -0.6 }, { x: 3.2, y: 1.5, z: 0.6 });
    const wall = box(3, 'fisso', { x: 3.5, y: 0, z: -50 }, { x: 4.5, y: 3, z: 50 });
    const solids = [slab(1, -30, 50), rock, wall];
    const s = player(0);
    run(
      s,
      200,
      () => fwd({ walk: true }),
      'golem',
      solids,
      () => {
        expect(rock.max.x).toBeLessThanOrEqual(3.5 + 1e-6);
      },
    );
    expect(rock.max.x).toBeCloseTo(3.5, 4);
    const xPush = s.position.x;
    run(s, 60, () => fwd({ walk: true, moveY: -1 }), 'golem', solids);
    expect(s.position.x).toBeLessThan(xPush - 1);
    // in diagonale scivola oltre il bordo del masso
    const d = player(0);
    run(d, 200, () => ({ ...NONE, moveX: 1, moveY: 1 }), 'golem', solids);
    expect(d.position.z).toBeGreaterThan(1);
    expect(overlapsAny(d, solids)).toBe(false);
  });

  it('camminata lungo il bordo di un fossato: resta a terra', () => {
    const solids = [slab(1, -30, 0), slab(2, 3, 60)];
    const s = player(-0.2);
    run(s, 10, () => NONE, 'golden', solids);
    // con yaw 0 avanti è -z: si cammina lungo il bordo
    for (let f = 0; f < 120; f++) {
      stepPlayer(s, fwd(), 0, profileFor('golden'), solids, DT);
      expect(s.grounded).toBe(true);
      expect(s.mode).not.toBe('cade');
    }
    expect(s.position.z).toBeLessThan(-8);
    expect(s.position.y).toBeCloseTo(0, 3);
  });

  it('gradino da 0,3 m sotto un soffitto basso: sale solo se c’è spazio', () => {
    const step = box(2, 'fisso', { x: 2, y: 0, z: -50 }, { x: 8, y: 0.3, z: 50 });
    const crouchFwd = () => fwd({ crouch: true });
    const low = [
      slab(1, -30, 50),
      step,
      box(3, 'fisso', { x: 1, y: 1.2, z: -50 }, { x: 10, y: 3, z: 50 }),
    ];
    const a = player(0);
    run(a, 200, crouchFwd, 'golden', low);
    expect(a.position.y).toBeCloseTo(0, 3);
    expect(a.position.x).toBeLessThan(1.7);
    const high = [
      slab(1, -30, 50),
      step,
      box(3, 'fisso', { x: 1, y: 1.5, z: -50 }, { x: 10, y: 3, z: 50 }),
    ];
    const b = player(0);
    run(b, 200, crouchFwd, 'golden', high);
    expect(b.position.y).toBeCloseTo(0.3, 3);
    expect(b.position.x).toBeGreaterThan(3);
  });
});
