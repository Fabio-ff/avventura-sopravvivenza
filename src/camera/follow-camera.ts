// Camera in terza persona: la parte pura (angoli, distanza) è testata; `FollowCamera` la applica a three.
import type { PerspectiveCamera } from 'three';
import { angleDelta } from '../app/angles';
import { segmentHitsSolid, segmentHitsSolids } from '../world/collide';
import type { Solid, SolidKind, Vec3 } from '../world/solids';

export const CAMERA_DISTANCE = 4.5;
export const MIN_PITCH = (-10 * Math.PI) / 180;
export const MAX_PITCH = (60 * Math.PI) / 180;
export const DEFAULT_PITCH = (25 * Math.PI) / 180;
/** Secondi senza comandi di camera, in movimento, prima del riallineamento. */
export const REALIGN_DELAY = 1.5;
/** Velocità massima del riallineamento, in rad/s. */
export const REALIGN_MAX_RATE = 0.8;
const REALIGN_GAIN = 1.5;
/** Margine tenuto tra camera e muro, in metri. */
export const WALL_MARGIN = 0.35;
/** Sotto questa distanza la camera non si avvicina: si alza invece. */
export const MIN_DISTANCE = 1.2;
/** Altezza del punto inquadrato sopra i piedi. */
export const FOCUS_HEIGHT = 1.4;
export const CROUCH_FOCUS_HEIGHT = 0.9;

/**
 * `yaw` come rotazione.y di three (0 = la camera guarda verso -z); `pitch` è l'elevazione della
 * camera sopra il personaggio (positivo = dall'alto).
 */
export interface CameraAngles {
  yaw: number;
  pitch: number;
  /** Secondi dall'ultimo comando di camera. */
  idle: number;
}

export function createCameraAngles(yaw = 0): CameraAngles {
  return { yaw, pitch: DEFAULT_PITCH, idle: 0 };
}

export function clampPitch(pitch: number): number {
  return Math.min(MAX_PITCH, Math.max(MIN_PITCH, pitch));
}

/**
 * Applica i comandi di camera (segno dello schermo: destra e basso positivi) e il riallineamento.
 * Trascinare a destra gira la visuale a destra; trascinare in alto alza lo sguardo.
 * `moveX`/`moveY` sono la leva (relativa alla camera: moveY positivo = avanti), `facing` la
 * direzione del personaggio. Il riallineamento avviene solo se si va in avanti e la differenza
 * è sotto 90 gradi; con la leva di lato o verso la camera la camera sta ferma.
 */
export function updateCameraAngles(
  a: CameraAngles,
  lookX: number,
  lookY: number,
  moveX: number,
  moveY: number,
  facing: number,
  dt: number,
): void {
  if (Math.abs(lookX) > 1e-6 || Math.abs(lookY) > 1e-6) {
    a.yaw -= lookX;
    a.pitch = clampPitch(a.pitch + lookY);
    a.idle = 0;
    return;
  }
  a.idle += dt;
  if (a.idle < REALIGN_DELAY) return;
  const mag = Math.hypot(moveX, moveY);
  if (mag < 0.01) return;
  const forward = Math.max(0, moveY / Math.max(1, mag));
  // dietro al personaggio: la camera sta dalla parte opposta alla direzione di marcia
  const delta = angleDelta(a.yaw, facing + Math.PI);
  const size = Math.abs(delta);
  if (forward <= 0.05 || size >= Math.PI / 2 || size < 0.002) return;
  const speed = Math.min(REALIGN_MAX_RATE, REALIGN_GAIN * size) * forward;
  a.yaw += Math.sign(delta) * Math.min(size, speed * dt);
}

/** Direzione dal punto inquadrato verso la camera (vettore unitario). */
export function cameraOffsetDir(yaw: number, pitch: number): Vec3 {
  const c = Math.cos(pitch);
  return { x: Math.sin(yaw) * c, y: Math.sin(pitch), z: Math.cos(yaw) * c };
}

/** Spostamento dei raggi laterali rispetto a quello centrale, in metri. */
export const RAY_OFFSET = 0.3;
/** Passo di prova delle inclinazioni quando la distanza è troppo corta. */
const PITCH_PROBE_STEP = (5 * Math.PI) / 180;
/** Tutte le scatole possono coprire la vista. */
const VIEW_BLOCKERS: readonly SolidKind[] = ['fisso', 'spingibile', 'pericolo'];

const rayFrom: Vec3 = { x: 0, y: 0, z: 0 };
const rayTo: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * Distanza voluta: 4,5 m, accorciata se una scatola sta tra il punto inquadrato e la camera. Cinque
 * raggi paralleli (centro, destra, sinistra, su, giù a 0,3 m): vale il più corto, così la camera
 * non sfiora gli spigoli e il piano vicino non taglia i muri di lato.
 */
