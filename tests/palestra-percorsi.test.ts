// Percorsi scriptati sul vero level.json, con stepPlayer a 1/60 s.
import { describe, expect, it } from 'vitest';
import levelJson from '../src/missions/palestra/level.json';
import { toSolids, validateLevel } from '../src/world/build-level';
import {
  createPlayer,
  stepPlayer,
  type PlayerEvent,
  type PlayerInput,
  type PlayerState,
} from '../src/player/controller';
import { profileFor } from '../src/player/profiles';
import { groundBelow, type Solid, type Vec3 } from '../src/world/solids';

const level = validateLevel(levelJson);
const DT = 1 / 60;

/** Dentro la recinzione: la sala, oppure il corridoio laterale. */
function inside(p: Vec3): boolean {
  const hall = p.x >= -10 && p.x <= 10 && p.z >= -91 && p.z <= 9;
  const corridor = p.x >= 10 && p.x <= 14 && p.z >= -73 && p.z <= -37;
  return hall || corridor;
}

interface Waypoint {
  x: number;
  z: number;
  walk?: boolean;
  crouch?: boolean;
  /** Tiene premuto salto finché questa condizione è vera. */
  jumpWhen?: (p: Vec3) => boolean;
  /** Raggio di arrivo, in metri. */
  reach?: number;
}

interface Result {
  state: PlayerState;
  events: PlayerEvent[];
  outside: boolean;
  solids: Solid[];
  maxY: number;
}

/** Cammina da waypoint a waypoint con camera a yaw 0 (avanti = -z, destra = +x). */
function run(
  profileId: string,
  start: Vec3,
  waypoints: Waypoint[],
  solids: Solid[] = toSolids(level),
  /** Se vero, l'ultimo waypoint può restare irraggiungibile (si spinge contro un muro). */
  pushLast = false,
): Result {
  const profile = profileFor(profileId);
  const state = createPlayer(start);
  const events: PlayerEvent[] = [];
  let outside = false;
  let maxY = start.y;
  let i = 0;
  for (let n = 0; n < 60 * 90 && i < waypoints.length; n++) {
    const w = waypoints[i]!;
    const dx = w.x - state.position.x;
    const dz = w.z - state.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < (w.reach ?? 0.4)) {
      i++;
      continue;
    }
    const input: PlayerInput = {
      moveX: dx / dist,
      moveY: -dz / dist,
      walk: w.walk ?? false,
      jump: w.jumpWhen ? w.jumpWhen(state.position) : false,
      crouch: w.crouch ?? false,
    };
    events.push(...stepPlayer(state, input, 0, profile, solids, DT));
    if (!inside(state.position)) outside = true;
    maxY = Math.max(maxY, state.position.y);
  }
  if (i < waypoints.length && !(pushLast && i === waypoints.length - 1))
    throw new Error(`bloccato al waypoint ${i} in ${JSON.stringify(state.position)}`);
  // si lascia riposare un istante
  const idle: PlayerInput = { moveX: 0, moveY: 0, walk: false, jump: false, crouch: false };
  for (let n = 0; n < 60; n++) stepPlayer(state, idle, 0, profile, solids, DT);
  return { state, events, outside, solids, maxY };
}

const jumpAt = (z: number) => (p: Vec3) => p.z < z;

