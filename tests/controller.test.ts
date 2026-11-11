import { describe, expect, it } from 'vitest';
import {
  applyKnockback,
  createPlayer,
  stepPlayer,
  teleport,
  type PlayerEvent,
  type PlayerInput,
  type PlayerState,
} from '../src/player/controller';
import { profileFor } from '../src/player/profiles';
import { box, type Solid } from '../src/world/solids';

const DT = 1 / 60;
// Con questa angolazione della camera "avanti" è +x.
const YAW_X = -Math.PI / 2;
const NONE: PlayerInput = { moveX: 0, moveY: 0, walk: false, jump: false, crouch: false };
const fwd = (extra: Partial<PlayerInput> = {}): PlayerInput => ({ ...NONE, moveY: 1, ...extra });

const slab = (id: number, x0: number, x1: number, top = 0): Solid =>
  box(id, 'fisso', { x: x0, y: top - 1, z: -50 }, { x: x1, y: top, z: 50 });

interface Run {
  state: PlayerState;
  events: PlayerEvent[];
  frame: number;
}

function start(x: number, y = 0, z = 0): Run {
  return { state: createPlayer({ x, y, z }), events: [], frame: 0 };
}

function advance(
  run: Run,
  frames: number,
  input: (frame: number, s: PlayerState) => PlayerInput,
  profileId: string,
  solids: Solid[],
  yaw = YAW_X,
): void {
  const profile = profileFor(profileId);
  for (let i = 0; i < frames; i++) {
    run.events.push(
      ...stepPlayer(run.state, input(run.frame, run.state), yaw, profile, solids, DT),
    );
    run.frame++;
  }
}

/** Corre in avanti e preme salto (fronte di salita) al frame `k`. */
function jumpAt(k: number, extra: Partial<PlayerInput> = {}) {
  return (f: number): PlayerInput => fwd({ jump: f === k || f === k + 1, ...extra });
}

describe('movimento di base', () => {
  const floor = [slab(1, -50, 50)];

  it('il movimento è relativo alla camera', () => {
    const a = start(0);
    advance(a, 60, () => fwd(), 'golden', floor, 0);
    expect(a.state.position.z).toBeLessThan(-5);
    expect(Math.abs(a.state.position.x)).toBeLessThan(0.01);
    const b = start(0);
    advance(b, 60, () => fwd(), 'golden', floor, YAW_X);
    expect(b.state.position.x).toBeGreaterThan(5);
    expect(a.state.mode).toBe('corre');
  });

  it('corre di default, cammina con walk o con la leva sotto 0,5', () => {
    const run = start(0);
    advance(run, 60, () => fwd(), 'golden', floor);
    expect(run.state.position.x).toBeCloseTo(6, 0);
    const walk = start(0);
    advance(walk, 60, () => fwd({ walk: true }), 'golden', floor);
    expect(walk.state.position.x).toBeCloseTo(2.5, 0);
    expect(walk.state.mode).toBe('cammina');
    const soft = start(0);
    advance(soft, 60, () => ({ ...NONE, moveY: 0.4 }), 'golden', floor);
    expect(soft.state.position.x).toBeCloseTo(2.5, 0);
    const idle = start(0);
    advance(idle, 10, () => NONE, 'golden', floor);
    expect(idle.state.mode).toBe('fermo');
  });

  it("il salto raggiunge l'altezza del profilo", () => {
    for (const [id, h] of [
      ['golden', 1.2],
      ['ninja', 2.0],
    ] as const) {
      const run = start(0);
      let max = 0;
      advance(
        run,
        90,
        (f, s) => {
          max = Math.max(max, s.position.y);
          return { ...NONE, jump: f === 5 };
        },
        id,
        floor,
      );
      expect(max).toBeGreaterThan(h - 0.05);
      expect(max).toBeLessThan(h + 0.02);
    }
  });

  it('accovacciato è più lento e il cilindro è alto 1 m', () => {
    const run = start(0);
    advance(run, 60, () => fwd({ crouch: true }), 'golden', floor);
    expect(run.state.position.x).toBeCloseTo(2, 0);
    expect(run.state.mode).toBe('accovacciato');
    expect(run.state.crouching).toBe(true);
  });

  it('non cammina in orizzontale da fermo e atterra da 30 m', () => {
    const run = start(0, 30);
    advance(run, 240, () => NONE, 'golden', floor);
    expect(run.state.position.y).toBeCloseTo(0, 3);
    expect(run.state.grounded).toBe(true);
  });
});