export function desiredDistance(
  focus: Vec3,
  yaw: number,
  pitch: number,
  solids: readonly Solid[],
  max = CAMERA_DISTANCE,
): number {
  const d = cameraOffsetDir(yaw, pitch);
  // destra = orizzontale e perpendicolare a d; su = perpendicolare a entrambi
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const ux = -Math.sin(pitch) * Math.sin(yaw);
  const uy = Math.cos(pitch);
  const uz = -Math.sin(pitch) * Math.cos(yaw);
  let best = 1;
  for (let i = 0; i < 5; i++) {
    let ox = 0;
    let oy = 0;
    let oz = 0;
    if (i === 1 || i === 2) {
      const k = i === 1 ? RAY_OFFSET : -RAY_OFFSET;
      ox = rx * k;
      oz = rz * k;
    } else if (i === 3 || i === 4) {
      const k = i === 3 ? RAY_OFFSET : -RAY_OFFSET;
      ox = ux * k;
      oy = uy * k;
      oz = uz * k;
    }
    rayFrom.x = focus.x + ox;
    rayFrom.y = focus.y + oy;
    rayFrom.z = focus.z + oz;
    rayTo.x = rayFrom.x + d.x * max;
    rayTo.y = rayFrom.y + d.y * max;
    rayTo.z = rayFrom.z + d.z * max;
    const t = segmentHitsSolids(rayFrom, rayTo, solids, VIEW_BLOCKERS);
    if (t !== null && t < best) best = t;
  }
  if (best >= 1) return max;
  return Math.min(max, Math.max(0, best * max - WALL_MARGIN));
}

/** Isteresi: uscendo dal ripiego "oltre il muro" servono `MIN_DISTANCE` più questo margine. */
export const FALLBACK_HYSTERESIS = 0.4;

export interface CameraPose {
  distance: number;
  pitch: number;
  /**
   * Vero se nessuna inclinazione arriva a `minDistance`: la camera resta all'inclinazione voluta e
   * alla distanza piena, oltre il muro. La visibilità la garantisce la sfumatura degli ostacoli.
   */
  throughWall: boolean;
}

/**
 * Distanza e inclinazione da usare. Se con l'inclinazione voluta la camera resterebbe sotto
 * `minDistance` (muro alle spalle, architrave sopra la testa) si provano, a passi di 5 gradi tra
 * `MIN_PITCH` e `MAX_PITCH`, le inclinazioni sia più alte sia più basse: vale la più vicina a
 * quella voluta che arriva a `minDistance`. Se nessuna ci arriva la camera NON si avvicina (finirebbe
 * nella testa del personaggio): resta all'inclinazione voluta e alla distanza piena, anche oltre il
 * muro, che sfuma perché sta tra camera e personaggio (`occluders`).
 */
export function desiredPose(
  focus: Vec3,
  yaw: number,
  pitch: number,
  solids: readonly Solid[],
  minDistance = MIN_DISTANCE,
): CameraPose {
  const raw = desiredDistance(focus, yaw, pitch, solids);
  if (raw >= minDistance) return { distance: raw, pitch, throughWall: false };
  let best: CameraPose | null = null;
  let bestGap = Infinity;
  const steps = Math.round((MAX_PITCH - MIN_PITCH) / PITCH_PROBE_STEP);
  for (let i = 0; i <= steps; i++) {
    const pp = MIN_PITCH + i * PITCH_PROBE_STEP;
    const dist = desiredDistance(focus, yaw, pp, solids);
    const gap = Math.abs(pp - pitch);
    if (dist >= minDistance && gap < bestGap) {
      bestGap = gap;
      best = { distance: dist, pitch: pp, throughWall: false };
    }
  }
  return best ?? { distance: CAMERA_DISTANCE, pitch, throughWall: true };
}

/** Sotto questa distanza della camera il modello del personaggio sfuma fino a sparire. */
export const CLOSE_DISTANCE = 0.7;
/** A questa distanza (o meno) il modello è del tutto sparito. */
export const FADE_END_DISTANCE = 0.35;

/** Opacità del modello in funzione della distanza effettiva della camera: 1 da `CLOSE_DISTANCE` in su. */
export function modelOpacity(distance: number): number {
  if (distance >= CLOSE_DISTANCE) return 1;
  return Math.max(0, (distance - FADE_END_DISTANCE) / (CLOSE_DISTANCE - FADE_END_DISTANCE));
}

/** Bersaglio per `occluders`: testa, busto e piedi del personaggio. */
export interface OcclusionTargets {
  head: Vec3;
  chest: Vec3;
  feet: Vec3;
}

