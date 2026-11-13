// Camera in terza persona: la parte pura (angoli, distanza) è testata; `FollowCamera` la applica a three.
import type { PerspectiveCamera } from 'three';
import { approachAngle } from '../app/angles';
import { segmentHitsSolids } from '../world/collide';
import type { Solid, Vec3 } from '../world/solids';

export const CAMERA_DISTANCE = 6;
export const MIN_PITCH = (-10 * Math.PI) / 180;
export const MAX_PITCH = (60 * Math.PI) / 180;
export const DEFAULT_PITCH = (20 * Math.PI) / 180;
/** Secondi senza comandi di camera, in movimento, prima del riallineamento. */
export const REALIGN_DELAY = 1.5;
const REALIGN_RATE = 2.5;
/** Margine tenuto tra camera e muro, in metri. */
export const WALL_MARGIN = 0.35;
export const MIN_DISTANCE = 0.8;
/** Altezza del punto inquadrato sopra i piedi. */
export const FOCUS_HEIGHT = 1.4;

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
 * `facing` è la direzione del personaggio, `moving` vero se si sta muovendo.
 */
export function updateCameraAngles(
  a: CameraAngles,
  lookX: number,
  lookY: number,
  moving: boolean,
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
  if (moving && a.idle >= REALIGN_DELAY) {
    // dietro al personaggio: la camera sta dalla parte opposta alla direzione di marcia
    a.yaw = approachAngle(a.yaw, facing + Math.PI, REALIGN_RATE, dt);
  }
}

/** Direzione dal punto inquadrato verso la camera (vettore unitario). */
export function cameraOffsetDir(yaw: number, pitch: number): Vec3 {
  const c = Math.cos(pitch);
  return { x: Math.sin(yaw) * c, y: Math.sin(pitch), z: Math.cos(yaw) * c };
}

/** Distanza voluta: 6 m, accorciata se una scatola `fisso` sta tra il punto inquadrato e la camera. */
export function desiredDistance(
  focus: Vec3,
  yaw: number,
  pitch: number,
  solids: readonly Solid[],
  max = CAMERA_DISTANCE,
): number {
  const d = cameraOffsetDir(yaw, pitch);
  const to = { x: focus.x + d.x * max, y: focus.y + d.y * max, z: focus.z + d.z * max };
  const t = segmentHitsSolids(focus, to, solids);
  if (t === null) return max;
  return Math.min(max, Math.max(MIN_DISTANCE, t * max - WALL_MARGIN));
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

  constructor(private readonly camera: PerspectiveCamera) {}

  /** Il punto inquadrato si sposta subito alla prossima `update` (partenza, teletrasporto). */
  snap(): void {
    this.focus = null;
  }

  update(target: Vec3, solids: readonly Solid[], dt: number): void {
    const want = { x: target.x, y: target.y + FOCUS_HEIGHT, z: target.z };
    if (!this.focus) {
      this.focus = want;
      this.distance = desiredDistance(want, this.angles.yaw, this.angles.pitch, solids);
    } else {
      const k = 1 - Math.exp(-12 * Math.max(0, dt));
      this.focus.x += (want.x - this.focus.x) * k;
      this.focus.y += (want.y - this.focus.y) * (1 - Math.exp(-6 * Math.max(0, dt)));
      this.focus.z += (want.z - this.focus.z) * k;
    }
    const f = this.focus;
    const wanted = desiredDistance(f, this.angles.yaw, this.angles.pitch, solids);
    this.distance = smoothDistance(this.distance, wanted, dt);
    const d = cameraOffsetDir(this.angles.yaw, this.angles.pitch);
    this.camera.position.set(
      f.x + d.x * this.distance,
      f.y + d.y * this.distance,
      f.z + d.z * this.distance,
    );
    this.camera.lookAt(f.x, f.y, f.z);
  }
}