describe('misure della palestra', () => {
  /** Percorso con fossato di larghezza `gap`: ritorna se almeno un istante di salto lo supera. */
  function crossesGap(id: string, gap: number): boolean {
    const solids = [slab(1, -30, 0), slab(2, gap, gap + 100)];
    const startX = -(gap > 4 ? 20 : 12);
    const edgeFrame = Math.round((-startX / profileFor(id).corsa) * 60);
    for (let k = edgeFrame - 30; k < edgeFrame + 20; k++) {
      const run = start(startX);
      advance(run, 360, jumpAt(k), id, solids);
      if (run.state.position.y > -0.5 && run.state.position.x > gap + 0.35) return true;
    }
    return false;
  }

  it('fossato 2 m: tutti lo superano', () => {
    for (const id of ['golden', 'ninja', 'golem', 'mago', 'vichinga'])
      expect(crossesGap(id, 2)).toBe(true);
  });

  it('fossato 5,5 m: solo il ninja', () => {
    expect(crossesGap('ninja', 5.5)).toBe(true);
    for (const id of ['golden', 'golem', 'mago', 'vichinga'])
      expect(crossesGap(id, 5.5)).toBe(false);
  });

  /** Vero se in qualche tentativo il personaggio si ferma sopra il muro. */
  function climbsWall(id: string, height: number): boolean {
    const solids = [
      slab(1, -30, 50),
      box(2, 'fisso', { x: 0, y: 0, z: -5 }, { x: 2, y: height, z: 5 }),
    ];
    for (let k = 60; k < 130; k += 2) {
      const run = start(-10);
      let onTop = false;
      advance(
        run,
        200,
        (f, s) => {
          if (s.grounded && s.position.y > height - 0.01 && s.position.x < 2) onTop = true;
          return jumpAt(k)(f);
        },
        id,
        solids,
      );
      if (onTop || run.state.position.y > height - 0.01) return true;
    }
    return false;
  }

  it('muro 1,6 m: solo il ninja; muro 3 m: nessuno', () => {
    expect(climbsWall('ninja', 1.6)).toBe(true);
    for (const id of ['golden', 'golem', 'mago', 'vichinga'])
      expect(climbsWall(id, 1.6)).toBe(false);
    for (const id of ['golden', 'ninja', 'golem', 'mago', 'vichinga'])
      expect(climbsWall(id, 3)).toBe(false);
  });

  it('gradino 0,3 m si sale camminando, 0,8 m no ma si salta', () => {
    const solids = (h: number) => [
      slab(1, -30, 50),
      box(2, 'fisso', { x: 2, y: 0, z: -5 }, { x: 8, y: h, z: 5 }),
    ];
    const a = start(0);
    advance(a, 120, () => fwd({ walk: true }), 'golden', solids(0.3));
    expect(a.state.position.y).toBeCloseTo(0.3, 3);
    const b = start(0);
    advance(b, 120, () => fwd({ walk: true }), 'golden', solids(0.8));
    expect(b.state.position.y).toBeCloseTo(0, 3);
    expect(b.state.position.x).toBeLessThan(1.7);
    const c = start(0);
    advance(c, 120, (f) => fwd({ walk: true, jump: f > 20 && f < 24 }), 'golden', solids(0.8));
    expect(c.state.position.y).toBeCloseTo(0.8, 3);
  });

  it('non si rialza sotto un soffitto a 1,2 m', () => {
    const solids = [
      slab(1, -30, 50),
      box(2, 'fisso', { x: -5, y: 1.2, z: -5 }, { x: 5, y: 3, z: 5 }),
    ];
    const run = start(0);
    advance(run, 30, () => ({ ...NONE, crouch: true }), 'golden', solids);
    expect(run.state.crouching).toBe(true);
    advance(run, 30, () => NONE, 'golden', solids);
    expect(run.state.crouching).toBe(true);
    advance(run, 240, () => fwd({ walk: true }), 'golden', solids);
    expect(run.state.position.x).toBeGreaterThan(5.35);
    expect(run.state.crouching).toBe(false);
  });
});

