import { describe, expect, it } from 'vitest';
import {
  DEAD_ZONE,
  TouchTracker,
  applyDeadZone,
  assignTouch,
  isWalking,
  mergeFrames,
  neutralFrame,
} from '../src/input/logic';
import { KeyboardBackend } from '../src/input/keyboard';
import { GamepadBackend, readPad } from '../src/input/gamepad';

const W = 1000;

describe('zona morta e soglia camminata', () => {
  it('sotto la zona morta non si muove', () => {
    expect(applyDeadZone(DEAD_ZONE * 0.9, 0)).toEqual({ x: 0, y: 0 });
    expect(applyDeadZone(0.1, 0.1)).toEqual({ x: 0, y: 0 });
  });

  it('a leva piena il modulo è 1', () => {
    const v = applyDeadZone(0, 1);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
  });

  it('sotto 0,5 si cammina, da 0,5 in su si corre, fermo non cammina', () => {
    expect(isWalking(0.3, 0)).toBe(true);
    expect(isWalking(0.5, 0)).toBe(false);
    expect(isWalking(0, 0.9)).toBe(false);
    expect(isWalking(0, 0)).toBe(false);
  });
});

describe('fusione delle sorgenti', () => {
  it('pulsanti in OR, look sommato, vince il primo movimento', () => {
    const a = { ...neutralFrame(), moveX: 1, walk: true, lookX: 0.1 };
    const b = { ...neutralFrame(), moveY: 1, jump: true, lookX: 0.2, lookY: 0.3 };
    const c = { ...neutralFrame(), crouch: true };
    const m = mergeFrames([a, b, c]);
    expect(m.moveX).toBe(1);
    expect(m.moveY).toBe(0);
    expect(m.walk).toBe(true);
    expect(m.jump).toBe(true);
    expect(m.crouch).toBe(true);
    expect(m.lookX).toBeCloseTo(0.3);
    expect(m.lookY).toBeCloseTo(0.3);
  });

  it('senza sorgenti è neutro', () => {
    expect(mergeFrames([])).toEqual(neutralFrame());
  });
});

describe('assegnazione dei tocchi', () => {
  it('sinistra = joystick, destra = camera, pulsante = pulsante', () => {
    expect(assignTouch(100, W, false)).toBe('joystick');
    expect(assignTouch(900, W, false)).toBe('camera');
    expect(assignTouch(900, W, true)).toBe('button');
  });

  it('un tocco a sinistra muove il personaggio, uno a destra la camera', () => {
    const t = new TouchTracker(60);
    expect(t.down(1, 100, 500, W, null)).toBe('joystick');
    expect(t.down(2, 800, 300, W, null)).toBe('camera');
    t.move(1, 100, 440); // su di un raggio = avanti
    t.move(2, 840, 320);
    const f = t.sample();
    expect(f.moveY).toBeCloseTo(1);
    expect(f.moveX).toBeCloseTo(0);
    expect(f.lookX).toBeCloseTo(40 * 0.005);
    expect(f.lookY).toBeCloseTo(20 * 0.005);
    // il look è consegnato una volta sola
    expect(t.sample().lookX).toBe(0);
  });

  it('tre tocchi insieme (joystick + camera + Salta) non interferiscono', () => {
    const t = new TouchTracker(60);
    t.down(1, 100, 500, W, null);
    t.down(2, 800, 300, W, null);
    expect(t.down(3, 900, 900, W, 'jump')).toBe('button');
    t.move(1, 160, 500);
    t.move(2, 810, 300);
    const f = t.sample();
    expect(f.jump).toBe(true);
    expect(f.crouch).toBe(false);
    expect(f.moveX).toBeCloseTo(1);
    expect(f.lookX).toBeCloseTo(10 * 0.005);
    // rilasciare Salta non tocca joystick né camera
    t.up(3);
    t.move(1, 160, 500);
    const g = t.sample();
    expect(g.jump).toBe(false);
    expect(g.moveX).toBeCloseTo(1);
  });

  it('un secondo dito nella stessa zona è ignorato', () => {
    const t = new TouchTracker();
    expect(t.down(1, 100, 100, W, null)).toBe('joystick');
    expect(t.down(2, 200, 100, W, null)).toBeNull();
    t.up(2);
    expect(t.joystickOrigin).toEqual({ x: 100, y: 100 });
  });

  it('pointercancel rilascia joystick e pulsante', () => {
    const t = new TouchTracker(60);
    t.down(1, 100, 500, W, null);
    t.down(3, 900, 900, W, 'crouch');
    t.move(1, 160, 500);
    expect(t.sample().crouch).toBe(true);
    t.up(1);
    t.up(3);
    const f = t.sample();
    expect(f.moveX).toBe(0);
    expect(f.moveY).toBe(0);
    expect(f.crouch).toBe(false);
    expect(t.joystickOrigin).toBeNull();
  });

  it('reset (blur / visibilitychange) azzera tutti i tocchi', () => {
    const t = new TouchTracker(60);
    t.down(1, 100, 500, W, null);
    t.down(2, 800, 300, W, null);
    t.down(3, 900, 900, W, 'jump');
    t.move(1, 160, 500);
    t.move(2, 850, 300);
    t.reset();
    expect(t.sample()).toEqual(neutralFrame());
  });
});

