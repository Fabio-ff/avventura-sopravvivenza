// Camera in terza persona: la parte pura (angoli, distanza) è testata; `FollowCamera` la applica a three.
import type { PerspectiveCamera } from 'three';
import { angleDelta } from '../app/angles';
import { segmentHitsSolids } from '../world/collide';
import type { Solid, Vec3 } from '../world/solids';

export const CAMERA_DISTANCE = 4.5;
export const MIN_PITCH = (-10 * Math.PI) / 180;
export const MAX_PITCH = (60 * Math.PI) / 180;
export const DEFAULT_PITCH = (20 * Math.PI) / 180;
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

/** Distanza voluta: 4,5 m, accorciata se una scatola `fisso` sta tra il punto inquadrato e la camera. */
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
  return Math.min(max, Math.max(0, t * max - WALL_MARGIN));
}

/**
 * Distanza e inclinazione da usare: se il muro costringerebbe sotto `MIN_DISTANCE` (camera nella
 * testa) si alza la camera, fino a `MAX_PITCH`, invece di avvicinarla.
 */
export function desiredPose(
  focus: Vec3,
  yaw: number,
  pitch: number,
  solids: readonly Solid[],
): { distance: number; pitch: number } {
  const raw = desiredDistance(focus, yaw, pitch, solids);
  if (raw >= MIN_DISTANCE) return { distance: raw, pitch };
  const lifted = desiredDistance(focus, yaw, MAX_PITCH, solids);
  return { distance: Math.max(MIN_DISTANCE, lifted), pitch: MAX_PITCH };
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

  constructor(private readonly camera: PerspectiveCamera) {}

  /** Il punto inquadrato si sposta subito alla prossima `update` (partenza, teletrasporto). */
  snap(): void {
    this.focus = null;
  }

  update(target: Vec3, solids: readonly Solid[], dt: number, crouching = false): void {
    const step = Math.max(0, dt);
    // da accovacciati si inquadra più in basso, così il personaggio resta visibile sotto l'architrave
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
    const pose = desiredPose(f, this.angles.yaw, this.angles.pitch, solids);
    if (first) {
      this.distance = pose.distance;
      this.pitch = pose.pitch;
    } else {
      this.distance = smoothDistance(this.distance, pose.distance, dt);
      // alzare la camera è rapido, tornare giù è lento
      const rate = pose.pitch > this.pitch ? 10 : 3;
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