describe('scivolare, masso, pericoli', () => {
  it('scivola lungo un muro in diagonale', () => {
    const solids = [
      slab(1, -30, 50),
      box(2, 'fisso', { x: 3, y: 0, z: -20 }, { x: 4, y: 3, z: 20 }),
    ];
    const run = start(0);
    advance(run, 120, () => ({ ...NONE, moveX: 1, moveY: 1 }), 'golden', solids);
    expect(run.state.position.x).toBeCloseTo(3 - 0.35, 2);
    expect(Math.abs(run.state.position.z)).toBeGreaterThan(3);
  });

  it('il golem sposta il masso, golden no', () => {
    const mk = () => [
      slab(1, -30, 50),
      box(2, 'spingibile', { x: 2, y: 0, z: -0.6 }, { x: 3.2, y: 1.2, z: 0.6 }),
    ];
    const s1 = mk();
    const golem = start(0);
    advance(golem, 120, () => fwd({ walk: true }), 'golem', s1);
    expect(s1[1].min.x).toBeGreaterThan(4);
    const s2 = mk();
    const golden = start(0);
    advance(golden, 120, () => fwd({ walk: true }), 'golden', s2);
    expect(s2[1].min.x).toBe(2);
    expect(golden.state.position.x).toBeCloseTo(2 - 0.35, 2);
  });

  it('il masso si ferma contro un muro', () => {
    const solids = [
      slab(1, -30, 50),
      box(2, 'spingibile', { x: 2, y: 0, z: -0.6 }, { x: 3.2, y: 1.2, z: 0.6 }),
      box(3, 'fisso', { x: 6, y: 0, z: -5 }, { x: 7, y: 3, z: 5 }),
    ];
    const run = start(0);
    advance(run, 240, () => fwd({ walk: true }), 'golem', solids);
    expect(solids[1].max.x).toBeCloseTo(6, 3);
  });

  it('segnala il contatto con un pericolo senza bloccare', () => {
    const solids = [
      slab(1, -30, 50),
      box(9, 'pericolo', { x: 3, y: 0, z: -2 }, { x: 4, y: 1, z: 2 }),
    ];
    const run = start(0);
    advance(run, 60, () => fwd(), 'golden', solids);
    expect(run.events.some((e) => e.type === 'colpito' && e.hazardId === 9)).toBe(true);
    expect(run.state.position.x).toBeGreaterThan(5);
  });

  it('applyKnockback spinge via e mette il modo colpito', () => {
    const solids = [slab(1, -30, 50)];
    const run = start(0);
    applyKnockback(run.state, { x: 1, y: 0, z: 0 });
    advance(run, 5, () => fwd(), 'golden', solids);
    expect(run.state.mode).toBe('colpito');
    expect(run.state.position.x).toBeLessThan(0);
  });
});

describe('caduta e punto sicuro', () => {
  it('sotto y = -4 emette caduto una volta sola; teleport riporta su', () => {
    const solids = [slab(1, -30, 0)];
    const run = start(-5);
    advance(run, 300, () => fwd(), 'golden', solids);
    expect(run.events.filter((e) => e.type === 'caduto')).toHaveLength(1);
    expect(run.state.safePoint.x).toBeLessThan(-0.5 + 1e-6);
    expect(run.state.safePoint.x).toBeGreaterThan(-5.1);
    teleport(run.state, run.state.safePoint);
    advance(run, 30, () => NONE, 'golden', solids);
    expect(run.state.grounded).toBe(true);
    expect(run.events.filter((e) => e.type === 'caduto')).toHaveLength(1);
  });

  it('il punto sicuro non si aggiorna vicino al bordo né su un masso', () => {
    const solids = [
      slab(1, -30, 0),
      box(2, 'spingibile', { x: -20, y: 0, z: -1 }, { x: -18, y: 1, z: 1 }),
    ];
    const run = start(-10);
    advance(run, 5, () => NONE, 'golden', solids);
    teleport(run.state, { x: -19, y: 1, z: 0 });
    advance(run, 5, () => NONE, 'golden', solids);
    expect(run.state.safePoint.x).toBeCloseTo(-10, 6);
    teleport(run.state, { x: -0.2, y: 0, z: 0 });
    advance(run, 5, () => NONE, 'golden', solids);
    expect(run.state.safePoint.x).toBeCloseTo(-10, 6);
  });
});

describe('coyote time e salto memorizzato', () => {
  const ledge = [slab(1, -30, 0)];

  function jumpedAfterLeaving(waitFrames: number): boolean {
    const run = start(-1);
    let left = -1;
    let jumped = false;
    let wasGrounded = false;
    advance(
      run,
      40,
      (f, s) => {
        wasGrounded ||= s.grounded;
        if (wasGrounded && left < 0 && !s.grounded) left = f;
        if (s.mode === 'salta') jumped = true;
        return fwd({ jump: left >= 0 && f === left + waitFrames });
      },
      'golden',
      ledge,
    );
    return jumped;
  }

  it('coyote time: salta fino a 0,1 s dopo aver lasciato il suolo, non oltre', () => {
    expect(jumpedAfterLeaving(3)).toBe(true);
    expect(jumpedAfterLeaving(9)).toBe(false);
  });

  it('salto memorizzato: premuto poco prima di atterrare vale, troppo presto no', () => {
    const floor = [slab(1, -30, 30)];
    const tryPress = (frame: number): boolean => {
      const run = start(0, 0.3);
      let jumped = false;
      advance(
        run,
        30,
        (f, s) => {
          if (s.mode === 'salta') jumped = true;
          return { ...NONE, jump: f === frame };
        },
        'golden',
        floor,
      );
      return jumped;
    };
    expect(tryPress(7)).toBe(true);
    expect(tryPress(0)).toBe(false);
  });

  it('tenere premuto salto non ripete il salto', () => {
    const floor = [slab(1, -30, 30)];
    const run = start(0);
    let takeoff = 0;
    let prev = false;
    advance(
      run,
      300,
      (_f, s) => {
        if (prev && !s.grounded) takeoff++;
        prev = s.grounded;
        return { ...NONE, jump: true };
      },
      'golden',
      floor,
    );
    expect(takeoff).toBe(1);
  });
});