describe('percorsi sulla palestra vera', () => {
  it('golden arriva in fondo: salta il fossato stretto, passerella, strada lunga attorno al masso', () => {
    const r = run('golden', level.partenza, [
      { x: 0, z: -7.6, reach: 0.2 },
      { x: 0, z: -12, jumpWhen: (p) => p.z < -7.2 && p.z > -9 },
      { x: 8.75, z: -16 },
      { x: 8.75, z: -27 },
      { x: 5, z: -30.5 },
      { x: 5, z: -31.2, jumpWhen: jumpAt(-31.0), reach: 0.2 },
      { x: 5, z: -36 },
      { x: 12.5, z: -38.5 },
      { x: 12.5, z: -67.5 },
      { x: 8, z: -67.5 },
      { x: 6, z: -72 },
      { x: 6, z: -86 },
    ]);
    expect(r.outside).toBe(false);
    expect(r.state.grounded).toBe(true);
    expect(r.state.position.z).toBeLessThan(-85);
    expect(r.state.position.y).toBeCloseTo(0, 3);
    expect(r.events).toEqual([]);
  });

  it('golden attraversa il passaggio basso accovacciato', () => {
    const r = run('golden', { x: 0, y: 0, z: -49 }, [
      { x: 0, z: -50, crouch: true },
      { x: 0, z: -55, crouch: true },
    ]);
    expect(r.state.position.z).toBeLessThan(-54);
    expect(r.outside).toBe(false);
  });

  it("golden in piedi non passa sotto l'architrave", () => {
    const profile = profileFor('golden');
    const solids = toSolids(level);
    const state = createPlayer({ x: 0, y: 0, z: -49 });
    for (let n = 0; n < 300; n++)
      stepPlayer(
        state,
        { moveX: 0, moveY: 1, walk: false, jump: false, crouch: false },
        0,
        profile,
        solids,
        DT,
      );
    expect(state.position.z).toBeGreaterThan(-51);
  });

  it('ninja supera il fossato largo e il muro da 1,6 m', () => {
    const wide = run('ninja', { x: 0, y: 0, z: -12 }, [
      { x: 0, z: -19.6, reach: 0.2 },
      { x: 0, z: -28, jumpWhen: (p) => p.z < -19.6 && p.z > -22 },
    ]);
    expect(wide.outside).toBe(false);
    expect(wide.state.position.z).toBeLessThan(-26);
    expect(wide.state.grounded).toBe(true);
    expect(wide.state.position.y).toBeGreaterThanOrEqual(0);

    const wall = run('ninja', { x: 0, y: 0, z: -37 }, [
      { x: 0, z: -40.2, reach: 0.2 },
      { x: 0, z: -44, jumpWhen: (p) => p.z < -40.2 && p.z > -41.2 },
    ]);
    expect(wall.maxY).toBeGreaterThan(1.6);
    expect(wall.state.position.z).toBeLessThan(-42);
    expect(wall.outside).toBe(false);
  });

  it('ninja che salta dal muro da 1,6 m verso la recinzione non esce', () => {
    const tentativi: [Vec3, number, number][] = [
      [{ x: -5, y: 1.6, z: -41.5 }, -30, -41.5], // ovest
      [{ x: 2, y: 1.6, z: -41.5 }, 30, -41.5], // est
      [{ x: -5, y: 1.6, z: -41.5 }, -5, -70], // verso il muro alto
      [{ x: -6.5, y: 1.6, z: -41.5 }, -30, -60], // dal bordo ovest in diagonale
    ];
    for (const [from, x, z] of tentativi) {
      const jumpEverywhere = (): boolean => true;
      // salto continuo (tenuto premuto): il controller salta di nuovo a ogni atterraggio
      const r = run('ninja', from, [{ x, z, jumpWhen: jumpEverywhere }], toSolids(level), true);
      expect(r.outside).toBe(false);
    }
  });

  it('ninja non esce provando a salire sul masso e sul muro del varco', () => {
    const r = run(
      'ninja',
      { x: 0, y: 0, z: -56 },
      [
        { x: 0, z: -57.6, jumpWhen: (p) => p.z < -57.2 },
        { x: 0, z: -70, jumpWhen: () => true },
      ],
      toSolids(level),
      true,
    );
    expect(r.outside).toBe(false);
    // il masso (1,5 m) più il salto (2 m) non arriva in cima al muro del varco
    expect(r.maxY).toBeLessThan(3.6);
  });

  it('golem sposta il masso e passa dal varco', () => {
    const solids = toSolids(level);
    const masso = solids.find((s) => s.kind === 'spingibile')!;
    const z0 = masso.min.z;
    const r = run(
      'golem',
      { x: 0, y: 0, z: -56 },
      [
        { x: 0, z: -62, walk: true },
        { x: 4, z: -66 },
        { x: 5, z: -86 },
      ],
      solids,
    );
    expect(masso.min.z).toBeLessThan(z0 - 0.5);
    expect(r.state.position.z).toBeLessThan(-85);
    expect(r.outside).toBe(false);
  });

  it('golden non sposta il masso', () => {
    const solids = toSolids(level);
    const masso = solids.find((s) => s.kind === 'spingibile')!;
    const z0 = masso.min.z;
    const profile = profileFor('golden');
    const state = createPlayer({ x: 0, y: 0, z: -56 });
    for (let n = 0; n < 240; n++)
      stepPlayer(
        state,
        { moveX: 0, moveY: 1, walk: true, jump: false, crouch: false },
        0,
        profile,
        solids,
        DT,
      );
    expect(masso.min.z).toBe(z0);
  });
});

