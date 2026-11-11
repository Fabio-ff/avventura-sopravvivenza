import { LOOK_RAD_PER_PIXEL } from './logic';
import type { InputBackend, InputFrame } from './types';

export interface KeyMap {
  forward: string[];
  back: string[];
  left: string[];
  right: string[];
  jump: string[];
  crouch: string[];
  walk: string[];
}

/** WASD e frecce, Spazio salta, C accovacciati, Maiusc cammina. Usa KeyboardEvent.code. */
export const DEFAULT_KEY_MAP: KeyMap = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  crouch: ['KeyC'],
  walk: ['ShiftLeft', 'ShiftRight'],
};

/** Tastiera più mouse trascinato sul canvas per ruotare la camera. */
export class KeyboardBackend implements InputBackend {
  readonly kind = 'keyboard' as const;
  private readonly down = new Set<string>();
  private readonly mapped: Set<string>;
  private dragPointer: number | null = null;
  private lastX = 0;
  private lastY = 0;
  private lookX = 0;
  private lookY = 0;
  private element: HTMLElement | null = null;

  constructor(
    private readonly target: Window = window,
    private readonly map: KeyMap = DEFAULT_KEY_MAP,
  ) {
    this.mapped = new Set(Object.values(map).flat());
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  /** Collega il trascinamento del mouse a un elemento (il canvas). */
  attach(element: HTMLElement): void {
    this.element = element;
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointermove', this.onPointerMove);
    this.target.addEventListener('pointerup', this.onPointerEnd);
    this.target.addEventListener('pointercancel', this.onPointerEnd);
  }

  sample(): InputFrame {
    const x = (this.any(this.map.right) ? 1 : 0) - (this.any(this.map.left) ? 1 : 0);
    const y = (this.any(this.map.forward) ? 1 : 0) - (this.any(this.map.back) ? 1 : 0);
    const len = Math.hypot(x, y) || 1;
    const frame: InputFrame = {
      moveX: x / len,
      moveY: y / len,
      walk: this.any(this.map.walk),
      jump: this.any(this.map.jump),
      crouch: this.any(this.map.crouch),
      lookX: this.lookX,
      lookY: this.lookY,
    };
    this.lookX = 0;
    this.lookY = 0;
    return frame;
  }

  reset(): void {
    this.down.clear();
    this.dragPointer = null;
    this.lookX = 0;
    this.lookY = 0;
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
    this.target.removeEventListener('pointerup', this.onPointerEnd);
    this.target.removeEventListener('pointercancel', this.onPointerEnd);
    this.element?.removeEventListener('pointerdown', this.onPointerDown);
    this.element?.removeEventListener('pointermove', this.onPointerMove);
    this.element = null;
    this.reset();
  }

  private any(codes: string[]): boolean {
    return codes.some((c) => this.down.has(c));
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (!this.mapped.has(e.code)) return;
    e.preventDefault();
    this.down.add(e.code);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
  };

  private readonly onBlur = (): void => this.reset();

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType !== 'mouse' || this.dragPointer !== null) return;
    this.dragPointer = e.pointerId;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (e.pointerType !== 'mouse' || e.pointerId !== this.dragPointer) return;
    this.lookX += (e.clientX - this.lastX) * LOOK_RAD_PER_PIXEL;
    this.lookY += (e.clientY - this.lastY) * LOOK_RAD_PER_PIXEL;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private readonly onPointerEnd = (e: PointerEvent): void => {
    if (e.pointerId === this.dragPointer) this.dragPointer = null;
  };
}