/** Tolleranza sulla quota dei piedi per riconoscere il pavimento su cui si sta. */
const FLOOR_TOLERANCE = 0.05;

function pointInside(p: Vec3, s: Solid): boolean {
  return (
    p.x > s.min.x &&
    p.x < s.max.x &&
    p.y > s.min.y &&
    p.y < s.max.y &&
    p.z > s.min.z &&
    p.z < s.max.z
  );
}

/**
 * Id delle scatole attraversate da almeno uno dei segmenti camera -> testa / busto / piedi.
 * Vale anche se la camera è dentro la scatola. Le scatole il cui lato superiore è ai piedi o sotto (il pavimento) non contano. Se si passa
 * `out` viene riempito e restituito (nessuna allocazione).
 */
export function occluders(
  cameraPos: Vec3,
  targets: OcclusionTargets,
  solids: readonly Solid[],
  out: number[] = [],
): number[] {
  out.length = 0;
  const floorY = targets.feet.y + FLOOR_TOLERANCE;
  for (const s of solids) {
    if (s.max.y <= floorY) continue;
    if (
      pointInside(cameraPos, s) ||
      segmentHitsSolid(cameraPos, targets.head, s) !== null ||
      segmentHitsSolid(cameraPos, targets.chest, s) !== null ||
      segmentHitsSolid(cameraPos, targets.feet, s) !== null
    )
      out.push(s.id);
  }
  return out;
}

/** Si accorcia subito (mai dentro un muro), si allunga piano (niente scatti). */
export function smoothDistance(current: number, target: number, dt: number): number {
  if (target <= current) return target;
  return current + (target - current) * (1 - Math.exp(-3 * Math.max(0, dt)));
}

/** Segue il personaggio con movimento morbido e applica la posa alla `PerspectiveCamera`. */
export class FollowCamera {
  readonly angles = createCameraAngles();
  private focus: Vec3 | null = null;
  private distance = CAMERA_DISTANCE;
  private pitch = DEFAULT_PITCH;
  private focusHeight = FOCUS_HEIGHT;
  private throughWall = false;

  /** Distanza effettiva tra camera e punto inquadrato (serve a sfumare il modello se è vicinissima). */
  get currentDistance(): number {
    return this.distance;
  }

  constructor(private readonly camera: PerspectiveCamera) {}

  /** Il punto inquadrato si sposta subito alla prossima `update` (partenza, teletrasporto). */
  snap(): void {
    this.focus = null;
  }

  update(target: Vec3, solids: readonly Solid[], dt: number, crouching = false): void {
    const step = Math.max(0, dt);
    // da accovacciati si inquadra più in basso (il punto inquadrato non va sopra l'architrave)
    this.focusHeight +=
      ((crouching ? CROUCH_FOCUS_HEIGHT : FOCUS_HEIGHT) - this.focusHeight) *
      (1 - Math.exp(-10 * step));
    const want = { x: target.x, y: target.y + this.focusHeight, z: target.z };
    const first = !this.focus;
    if (!this.focus) {
      this.focus = want;
    } else {
      const k = 1 - Math.exp(-12 * step);
      this.focus.x += (want.x - this.focus.x) * k;
      this.focus.y += (want.y - this.focus.y) * (1 - Math.exp(-6 * step));
      this.focus.z += (want.z - this.focus.z) * k;
    }
    const f = this.focus;
    // con la camera oltre il muro si torna "davanti" solo se c'è un po' più di spazio del minimo
    const minDistance = this.throughWall ? MIN_DISTANCE + FALLBACK_HYSTERESIS : MIN_DISTANCE;
    const pose = desiredPose(f, this.angles.yaw, this.angles.pitch, solids, minDistance);
    this.throughWall = pose.throughWall;
    if (first) {
      this.distance = pose.distance;
      this.pitch = pose.pitch;
    } else {
      this.distance = smoothDistance(this.distance, pose.distance, dt);
      // allontanarsi dall'inclinazione voluta (per evitare un muro) è rapido, tornarci è lento
      const wanted = this.angles.pitch;
      const returning = Math.abs(pose.pitch - wanted) < Math.abs(this.pitch - wanted);
      const rate = returning ? 3 : 10;
      this.pitch += (pose.pitch - this.pitch) * (1 - Math.exp(-rate * step));
    }
    const d = cameraOffsetDir(this.angles.yaw, this.pitch);
    this.camera.position.set(
      f.x + d.x * this.distance,
      f.y + d.y * this.distance,
      f.z + d.z * this.distance,
    );
    this.camera.lookAt(f.x, f.y, f.z);
  }
}