describe('geometria della recinzione', () => {
  const solids = toSolids(level);
  const named = (b: (typeof level.scatole)[number]) => b.nome.startsWith('recinto');
  const fences = level.scatole.map((b, i) => ({ b, s: solids[i]! })).filter(({ b }) => named(b));

  it('la recinzione è molto più alta di tutto ciò su cui si può salire più il salto del ninja', () => {
    const ninja = profileFor('ninja').salto;
    const others = level.scatole.filter((b) => !named(b) && b.tipo !== 'pericolo');
    const maxTop = Math.max(...others.map((b) => b.posizione.y + b.dimensioni.y / 2));
    // anche salendo su un muro da 1,6 m e saltando, e salendo sul masso da 1,5 m e poi su un muro
    expect(fences[0]!.s.max.y).toBeGreaterThan(Math.max(1.6, 1.5) + ninja + 1);
    expect(maxTop).toBeLessThan(fences[0]!.s.max.y);
  });

  it('i muri bassi (1-2,2 m) distano almeno 3 m dalla recinzione', () => {
    const gapXZ = (a: Solid, b: Solid) =>
      Math.hypot(
        Math.max(0, a.min.x - b.max.x, b.min.x - a.max.x),
        Math.max(0, a.min.z - b.max.z, b.min.z - a.max.z),
      );
    level.scatole.forEach((b, i) => {
      if (named(b) || b.tipo !== 'fisso') return;
      if (
        b.dimensioni.y < 1 ||
        b.dimensioni.y > 2.2 ||
        Math.abs(b.posizione.y - b.dimensioni.y / 2) > 0.01
      )
        return;
      for (const f of fences)
        expect(gapXZ(solids[i]!, f.s), `${b.nome} / ${f.b.nome}`).toBeGreaterThanOrEqual(3);
    });
  });

  it('nessun vuoto tra pavimento e recinzione, tranne i fossati voluti', () => {
    const moat = (z: number) => (z < -8 && z > -10) || (z < -20 && z > -25.5);
    const hasFloor = (x: number, z: number) => groundBelow(solids, x, z, 0.5) !== null;
    for (let z = 8.7; z >= -90.7; z -= 0.1)
      for (const x of [-9.7, 9.7]) if (!moat(z)) expect(hasFloor(x, z), `x=${x} z=${z}`).toBe(true);
    for (let x = -9.7; x <= 9.7; x += 0.1)
      for (const z of [8.7, -90.7]) expect(hasFloor(x, z), `x=${x} z=${z}`).toBe(true);
    for (let z = -37.3; z >= -72.7; z -= 0.1)
      for (const x of [11.3, 13.7]) expect(hasFloor(x, z), `x=${x} z=${z}`).toBe(true);
  });
});
