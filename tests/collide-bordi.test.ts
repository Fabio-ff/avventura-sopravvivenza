import { describe, expect, it } from 'vitest';
import { moveBody, segmentHitsSolids, type Body } from '../src/world/collide';
import { box } from '../src/world/solids';

const body = (x: number, y: number, z: number, height = 1.8): Body => ({
  position: { x, y, z },
  radius: 0.35,
  height,
});

describe('segmentHitsSolids sulle facce', () => {
  const wall = box(2, 'fisso', { x: 1, y: 0, z: -1 }, { x: 2, y: 2, z: 1 });
  it('parte esattamente su una faccia ed entra: 0', () => {
    expect(segmentHitsSolids({ x: 1, y: 1, z: 0 }, { x: 4, y: 1, z: 0 }, [wall])).toBe(0);
  });
  it('parte su una faccia e si allontana: null', () => {
    expect(segmentHitsSolids({ x: 2, y: 1, z: 0 }, { x: 4, y: 1, z: 0 }, [wall])).toBeNull();
  });
});

describe('gancio terreno, masso sul bordo, discesa', () => {
  it('il terreno vale come suolo fisso', () => {
    const r = moveBody(body(0, 3, 0), { x: 0, y: -5, z: 0 }, [], {
      canPush: false,
      groundHeightAt: () => 0.5,
    });
    expect(r.position.y).toBeCloseTo(0.5, 5);
    expect(r.grounded).toBe(true);
  });

  it('il terreno troppo ripido blocca, quello basso si sale', () => {
    const steep = moveBody(body(0.5, 0, 0), { x: 1, y: -0.01, z: 0 }, [], {
      canPush: false,
      groundHeightAt: (x) => (x > 1 ? 2 : 0),
    });
    expect(steep.position.x).toBeLessThan(1);
    const low = moveBody(body(0.5, 0, 0), { x: 1, y: -0.01, z: 0 }, [], {
      canPush: false,
      groundHeightAt: (x) => (x > 1 ? 0.2 : 0),
    });
    expect(low.position.y).toBeCloseTo(0.2, 5);
  });

  it('il masso si ferma a filo del bordo della lastra', () => {
    const slab = box(1, 'fisso', { x: -10, y: -1, z: -50 }, { x: 6, y: 0, z: 50 });
    const rock = box(3, 'spingibile', { x: 2, y: 0, z: -0.6 }, { x: 3.2, y: 1.5, z: 0.6 });
    let p = { x: 0.5, y: 0, z: 0 };
    for (let i = 0; i < 400; i++) {
      p = moveBody(
        { position: p, radius: 0.35, height: 1.8 },
        { x: 0.05, y: -0.01, z: 0 },
        [slab, rock],
        { canPush: true },
      ).position;
    }
    expect(rock.max.x).toBeCloseTo(6, 5);
    expect(p.x).toBeCloseTo(rock.min.x - 0.35, 5);
  });

  it('snapDown aggancia le discese piccole ma non le grandi', () => {
    const hi = box(1, 'fisso', { x: -10, y: -1, z: -5 }, { x: 0, y: 0.3, z: 5 });
    const lo = box(2, 'fisso', { x: 0, y: -1, z: -5 }, { x: 10, y: 0, z: 5 });
    const small = moveBody(body(-0.6, 0.3, 0), { x: 1, y: -0.004, z: 0 }, [hi, lo], {
      canPush: false,
      snapDown: 0.35,
    });
    expect(small.grounded).toBe(true);
    expect(small.position.y).toBeCloseTo(0, 5);
    const deep = box(3, 'fisso', { x: 0, y: -3, z: -5 }, { x: 10, y: -2, z: 5 });
    const big = moveBody(body(-0.6, 0.3, 0), { x: 1, y: -0.004, z: 0 }, [hi, deep], {
      canPush: false,
      snapDown: 0.35,
    });
    expect(big.grounded).toBe(false);
  });
});
