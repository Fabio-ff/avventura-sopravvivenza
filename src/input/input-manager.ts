import { KeyboardBackend } from './keyboard';
import { GamepadBackend } from './gamepad';
import { TouchBackend } from './touch';
import { mergeFrames } from './logic';
import type { InputBackend, InputFrame } from './types';

/**
 * Fonde tastiera/mouse, gamepad e touch in un solo `InputFrame` per lettura.
 * Con scheda in background o finestra senza fuoco azzera tutto.
 */
export class InputManager {
  private backends: InputBackend[] = [];
  private last = 0;
  private attached = false;

  attach(element: HTMLElement): void {
    if (this.attached) return;
    this.attached = true;
    const keyboard = new KeyboardBackend(window);
    keyboard.attach(element);
    this.backends = [
      keyboard,
      new GamepadBackend(),
      new TouchBackend(element.parentElement ?? document.body),
    ];
    this.last = performance.now();
    window.addEventListener('blur', this.onLost);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  read(): InputFrame {
    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    return mergeFrames(this.backends.map((b) => b.sample(dt)));
  }

  dispose(): void {
    if (!this.attached) return;
    window.removeEventListener('blur', this.onLost);
    document.removeEventListener('visibilitychange', this.onVisibility);
    for (const b of this.backends) b.dispose();
    this.backends = [];
    this.attached = false;
  }

  private resetAll(): void {
    for (const b of this.backends) b.reset();
  }

  private readonly onLost = (): void => this.resetAll();

  private readonly onVisibility = (): void => {
    if (document.hidden) this.resetAll();
    this.last = performance.now();
  };
}
