import { PAD_LOOK_SPEED, applyDeadZone, isWalking, neutralFrame } from './logic';
import type { InputBackend, InputFrame } from './types';

export type PadSource = () => readonly (Gamepad | null)[];

export const defaultPadSource: PadSource = () =>
  typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
    ? navigator.getGamepads()
    : [];

/** Mappatura standard: A salta, B accovacciati. */
export const B = { a: 0, b: 1 } as const;

export function held(pad: Gamepad, i: number): boolean {
  const b = pad.buttons[i];
  return !!b && (b.pressed || b.value > 0.5);
}

/** Legge un gamepad in un `InputFrame`. `dt` in secondi, per la velocità della camera. */
export function readPad(pad: Gamepad, dt: number): InputFrame {
  const move = applyDeadZone(pad.axes[0] ?? 0, -(pad.axes[1] ?? 0));
  const look = applyDeadZone(pad.axes[2] ?? 0, pad.axes[3] ?? 0);
  return {
    moveX: move.x,
    moveY: move.y,
    walk: isWalking(move.x, move.y),
    jump: held(pad, B.a),
    crouch: held(pad, B.b),
    lookX: look.x * PAD_LOOK_SPEED * dt,
    lookY: look.y * PAD_LOOK_SPEED * dt,
  };
}

/** Gamepad interrogato a ogni lettura; se si scollega torna neutro, senza errori. */
export class GamepadBackend implements InputBackend {
  readonly kind = 'gamepad' as const;

  constructor(private readonly getPads: PadSource = defaultPadSource) {}

  sample(dt: number): InputFrame {
    let pads: readonly (Gamepad | null)[];
    try {
      pads = this.getPads();
    } catch {
      return neutralFrame();
    }
    const pad = pads.find((p) => p && p.connected !== false);
    return pad ? readPad(pad, dt) : neutralFrame();
  }

  reset(): void {}

  dispose(): void {}
}