function fakeWindow(): Window {
  return new EventTarget() as unknown as Window;
}

function key(target: Window, type: 'keydown' | 'keyup', code: string): void {
  const e = Object.assign(new Event(type), { code, preventDefault: () => undefined });
  target.dispatchEvent(e);
}

describe('tastiera', () => {
  it('WASD, frecce, Spazio, C, Maiusc', () => {
    const w = fakeWindow();
    const kb = new KeyboardBackend(w);
    key(w, 'keydown', 'KeyW');
    key(w, 'keydown', 'ArrowRight');
    key(w, 'keydown', 'Space');
    key(w, 'keydown', 'KeyC');
    key(w, 'keydown', 'ShiftLeft');
    const f = kb.sample();
    expect(f.moveY).toBeGreaterThan(0);
    expect(f.moveX).toBeGreaterThan(0);
    expect(Math.hypot(f.moveX, f.moveY)).toBeCloseTo(1);
    expect(f.jump && f.crouch && f.walk).toBe(true);
    key(w, 'keyup', 'Space');
    expect(kb.sample().jump).toBe(false);
    kb.dispose();
  });

  it('blur azzera tutti i tasti', () => {
    const w = fakeWindow();
    const kb = new KeyboardBackend(w);
    key(w, 'keydown', 'KeyW');
    key(w, 'keydown', 'Space');
    key(w, 'keydown', 'ShiftLeft');
    w.dispatchEvent(new Event('blur'));
    expect(kb.sample()).toEqual(neutralFrame());
    kb.dispose();
  });
});

describe('gamepad', () => {
  const pad = (axes: number[], buttons: number[]): Gamepad =>
    ({
      connected: true,
      index: 0,
      axes,
      buttons: [0, 1].map((i) => ({ pressed: buttons.includes(i), value: 0 })),
    }) as unknown as Gamepad;

  it('leve, A salta, B accovacciati, camera con la velocità per il tempo', () => {
    const f = readPad(pad([0, -1, 1, 0], [0, 1]), 0.5);
    expect(f.moveY).toBeCloseTo(1);
    expect(f.jump).toBe(true);
    expect(f.crouch).toBe(true);
    expect(f.lookX).toBeGreaterThan(0);
    expect(readPad(pad([0, 0, 1, 0], []), 1).lookX).toBeCloseTo(
      2 * readPad(pad([0, 0, 1, 0], []), 0.5).lookX,
    );
  });

  it('nessun errore se si scollega o getGamepads lancia', () => {
    expect(new GamepadBackend(() => [null]).sample(0.016)).toEqual(neutralFrame());
    expect(new GamepadBackend(() => []).sample(0.016)).toEqual(neutralFrame());
    expect(
      new GamepadBackend(() => {
        throw new Error('x');
      }).sample(0.016),
    ).toEqual(neutralFrame());
  });
});
