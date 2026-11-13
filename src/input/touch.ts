import { TouchTracker, type TouchButton } from './logic';
import type { InputBackend, InputFrame } from './types';
import './touch.css';

const BUTTONS: { name: TouchButton; label: string }[] = [
  { name: 'crouch', label: 'Giù' },
  { name: 'jump', label: 'Salta' },
];

/**
 * Joystick flottante a sinistra, trascinamento a destra per la camera, pulsanti Salta e Giù.
 * Il CSS mostra i controlli solo sui dispositivi touch. La logica è in `TouchTracker`.
 */
export class TouchBackend implements InputBackend {
  readonly kind = 'touch' as const;
  readonly element: HTMLDivElement;

  private readonly joystick: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly buttonEls = new Map<TouchButton, HTMLDivElement>();
  private readonly tracker: TouchTracker;
  private readonly radius: number;

  constructor(parent: HTMLElement, options: { joystickRadius?: number } = {}) {
    this.radius = options.joystickRadius ?? 60;
    this.tracker = new TouchTracker(this.radius);

    this.element = document.createElement('div');
    this.element.className = 'touch-controls';

    this.joystick = document.createElement('div');
    this.joystick.className = 'touch-joystick';
    this.joystick.hidden = true;
    this.knob = document.createElement('div');
    this.knob.className = 'touch-joystick-knob';
    this.joystick.appendChild(this.knob);

    const bar = document.createElement('div');
    bar.className = 'touch-buttons';
    for (const { name, label } of BUTTONS) {
      const el = document.createElement('div');
      el.className = 'touch-button';
      el.dataset.button = name;
      el.setAttribute('role', 'button');
      el.textContent = label;
      bar.appendChild(el);
      this.buttonEls.set(name, el);
    }

    this.element.append(this.joystick, bar);
    parent.appendChild(this.element);

    this.element.addEventListener('pointerdown', this.onPointerDown);
    this.element.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerEnd);
    window.addEventListener('pointercancel', this.onPointerEnd);
  }

  sample(): InputFrame {
    return this.tracker.sample();
  }

  reset(): void {
    this.tracker.reset();
    this.joystick.hidden = true;
    for (const el of this.buttonEls.values()) el.classList.remove('is-pressed');
  }

  dispose(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerEnd);
    window.removeEventListener('pointercancel', this.onPointerEnd);
    this.tracker.reset();
    this.element.remove();
  }

  private buttonFromTarget(target: EventTarget | null): TouchButton | null {
    if (!(target instanceof HTMLElement)) return null;
    const el = target.closest<HTMLElement>('.touch-button');
    return (el?.dataset.button as TouchButton | undefined) ?? null;
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse') return;
    const rect = this.element.getBoundingClientRect();
    const button = this.buttonFromTarget(e.target);
    const role = this.tracker.down(
      e.pointerId,
      e.clientX - rect.left,
      e.clientY - rect.top,
      rect.width,
      button,
    );
    if (!role) return;
    e.preventDefault();
    if (role === 'button' && button) this.buttonEls.get(button)?.classList.add('is-pressed');
    if (role === 'joystick') {
      this.joystick.style.left = `${e.clientX - rect.left}px`;
      this.joystick.style.top = `${e.clientY - rect.top}px`;
      this.knob.style.transform = 'translate(0px, 0px)';
      this.joystick.hidden = false;
    }
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    const rect = this.element.getBoundingClientRect();
    this.tracker.move(e.pointerId, e.clientX - rect.left, e.clientY - rect.top);
    if (this.tracker.joystickOrigin) {
      const v = this.tracker.joystickVector();
      this.knob.style.transform = `translate(${v.x * this.radius}px, ${-v.y * this.radius}px)`;
    }
  };

  private readonly onPointerEnd = (e: PointerEvent): void => {
    this.tracker.up(e.pointerId);
    if (!this.tracker.joystickOrigin) this.joystick.hidden = true;
    for (const [name, el] of this.buttonEls) {
      if (!this.tracker.isPressed(name)) el.classList.remove('is-pressed');
    }
  };
}
