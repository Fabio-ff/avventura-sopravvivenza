// Controller del giocatore: logica pura, nessun three e nessun DOM.
// Non gestisce vite né invulnerabilità: segnala soltanto (colpito, caduto).
import { STEP_HEIGHT, bodyOverlaps, moveBody } from '../world/collide';
import type { Solid, Vec3 } from '../world/solids';
import { GRAVITY, jumpSpeed, type AbilityProfile } from './profiles';

export const STAND_HEIGHT = 1.8;
export const CROUCH_HEIGHT = 1.0;
export const PLAYER_RADIUS = 0.35;
export const FALL_LIMIT_Y = -4;
/** dt oltre questo valore viene suddiviso; oltre MAX_TOTAL_DT viene troncato. */
const MAX_DT = 0.05;
const SUB_DT = 1 / 60;
const MAX_TOTAL_DT = 0.25;
const COYOTE_TIME = 0.1;
const JUMP_BUFFER = 0.1;
const WALK_THRESHOLD = 0.5;
const KNOCK_TIME = 0.35;
const KNOCK_SPEED = 5;
const KNOCK_HOP = 4;
/** Distanza minima dal bordo di una lastra perché valga come punto sicuro. */
const SAFE_MARGIN = 0.8;

export type GroundHook = (x: number, z: number) => number | null;

/** moveY positivo = avanti (joystick in su), moveX positivo = destra. */
export interface PlayerInput {
  moveX: number;
  moveY: number;
  walk: boolean;
  jump: boolean;
  crouch: boolean;
}

export type PlayerMode =
  'fermo' | 'cammina' | 'corre' | 'salta' | 'cade' | 'accovacciato' | 'colpito';

export type PlayerEvent = { type: 'colpito'; hazardId: number } | { type: 'caduto' };

export interface PlayerState {
  position: Vec3;
  velocity: Vec3;
  /** Direzione del personaggio come rotazione attorno a y (0 = guarda verso +z). */
  facing: number;
  mode: PlayerMode;
  grounded: boolean;
  crouching: boolean;
  /** Ultima posizione ferma sicura: a terra su una scatola `fisso`, ben dentro il bordo. */
  safePoint: Vec3;
  coyote: number;
  jumpBuffer: number;
  prevJump: boolean;
  hitTimer: number;
  knock: { x: number; z: number };
  fallen: boolean;
}

export function createPlayer(spawn: Vec3): PlayerState {
  return {
    position: { ...spawn },
    velocity: { x: 0, y: 0, z: 0 },
    facing: 0,
    mode: 'fermo',
    grounded: false,
    crouching: false,
    safePoint: { ...spawn },
    coyote: 0,
    jumpBuffer: 0,
    prevJump: false,
    hitTimer: 0,
    knock: { x: 0, z: 0 },
    fallen: false,
  };
}

/** Spinge il giocatore via da `from` (orizzontale) con un piccolo balzo; modo `colpito`. */
export function applyKnockback(state: PlayerState, from: Vec3): void {
  let dx = state.position.x - from.x;
  let dz = state.position.z - from.z;
  let len = Math.hypot(dx, dz);
  if (len < 1e-6) {
    dx = -Math.sin(state.facing);
    dz = -Math.cos(state.facing);
    len = 1;
  }
  state.knock = { x: (dx / len) * KNOCK_SPEED, z: (dz / len) * KNOCK_SPEED };
  state.velocity.y = KNOCK_HOP;
  state.grounded = false;
  state.hitTimer = KNOCK_TIME;
  state.mode = 'colpito';
}

/**
 * Riporta il giocatore in `position` da fermo (rinascita, ritorno alla partenza) e azzera
 * velocità, accovacciato, spinta e timer. Se la destinazione compenetra una scatola, cerca
 * il punto libero più vicino spostandosi in orizzontale. Il punto sicuro diventa la destinazione.
 */
export function teleport(state: PlayerState, position: Vec3, solids: readonly Solid[] = []): void {
  const dest = freeSpot(position, solids);
  state.position = { ...dest };
  state.velocity = { x: 0, y: 0, z: 0 };
  state.grounded = false;
  state.crouching = false;
  state.knock = { x: 0, z: 0 };
  state.coyote = 0;
  state.jumpBuffer = 0;
  state.hitTimer = 0;
  state.fallen = false;
  state.mode = 'fermo';
  state.safePoint = { ...dest };
}

function freeSpot(p: Vec3, solids: readonly Solid[]): Vec3 {
  const fits = (q: Vec3): boolean =>
    !bodyOverlaps({ position: q, radius: PLAYER_RADIUS, height: STAND_HEIGHT }, solids);
  if (fits(p)) return p;
  for (let ring = 1; ring <= 40; ring++) {
    const d = ring * 0.25;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const q = { x: p.x + Math.cos(a) * d, y: p.y, z: p.z + Math.sin(a) * d };
      if (fits(q)) return q;
    }
  }
  return p;
}

/**
 * Avanza di `dt` secondi. `cameraYaw` come rotazione.y di three: con yaw 0 "avanti" è -z,
 * e cresce girando in senso antiorario visto dall'alto. Le scatole spingibili possono
 * essere modificate sul posto.
 */
