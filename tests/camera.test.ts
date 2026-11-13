import { describe, expect, it } from 'vitest';
import {
  CAMERA_DISTANCE,
  MAX_PITCH,
  MIN_PITCH,
  REALIGN_DELAY,
  createCameraAngles,
  desiredDistance,
  smoothDistance,
  updateCameraAngles,
} from '../src/camera/follow-camera';
import { box } from '../src/world/solids';

describe('angoli della camera', () => {
  it('trascinare a destra gira la visuale a destra (yaw cala), in alto alza lo sguardo', () => {
    const a = createCameraAngles();
    updateCameraAngles(a, 0.2, 0, false, 0, 0.016);
    expect(a.yaw).toBeCloseTo(-0.2);
    const p0 = a.pitch;
    updateCameraAngles(a, 0, -0.1, false, 0, 0.016);
    expect(a.pitch).toBeLessThan(p0);
  });

  it("limita l'inclinazione tra -10 e 60 gradi", () => {
    const a = createCameraAngles();
    updateCameraAngles(a, 0, 10, false, 0, 0.016);
    expect(a.pitch).toBe(MAX_PITCH);
    updateCameraAngles(a, 0, -10, false, 0, 0.016);
    expect(a.pitch).toBe(MIN_PITCH);
    expect((MAX_PITCH * 180) / Math.PI).toBeCloseTo(60);
    expect((MIN_PITCH * 180) / Math.PI).toBeCloseTo(-10);
  });

  it('non si riallinea prima di 1,5 s né da fermo', () => {
    const a = createCameraAngles(1);
    for (let t = 0; t < REALIGN_DELAY - 0.1; t += 0.016)
      updateCameraAngles(a, 0, 0, true, 0, 0.016);
    expect(a.yaw).toBe(1);
    const b = createCameraAngles(1);
    for (let t = 0; t < 5; t += 0.016) updateCameraAngles(b, 0, 0, false, 0, 0.016);
    expect(b.yaw).toBe(1);
  });

  it('dopo 1,5 s in movimento si riallinea dietro al personaggio', () => {
    // il personaggio va verso +x (facing = atan2(1, 0)): la camera deve stare a -x, yaw = -π/2... + π
    const facing = Math.PI / 2;
    const a = createCameraAngles(0);
    for (let t = 0; t < 6; t += 0.016) updateCameraAngles(a, 0, 0, true, facing, 0.016);
    const target = facing + Math.PI;
    const diff = Math.atan2(Math.sin(a.yaw - target), Math.cos(a.yaw - target));
    expect(Math.abs(diff)).toBeLessThan(0.01);
  });

  it("un comando di camera azzera l'attesa", () => {
    const a = createCameraAngles(0);
    for (let t = 0; t < 1.4; t += 0.016) updateCameraAngles(a, 0, 0, true, 2, 0.016);
    updateCameraAngles(a, 0.01, 0, true, 2, 0.016);
    const yaw = a.yaw;
    for (let t = 0; t < 1.2; t += 0.016) updateCameraAngles(a, 0, 0, true, 2, 0.016);
    expect(a.yaw).toBe(yaw);
  });
});

describe('distanza della camera', () => {
  const focus = { x: 0, y: 1.4, z: 0 };

  it('6 m a campo libero', () => {
    expect(desiredDistance(focus, 0, 0, [])).toBe(CAMERA_DISTANCE);
    const lontano = box(1, 'fisso', { x: -5, y: 0, z: 20 }, { x: 5, y: 3, z: 21 });
    expect(desiredDistance(focus, 0, 0, [lontano])).toBe(CAMERA_DISTANCE);
  });

  it('si accorcia con un muro fisso in mezzo, con un margine', () => {
    // con yaw 0 la camera sta a +z; il muro è a z = 3
    const muro = box(1, 'fisso', { x: -5, y: 0, z: 3 }, { x: 5, y: 3, z: 4 });
    const d = desiredDistance(focus, 0, 0, [muro]);
    expect(d).toBeLessThan(3);
    expect(d).toBeGreaterThan(2);
  });

  it('ignora scatole non fisse', () => {
    const masso = box(1, 'spingibile', { x: -5, y: 0, z: 3 }, { x: 5, y: 3, z: 4 });
    expect(desiredDistance(focus, 0, 0, [masso])).toBe(CAMERA_DISTANCE);
  });

  it('si accorcia subito e si allunga piano', () => {
    expect(smoothDistance(6, 2, 0.016)).toBe(2);
    const next = smoothDistance(2, 6, 0.016);
    expect(next).toBeGreaterThan(2);
    expect(next).toBeLessThan(2.5);
  });
});
