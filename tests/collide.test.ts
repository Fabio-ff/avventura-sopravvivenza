import { describe, expect, it } from 'vitest';
import { moveBody, segmentHitsSolids, type Body } from '../src/world/collide';
import { box } from '../src/world/solids';

const body = (x: number, y: number, z: number, height = 1.8): Body => ({
  position: { x, y, z },
  radius: 0.35,
  height,
});
const floor = box(1, 'fisso', { x: -50, y: -1, z: -50 }, { x: 50, y: 0, z: 50 });
const opts = { canPush: false };

describe('moveBody', () => {
  it('atterra su una lastra anche dopo una caduta da 30 m', () => {
    const thin = box(2, 'fisso', { x: -5, y: -0.05, z: -5 }, { x: 5, y: 0, z: 5 });
    const b = body(0, 30, 0);
    let grounded = false;
    for (let i = 0; i < 400 && !grounded; i++) {
      const vy = -Math.sqrt(2 * 25 * Math.max(0, 30 - b.position.y)) - 1;
      const r = moveBody(b, { x: 0, y: vy / 60, z: 0 }, [thin], opts);
      b.position = r.position;
      grounded = r.grounded;
    }
    expect(grounded).toBe(true);
    expect(b.position.y).toBeCloseTo(0, 5);
  });

  it('non attraversa una lastra sottile con un delta enorme', () => {
    const thin = box(2, 'fisso', { x: -5, y: -0.02, z: -5 }, { x: 5, y: 0, z: 5 });
    const r = moveBody(body(0, 3, 0), { x: 0, y: -10, z: 0 }, [thin], opts);
    expect(r.position.y).toBeCloseTo(0, 5);
    expect(r.grounded).toBe(true);
  });

  it('sale da solo un gradino di 0,3 m ma non uno di 0,8 m', () => {
    const s03 = box(2, 'fisso', { x: 1, y: 0, z: -5 }, { x: 5, y: 0.3, z: 5 });
    let r = moveBody(body(0.5, 0, 0), { x: 0.3, y: -0.01, z: 0 }, [floor, s03], opts);
    expect(r.position.y).toBeCloseTo(0.3, 5);
    expect(r.position.x).toBeCloseTo(0.8, 5);
    const s08 = box(2, 'fisso', { x: 1, y: 0, z: -5 }, { x: 5, y: 0.8, z: 5 });
    r = moveBody(body(0.5, 0, 0), { x: 0.3, y: -0.01, z: 0 }, [floor, s08], opts);
    expect(r.position.y).toBeCloseTo(0, 5);
    expect(r.position.x).toBeCloseTo(1 - 0.35, 5);
  });

  it('in aria non sale i gradini', () => {
    const s03 = box(2, 'fisso', { x: 1, y: 0, z: -5 }, { x: 5, y: 0.3, z: 5 });
    const r = moveBody(body(0.5, 0.1, 0), { x: 0.3, y: 0, z: 0 }, [s03], opts);
    expect(r.position.y).toBeCloseTo(0.1, 5);
    expect(r.position.x).toBeCloseTo(0.65, 5);
  });

  it('scivola lungo un muro muovendosi in diagonale', () => {
    const wall = box(2, 'fisso', { x: 1, y: 0, z: -5 }, { x: 2, y: 3, z: 5 });
    const r = moveBody(body(0.6, 0, 0), { x: 0.5, y: -0.01, z: 0.5 }, [floor, wall], opts);
    expect(r.position.x).toBeCloseTo(0.65, 5);
    expect(r.position.z).toBeCloseTo(0.5, 5);
  });

  it('batte la testa contro un soffitto', () => {
    const ceil = box(2, 'fisso', { x: -5, y: 1.2, z: -5 }, { x: 5, y: 2, z: 5 });
    const r = moveBody(body(0, 0, 0, 1.0), { x: 0, y: 0.5, z: 0 }, [floor, ceil], opts);
    expect(r.hitCeiling).toBe(true);
    expect(r.position.y).toBeCloseTo(0.2, 5);
  });

  it('il masso si sposta solo con canPush', () => {
    const rock = box(3, 'spingibile', { x: 1, y: 0, z: -0.6 }, { x: 2.2, y: 1.2, z: 0.6 });
    const solids = [floor, rock];
    let r = moveBody(body(0.5, 0, 0), { x: 0.2, y: -0.01, z: 0 }, solids, opts);
    expect(rock.min.x).toBe(1);
    expect(r.pushed).toEqual([]);
    r = moveBody(body(0.5, 0, 0), { x: 0.2, y: -0.01, z: 0 }, solids, { canPush: true });
    expect(rock.min.x).toBeCloseTo(1.05, 5);
    expect(r.pushed).toEqual([3]);
    expect(r.position.x).toBeCloseTo(0.7, 5);
  });

  it('il masso si ferma contro un muro e blocca il giocatore', () => {
    const rock = box(3, 'spingibile', { x: 1, y: 0, z: -0.6 }, { x: 2.2, y: 1.2, z: 0.6 });
    const wall = box(4, 'fisso', { x: 2.5, y: 0, z: -5 }, { x: 3, y: 3, z: 5 });
    const solids = [floor, rock, wall];
    let p = { x: 0.5, y: 0, z: 0 };
    for (let i = 0; i < 120; i++) {
      p = moveBody(
        { position: p, radius: 0.35, height: 1.8 },
        { x: 0.05, y: -0.01, z: 0 },
        solids,
        {
          canPush: true,
        },
      ).position;
    }
    expect(rock.max.x).toBeCloseTo(2.5, 5);
    expect(p.x).toBeCloseTo(rock.min.x - 0.35, 5);
  });

  it('segnala il pericolo senza bloccare', () => {
    const trap = box(5, 'pericolo', { x: 1, y: 0, z: -1 }, { x: 2, y: 1, z: 1 });
    const r = moveBody(body(0.5, 0, 0), { x: 1.5, y: -0.01, z: 0 }, [floor, trap], opts);
    expect(r.hazardId).toBe(5);
    expect(r.position.x).toBeCloseTo(2, 5);
    const lontano = moveBody(body(-3, 0, 0), { x: 0.1, y: -0.01, z: 0 }, [floor, trap], opts);
    expect(lontano.hazardId).toBeNull();
  });
});

describe('segmentHitsSolids', () => {
  const wall = box(2, 'fisso', { x: 1, y: 0, z: -1 }, { x: 2, y: 2, z: 1 });
  it('restituisce la frazione del primo impatto', () => {
    expect(segmentHitsSolids({ x: 0, y: 1, z: 0 }, { x: 4, y: 1, z: 0 }, [wall])).toBeCloseTo(
      0.25,
      6,
    );
  });
  it('null se il segmento è libero o il solido non è fisso', () => {
    expect(segmentHitsSolids({ x: 0, y: 5, z: 0 }, { x: 4, y: 5, z: 0 }, [wall])).toBeNull();
    const trap = box(3, 'pericolo', wall.min, wall.max);
    expect(segmentHitsSolids({ x: 0, y: 1, z: 0 }, { x: 4, y: 1, z: 0 }, [trap])).toBeNull();
  });
});