export function stepPlayer(
  state: PlayerState,
  input: PlayerInput,
  cameraYaw: number,
  profile: AbilityProfile,
  solids: readonly Solid[],
  dt: number,
  groundHeightAt?: GroundHook,
): PlayerEvent[] {
  if (dt <= MAX_DT) return stepOnce(state, input, cameraYaw, profile, solids, dt, groundHeightAt);
  // dt grande (scheda lenta, ritorno dal background): passi da al più 1/60, con tetto
  const total = Math.min(dt, MAX_TOTAL_DT);
  const n = Math.ceil(total / SUB_DT - 1e-9);
  const events: PlayerEvent[] = [];
  for (let i = 0; i < n; i++)
    events.push(...stepOnce(state, input, cameraYaw, profile, solids, total / n, groundHeightAt));
  return events;
}

function stepOnce(
  state: PlayerState,
  input: PlayerInput,
  cameraYaw: number,
  profile: AbilityProfile,
  solids: readonly Solid[],
  dt: number,
  groundHeightAt?: GroundHook,
): PlayerEvent[] {
  const events: PlayerEvent[] = [];
  const hit = state.hitTimer > 0;

  // accovacciato: ci si rialza solo se sopra c'è spazio
  if (input.crouch) state.crouching = true;
  else if (state.crouching) {
    const canStand = !bodyOverlaps(
      { position: state.position, radius: PLAYER_RADIUS, height: STAND_HEIGHT },
      solids,
    );
    if (canStand) state.crouching = false;
  }

  // movimento orizzontale: direzione relativa alla camera, controllo pieno anche in aria
  let mag = Math.hypot(input.moveX, input.moveY);
  let moving = false;
  let walking = false;
  let vx = 0;
  let vz = 0;
  if (hit) {
    vx = state.knock.x;
    vz = state.knock.z;
  } else if (mag > 0.01) {
    moving = true;
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);
    const dx = (cos * input.moveX - sin * input.moveY) / mag;
    const dz = (-sin * input.moveX - cos * input.moveY) / mag;
    mag = Math.min(mag, 1);
    walking = input.walk || mag < WALK_THRESHOLD;
    const speed = state.crouching
      ? profile.accovacciato
      : walking
        ? profile.camminata
        : profile.corsa;
    vx = dx * speed;
    vz = dz * speed;
    state.facing = Math.atan2(dx, dz);
  }
  state.velocity.x = vx;
  state.velocity.z = vz;

  // salto: coyote time e salto memorizzato (serve il fronte di salita)
  const rising = input.jump && !state.prevJump;
  state.prevJump = input.jump;
  state.jumpBuffer = rising ? JUMP_BUFFER : Math.max(0, state.jumpBuffer - dt);
  state.coyote = state.grounded ? COYOTE_TIME : Math.max(0, state.coyote - dt);
  if (state.jumpBuffer > 0 && state.coyote > 0 && !state.crouching && !hit) {
    state.velocity.y = jumpSpeed(profile);
    state.jumpBuffer = 0;
    state.coyote = 0;
    state.grounded = false;
  }
  // a terra e senza saltare: in discesa ci si aggancia al suolo (gradini fino a 0,35 m)
  const snapDown = state.grounded ? STEP_HEIGHT : 0;

  // gravità (integrazione esatta per la parabola)
  const dy = state.velocity.y * dt - 0.5 * GRAVITY * dt * dt;
  state.velocity.y -= GRAVITY * dt;

  const body = {
    position: state.position,
    radius: PLAYER_RADIUS,
    height: state.crouching ? CROUCH_HEIGHT : STAND_HEIGHT,
  };
  const res = moveBody(body, { x: vx * dt, y: dy, z: vz * dt }, solids, {
    canPush: profile.canPush,
    snapDown,
    groundHeightAt,
  });
  state.position = res.position;
  state.grounded = res.grounded;
  if (res.grounded || (res.hitCeiling && state.velocity.y > 0)) state.velocity.y = 0;
  if (res.hazardId !== null) events.push({ type: 'colpito', hazardId: res.hazardId });

  if (state.hitTimer > 0) state.hitTimer = Math.max(0, state.hitTimer - dt);

  // modo
  if (state.hitTimer > 0) state.mode = 'colpito';
  else if (!state.grounded) state.mode = state.velocity.y > 0 ? 'salta' : 'cade';
  else if (state.crouching) state.mode = 'accovacciato';
  else if (moving) state.mode = walking ? 'cammina' : 'corre';
  else state.mode = 'fermo';

  if (state.grounded && res.hazardId === null && state.mode !== 'colpito')
    updateSafePoint(state, solids);

  if (state.position.y < FALL_LIMIT_Y && !state.fallen) {
    state.fallen = true;
    events.push({ type: 'caduto' });
  }
  return events;
}

function updateSafePoint(state: PlayerState, solids: readonly Solid[]): void {
  const p = state.position;
  for (const s of solids) {
    // in piedi su un masso non vale
    if (
      s.kind === 'spingibile' &&
      Math.abs(s.max.y - p.y) <= 0.01 &&
      p.x + PLAYER_RADIUS > s.min.x &&
      p.x - PLAYER_RADIUS < s.max.x &&
      p.z + PLAYER_RADIUS > s.min.z &&
      p.z - PLAYER_RADIUS < s.max.z
    )
      return;
  }
  for (const s of solids) {
    if (s.kind !== 'fisso' || Math.abs(s.max.y - p.y) > 0.01) continue;
    if (
      p.x >= s.min.x + SAFE_MARGIN &&
      p.x <= s.max.x - SAFE_MARGIN &&
      p.z >= s.min.z + SAFE_MARGIN &&
      p.z <= s.max.z - SAFE_MARGIN
    ) {
      state.safePoint = { ...p };
      return;
    }
  }
}
