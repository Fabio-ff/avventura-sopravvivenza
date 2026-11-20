import { describe, expect, it } from 'vitest';
import levelJson from '../src/missions/palestra/level.json';
import { toSolids, validateLevel } from '../src/world/build-level';
import { createPlayer, stepPlayer, teleport, type PlayerInput } from '../src/player/controller';
import { createLives, registerFall, tickLives } from '../src/player/lives';
import {
  INPUT_GATE_MAX,
  armInputGate,
  createInputGate,
  facingToward,
  handleFall,
  inputBlocked,
  tickInputGate,
} from '../src/player/respawn';
import { profileFor } from '../src/player/profiles';

const level = validateLevel(levelJson);
const solids = toSolids(level);
const DT = 1 / 60;

describe('blocco dei comandi dopo il rientro', () => {
  it('si sblocca appena la leva torna a riposo', () => {
    const g = createInputGate();
    expect(inputBlocked(g)).toBe(false);
    armInputGate(g);
    expect(inputBlocked(g)).toBe(true);
    tickInputGate(g, 1, DT);
    expect(inputBlocked(g)).toBe(true);
    tickInputGate(g, 0, DT);
    expect(inputBlocked(g)).toBe(false);
  });

  it('con la leva sempre premuta si sblocca comunque dopo 1,5 s', () => {
    const g = createInputGate();
    armInputGate(g);
    let t = 0;
    while (inputBlocked(g) && t < 5) {
      tickInputGate(g, 1, DT);
      t += DT;
    }
    expect(t).toBeGreaterThanOrEqual(INPUT_GATE_MAX - 0.05);
    expect(t).toBeLessThanOrEqual(INPUT_GATE_MAX + 0.05);
  });

  it('la direzione di rientro guarda dal vuoto verso il punto sicuro', () => {
    // caduto a nord (z minore) del punto sicuro: si guarda verso +z (facing 0)
    expect(facingToward({ x: 0, z: -9 }, { x: 0, z: -6 })).toBeCloseTo(0);
    // caduto a est: si guarda verso -x
    expect(facingToward({ x: 5, z: 0 }, { x: 2, z: 0 })).toBeCloseTo(-Math.PI / 2);
    expect(facingToward({ x: 1, z: 1 }, { x: 1, z: 1 })).toBeNull();
  });
});

interface Outcome {
  falls: number[];
  vite: number;
}

/**
 * Come main.ts: "avanti" sempre premuto (camera a yaw 0, avanti = -z) davanti a un fossato.
 * `releaseAfter`: secondi dal primo rientro dopo i quali si lascia la leva (null = mai).
 */
function simulate(
  start: { x: number; y: number; z: number },
  seconds: number,
  releaseAfter: number | null,
  useGate = true,
): Outcome {
  const profile = profileFor('golden');
  const player = createPlayer(start);
  player.facing = Math.PI;
  const lives = createLives(profile.vite);
  const gate = createInputGate();
  const falls: number[] = [];
  let firstFall: number | null = null;
  for (let n = 0; n * DT < seconds; n++) {
    const t = n * DT;
    const released = releaseAfter !== null && firstFall !== null && t - firstFall >= releaseAfter;
    const stick = released ? 0 : 1;
    tickInputGate(gate, stick, DT);
    const blocked = useGate && inputBlocked(gate);
    const input: PlayerInput = {
      moveX: 0,
      moveY: blocked ? 0 : stick,
      walk: false,
      jump: false,
      crouch: false,
    };
    for (const e of stepPlayer(player, input, 0, profile, solids, DT)) {
      if (e.type !== 'caduto') continue;
      if (useGate) {
        if (handleFall(player, lives, solids, gate)) falls.push(t);
      } else if (registerFall(lives) !== null) {
        teleport(player, player.safePoint, solids);
        falls.push(t);
      }
      firstFall ??= t;
    }
    tickLives(lives, DT);
  }
  return { falls, vite: lives.vite };
}

describe('caduta nel fossato tenendo premuto avanti', () => {
  const stretto = { x: 0, y: 0, z: -3 };
  const largo = { x: 0, y: 0, z: -13 };

  it('fossato stretto e largo: lasciata la leva dopo il rientro si perde una sola vita in 5 s', () => {
    for (const start of [stretto, largo]) {
      const r = simulate(start, 5, 0.5);
      expect(r.falls).toHaveLength(1);
      expect(r.vite).toBe(2);
    }
  });

  it('anche con la leva sempre premuta due cadute distano almeno il blocco, non 0,13 s', () => {
    for (const start of [stretto, largo]) {
      const r = simulate(start, 5, null);
      expect(r.vite).toBeGreaterThanOrEqual(1);
      for (let i = 1; i < r.falls.length; i++)
        expect(r.falls[i]! - r.falls[i - 1]!).toBeGreaterThanOrEqual(INPUT_GATE_MAX);
    }
  });

  it('senza blocco le vite finiscono in fretta (il difetto di prima)', () => {
    const r = simulate(stretto, 5, null, false);
    expect(r.vite).toBeLessThanOrEqual(1);
  });

  it('il personaggio rientra guardando via dal vuoto, a 1,5 m dal bordo', () => {
    const profile = profileFor('golden');
    const player = createPlayer(stretto);
    player.facing = Math.PI;
    const lives = createLives(profile.vite);
    const gate = createInputGate();
    let fell = false;
    for (let n = 0; n < 60 * 5 && !fell; n++) {
      const input: PlayerInput = { moveX: 0, moveY: 1, walk: false, jump: false, crouch: false };
      for (const e of stepPlayer(player, input, 0, profile, solids, DT)) {
        if (e.type === 'caduto') {
          expect(handleFall(player, lives, solids, gate)).toBe(true);
          fell = true;
        }
      }
    }
    expect(fell).toBe(true);
    // il bordo della lastra di partenza è a z = -8
    expect(player.position.z).toBeGreaterThanOrEqual(-8 + 1.5 - 1e-6);
    expect(Math.cos(player.facing)).toBeGreaterThan(0.9);
    expect(inputBlocked(gate)).toBe(true);
  });
});
