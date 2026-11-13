import { describe, expect, it } from 'vitest';
import {
  CAMERA_DISTANCE,
  MAX_PITCH,
  MIN_PITCH,
  REALIGN_DELAY,
  createCameraAngles,
  desiredDistance,
  desiredPose,
  smoothDistance,
  updateCameraAngles,
} from '../src/camera/follow-camera';
import { box } from '../src/world/solids';

describe('angoli della camera', () => {
  it('trascinare a destra gira la visuale a destra (yaw cala), in alto alza lo sguardo', () => {
    const a = createCameraAngles();
    updateCameraAngles(a, 0.2, 0, 0, 0, 0, 0.016);
    expect(a.yaw).toBeCloseTo(-0.2);
    const p0 = a.pitch;
    updateCameraAngles(a, 0, -0.1, 0, 0, 0, 0.016);
    expect(a.pitch).toBeLessThan(p0);
  });

  it("limita l'inclinazione tra -10 e 60 gradi", () => {
    const a = createCameraAngles();
    updateCameraAngles(a, 0, 10, 0, 0, 0, 0.016);
    expect(a.pitch).toBe(MAX_PITCH);
    updateCameraAngles(a, 0, -10, 0, 0, 0, 0.016);
    expect(a.pitch).toBe(MIN_PITCH);
    expect((MAX_PITCH * 180) / Math.PI).toBeCloseTo(60);
    expect((MIN_PITCH * 180) / Math.PI).toBeCloseTo(-10);
  });

  it('non si riallinea prima di 1,5 s né da fermo', () => {
    const a = createCameraAngles(1);
    for (let t = 0; t < REALIGN_DELAY - 0.1; t += 0.016)
      updateCameraAngles(a, 0, 0, 0, 1, 0, 0.016);
    expect(a.yaw).toBe(1);
    const b = createCameraAngles(1);
    for (let t = 0; t < 5; t += 0.016) updateCameraAngles(b, 0, 0, 0, 0, 0, 0.016);
    expect(b.yaw).toBe(1);
  });

  it('dopo 1,5 s in movimento si riallinea dietro al personaggio', () => {
    // il personaggio va un po' di lato rispetto alla camera (meno di 90 gradi)
    const facing = Math.PI - 0.8;
    const a = createCameraAngles(0);
    for (let t = 0; t < 6; t += 0.016) updateCameraAngles(a, 0, 0, 0, 1, facing, 0.016);
    const target = facing + Math.PI;
    const diff = Math.atan2(Math.sin(a.yaw - target), Math.cos(a.yaw - target));
    expect(Math.abs(diff)).toBeLessThan(0.01);
  });

  it("un comando di camera azzera l'attesa", () => {
    const a = createCameraAngles(0);
    for (let t = 0; t < 1.4; t += 0.016) updateCameraAngles(a, 0, 0, 0, 1, 2, 0.016);
    updateCameraAngles(a, 0.01, 0, 0, 1, 2, 0.016);
    const yaw = a.yaw;
    for (let t = 0; t < 1.2; t += 0.016) updateCameraAngles(a, 0, 0, 0, 1, 2, 0.016);
    expect(a.yaw).toBe(yaw);
  });
});

describe('riallineamento senza giostra', () => {
  const T = 0.016;
  const run = (moveX: number, moveY: number, facing: (yaw: number) => number, secs = 4) => {
    const a = createCameraAngles(0.3);
    const yaws: number[] = [];
    for (let t = 0; t < secs; t += T) {
      updateCameraAngles(a, 0, 0, moveX, moveY, facing(a.yaw), T);
      yaws.push(a.yaw);
    }
    return { a, yaws };
  };

  it('leva tutta a destra: la camera non gira mai (anche se la direzione segue la camera)', () => {
    // andando a destra rispetto alla camera, facing = yaw + π - π/2... cioè sempre di lato
    const { a } = run(1, 0, (yaw) => yaw + Math.PI + Math.PI / 2);
    expect(a.yaw).toBe(0.3);
  });

  it('leva indietro: yaw invariato, nessuna oscillazione tra frame', () => {
    const { a, yaws } = run(0, -1, (yaw) => yaw);
    expect(a.yaw).toBe(0.3);
    expect(new Set(yaws).size).toBe(1);
  });

  it('leva avanti-destra: converge e si ferma', () => {
    const facing = 0.3 + Math.PI - 0.6;
    const { a, yaws } = run(0.45, 0.89, () => facing, 8);
    const target = facing + Math.PI;
    expect(Math.abs(Math.atan2(Math.sin(a.yaw - target), Math.cos(a.yaw - target)))).toBeLessThan(
      0.01,
    );
    expect(Math.abs(yaws[yaws.length - 1]! - yaws[yaws.length - 2]!)).toBeLessThan(1e-4);
  });

  it('non supera 0,8 rad/s', () => {
    const facing = 0.3 + Math.PI - 1.4;
    const a = createCameraAngles(0.3);
    for (let i = 0; i < 200; i++) updateCameraAngles(a, 0, 0, 0, 1, facing, T);
    const before = a.yaw;
    updateCameraAngles(a, 0, 0, 0, 1, facing, T);
    expect(Math.abs(a.yaw - before) / T).toBeLessThanOrEqual(0.8 + 1e-9);
  });

  it('oltre 90 gradi di differenza non riallinea', () => {
    const facing = 0.3 + Math.PI - 2;
    const { a } = run(0, 1, () => facing);
    expect(a.yaw).toBe(0.3);
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

  it('sotto 1,2 m alza la camera invece di avvicinarla', () => {
    // muro a 1 m dalla camera voluta: la distanza resta almeno 1,2 e l'inclinazione sale
    const muro = box(1, 'fisso', { x: -5, y: 0, z: 0.8 }, { x: 5, y: 5, z: 1.2 });
    const pose = desiredPose(focus, 0, 0.3, [muro]);
    expect(pose.distance).toBeGreaterThanOrEqual(1.2);
    expect(pose.pitch).toBeGreaterThan(0.3);
    expect(desiredPose(focus, 0, 0.3, []).pitch).toBe(0.3);
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
