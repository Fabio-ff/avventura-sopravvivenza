import { describe, expect, it } from 'vitest';
import { JumpLatch } from '../src/input/jump-latch';
import { createPlayer, stepPlayer, type PlayerInput } from '../src/player/controller';
import { profileFor } from '../src/player/profiles';
import { box } from '../src/world/solids';

describe('JumpLatch', () => {
  it('una pressione in un frame senza passi arriva al passo del frame dopo', () => {
    const l = new JumpLatch();
    l.feed(true); // frame senza passi
    l.feed(false); // rilasciato prima di un passo
    expect(l.value()).toBe(true);
    l.consume();
    expect(l.value()).toBe(false);
  });

  it('tenuto premuto resta vero', () => {
    const l = new JumpLatch();
    l.feed(true);
    l.consume();
    expect(l.value()).toBe(true);
    l.feed(false);
    expect(l.value()).toBe(false);
  });

  it('con più passi nello stesso frame il salto è uno solo', () => {
    const solids = [box(1, 'fisso', { x: -20, y: -1, z: -20 }, { x: 20, y: 0, z: 20 })];
    const state = createPlayer({ x: 0, y: 0, z: 0 });
    const profile = profileFor('golden');
    const none: PlayerInput = { moveX: 0, moveY: 0, walk: false, jump: false, crouch: false };
    for (let i = 0; i < 10; i++) stepPlayer(state, none, 0, profile, solids, 1 / 60);
    const l = new JumpLatch();
    l.feed(true);
    l.feed(false);
    let jumps = 0;
    let wasGrounded = state.grounded;
    for (let i = 0; i < 4; i++) {
      stepPlayer(state, { ...none, jump: l.value() }, 0, profile, solids, 1 / 60);
      l.consume();
      if (wasGrounded && !state.grounded && state.velocity.y > 0) jumps++;
      wasGrounded = state.grounded;
    }
    expect(jumps).toBe(1);
    expect(state.position.y).toBeGreaterThan(0);
  });
});
