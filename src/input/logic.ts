import type { InputFrame } from './types';

/** Zona morta radiale: sotto questo modulo la leva conta come ferma. */
export const DEAD_ZONE = 0.2;
/** Sotto questo modulo della leva (dopo la zona morta) si cammina, da qui in su si corre. */
export const WALK_THRESHOLD = 0.5;
/** Radianti per pixel trascinato (mouse e dito). */
export const LOOK_RAD_PER_PIXEL = 0.005;
/** Velocità angolare massima della leva destra, rad/s. */
export const PAD_LOOK_SPEED = 2.8;

export function neutralFrame(): InputFrame {
  return { moveX: 0, moveY: 0, walk: false, jump: false, crouch: false, lookX: 0, lookY: 0 };
}

/** Zona morta radiale, riscalata perché la leva raggiunga comunque il modulo 1. */
export function applyDeadZone(x: number, y: number): { x: number; y: number } {
  const len = Math.hypot(x, y);
  if (len <= DEAD_ZONE) return { x: 0, y: 0 };
  const scaled = Math.min(1, (len - DEAD_ZONE) / (1 - DEAD_ZONE));
  return { x: (x / len) * scaled, y: (y / len) * scaled };
}

/** Camminata se la leva è mossa ma il modulo è sotto 0,5. */
export function isWalking(x: number, y: number): boolean {
  const len = Math.hypot(x, y);
  return len > 0 && len < WALK_THRESHOLD;
}

/** Fonde le sorgenti: pulsanti in OR, look sommato, vince il primo movimento diverso da zero. */
export function mergeFrames(frames: readonly InputFrame[]): InputFrame {
  const out = neutralFrame();
  let moving = false;
  for (const f of frames) {
    if (!moving && (f.moveX !== 0 || f.moveY !== 0)) {
      out.moveX = f.moveX;
      out.moveY = f.moveY;
      out.walk = f.walk;
      moving = true;
    }
    out.jump ||= f.jump;
    out.crouch ||= f.crouch;
    out.lookX += f.lookX;
    out.lookY += f.lookY;
  }
  return out;
}

export type TouchRole = 'joystick' | 'camera' | 'button';
export type TouchButton = 'jump' | 'crouch';

/**
 * Ruolo di un nuovo tocco: su un pulsante è un pulsante, altrimenti metà sinistra = joystick,
 * metà destra = camera. `x` è relativo al bordo sinistro dell'area di gioco.
 */
export function assignTouch(x: number, width: number, onButton: boolean): TouchRole {
  if (onButton) return 'button';
  return x < width / 2 ? 'joystick' : 'camera';
}

/**
 * Stato dei tocchi, senza DOM. Ogni tocco è identificato da `pointerId`, quindi joystick,
 * camera e pulsanti non si disturbano a vicenda.
 */
export class TouchTracker {
  private joy: { id: number; ox: number; oy: number; x: number; y: number } | null = null;
  private cam: { id: number; x: number; y: number } | null = null;
  private readonly buttons = new Map<number, TouchButton>();
  private lookX = 0;
  private lookY = 0;

  constructor(private readonly radius = 60) {}

  /** Restituisce il ruolo assegnato, o null se il tocco è ignorato (ruolo già occupato). */
  down(
    id: number,
    x: number,
    y: number,
    width: number,
    button: TouchButton | null,
  ): TouchRole | null {
    if (this.has(id)) return null;
    const role = assignTouch(x, width, button !== null);
    if (role === 'button' && button) {
      this.buttons.set(id, button);
      return role;
    }
    if (role === 'joystick' && !this.joy) {
      this.joy = { id, ox: x, oy: y, x, y };
      return role;
    }
    if (role === 'camera' && !this.cam) {
      this.cam = { id, x, y };
      return role;
    }
    return null;
  }

  move(id: number, x: number, y: number): void {
    if (this.joy?.id === id) {
      this.joy.x = x;
      this.joy.y = y;
    } else if (this.cam?.id === id) {
      this.lookX += (x - this.cam.x) * LOOK_RAD_PER_PIXEL;
      this.lookY += (y - this.cam.y) * LOOK_RAD_PER_PIXEL;
      this.cam.x = x;
      this.cam.y = y;
    }
  }

  /** Fine o annullamento (`pointerup` / `pointercancel`) di un tocco. */
  up(id: number): void {
    if (this.joy?.id === id) this.joy = null;
    if (this.cam?.id === id) this.cam = null;
    this.buttons.delete(id);
  }

  reset(): void {
    this.joy = null;
    this.cam = null;
    this.buttons.clear();
    this.lookX = 0;
    this.lookY = 0;
  }

  get joystickOrigin(): { x: number; y: number } | null {
    return this.joy ? { x: this.joy.ox, y: this.joy.oy } : null;
  }

  /** Spostamento della leva normalizzato nel cerchio unitario, y positivo = avanti. */
  joystickVector(): { x: number; y: number } {
    if (!this.joy) return { x: 0, y: 0 };
    const dx = (this.joy.x - this.joy.ox) / this.radius;
    const dy = (this.joy.y - this.joy.oy) / this.radius;
    const len = Math.hypot(dx, dy);
    const k = len > 1 ? 1 / len : 1;
    return { x: dx * k, y: -dy * k };
  }

  isPressed(button: TouchButton): boolean {
    for (const b of this.buttons.values()) if (b === button) return true;
    return false;
  }

  /** Stato corrente; il look accumulato viene consegnato e azzerato. */
  sample(): InputFrame {
    const raw = this.joystickVector();
    const v = applyDeadZone(raw.x, raw.y);
    const f: InputFrame = {
      moveX: v.x,
      moveY: v.y,
      walk: isWalking(v.x, v.y),
      jump: this.isPressed('jump'),
      crouch: this.isPressed('crouch'),
      lookX: this.lookX,
      lookY: this.lookY,
    };
    this.lookX = 0;
    this.lookY = 0;
    return f;
  }

  private has(id: number): boolean {
    return this.joy?.id === id || this.cam?.id === id || this.buttons.has(id);
  }
}
